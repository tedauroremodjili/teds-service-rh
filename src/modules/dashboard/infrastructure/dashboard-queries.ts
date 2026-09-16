import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Requetes de lecture du tableau de bord (module 15).
 *
 * Choix d'architecture assume : les ecrans de consultation n'ont pas besoin de
 * reconstruire les agregats du domaine. Charger cinquante entites Employee pour
 * n'afficher qu'un total serait couteux et inutile. On lit donc directement,
 * en projetant vers des structures faites pour l'affichage.
 *
 * La regle reste stricte dans l'autre sens : toute ECRITURE passe par le
 * domaine et ses invariants. Lecture directe, ecriture encadree.
 */

export interface DashboardStats {
  effectifActif: number;
  effectifTotal: number;
  masseSalarialeMensuelle: number;
  apprenantsActifs: number;
  formationsEnCours: number;
  recettesDuMois: number;
  depensesDuMois: number;
  ventesDuMois: number;
  commissionsEnAttente: number;
  soldeCaisse: number;
  contratsExpirantBientot: number;
  congesEnAttente: number;
}

export interface RepartitionDepartement {
  departement: string;
  effectif: number;
}

export interface DerniereEmbauche {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  poste: string | null;
  departement: string | null;
  hireDate: Date;
}

function debutDuMois(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function dansTrenteJours(reference = new Date()): Date {
  return new Date(reference.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const debutMois = debutDuMois();
  const maintenant = new Date();

  // Toutes ces requetes sont independantes : on les lance de front plutot que
  // l'une apres l'autre. Le tableau de bord se charge en une seule attente.
  const [
    effectifActif,
    effectifTotal,
    masseSalariale,
    apprenantsActifs,
    formationsEnCours,
    recettes,
    depenses,
    ventesDuMois,
    commissionsEnAttente,
    entreesCaisse,
    sortiesCaisse,
    contratsExpirantBientot,
    congesEnAttente,
  ] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIF", deletedAt: null } }),
    prisma.employee.count({ where: { deletedAt: null } }),
    prisma.employee.aggregate({
      where: { status: "ACTIF", deletedAt: null },
      _sum: { baseSalary: true },
    }),
    prisma.studentRegistration.count({
      where: { status: { in: ["INSCRIT", "REINSCRIT", "EN_COURS"] } },
    }),
    prisma.training.count({ where: { status: { in: ["OUVERTE", "EN_COURS"] } } }),
    prisma.payment.aggregate({
      where: {
        status: "CONFIRME",
        paidAt: { gte: debutMois },
        // Le paiement d'un salaire est une sortie : il n'entre pas en recettes.
        payrollId: null,
      },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { occurredAt: { gte: debutMois } },
      _sum: { amount: true },
    }),
    prisma.documentSale.count({
      where: { soldAt: { gte: debutMois }, status: { not: "ANNULEE" } },
    }),
    prisma.commission.aggregate({
      where: { status: { in: ["EN_ATTENTE", "VALIDEE"] } },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { direction: "ENTREE" },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { direction: "SORTIE" },
      _sum: { amount: true },
    }),
    prisma.contract.count({
      where: {
        status: "ACTIF",
        endDate: { gte: maintenant, lte: dansTrenteJours() },
      },
    }),
    prisma.leave.count({ where: { status: "EN_ATTENTE" } }),
  ]);

  const toNumber = (value: unknown): number => (value ? Number(value) : 0);

  return {
    effectifActif,
    effectifTotal,
    masseSalarialeMensuelle: toNumber(masseSalariale._sum.baseSalary),
    apprenantsActifs,
    formationsEnCours,
    recettesDuMois: toNumber(recettes._sum.amount),
    depensesDuMois: toNumber(depenses._sum.amount),
    ventesDuMois,
    commissionsEnAttente: toNumber(commissionsEnAttente._sum.amount),
    soldeCaisse: toNumber(entreesCaisse._sum.amount) - toNumber(sortiesCaisse._sum.amount),
    contratsExpirantBientot,
    congesEnAttente,
  };
}

/** Effectif par departement, pour la repartition du tableau de bord. */
export async function getRepartitionParDepartement(): Promise<RepartitionDepartement[]> {
  const departements = await prisma.department.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      _count: { select: { employees: { where: { status: "ACTIF", deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  const sansDepartement = await prisma.employee.count({
    where: { status: "ACTIF", deletedAt: null, departmentId: null },
  });

  const lignes = departements.map((departement) => ({
    departement: departement.name,
    effectif: departement._count.employees,
  }));

  if (sansDepartement > 0) {
    lignes.push({ departement: "Non affecté", effectif: sansDepartement });
  }

  return lignes.filter((ligne) => ligne.effectif > 0).sort((a, b) => b.effectif - a.effectif);
}

/** Les dernieres arrivees dans l'entreprise. */
export async function getDernieresEmbauches(limit = 5): Promise<DerniereEmbauche[]> {
  const employes = await prisma.employee.findMany({
    where: { deletedAt: null },
    orderBy: { hireDate: "desc" },
    take: limit,
    select: {
      id: true,
      matricule: true,
      firstName: true,
      lastName: true,
      photoUrl: true,
      hireDate: true,
      position: { select: { title: true } },
      department: { select: { name: true } },
    },
  });

  return employes.map((employe) => ({
    id: employe.id,
    matricule: employe.matricule,
    firstName: employe.firstName,
    lastName: employe.lastName,
    photoUrl: employe.photoUrl,
    poste: employe.position?.title ?? null,
    departement: employe.department?.name ?? null,
    hireDate: employe.hireDate,
  }));
}
