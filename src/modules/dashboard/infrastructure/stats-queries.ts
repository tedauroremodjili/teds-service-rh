import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Requetes statistiques du tableau de bord et des rapports (modules 14 et 15).
 *
 * Ces lectures ne reconstruisent pas les agregats du domaine : afficher un
 * total de recettes n'exige pas de charger cent entites Payment avec leurs
 * invariants. On projette directement vers les structures que les graphiques
 * attendent. L'ecriture, elle, reste encadree par le domaine.
 *
 * Le decoupage par mois est fait en memoire plutot qu'en SQL : le volume d'un
 * centre de formation tient largement en RAM sur douze mois, et cela evite une
 * requete brute par moteur de base de donnees.
 */

export interface PointMensuel {
  /** Cle de tri, format « 2026-08 ». */
  cle: string;
  /** Libelle court pour l'axe (« août »). */
  court: string;
  /** Libelle complet pour l'infobulle (« août 2026 »). */
  long: string;
  recettes: number;
  depenses: number;
  ventes: number;
}

export interface Repartition {
  label: string;
  value: number;
}

const MOIS_COURTS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

const MOIS_LONGS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Squelette des N derniers mois, mois courant inclus, du plus ancien au plus recent. */
function derniersMois(nombre: number): PointMensuel[] {
  const aujourdhui = new Date();
  const points: PointMensuel[] = [];

  for (let recul = nombre - 1; recul >= 0; recul--) {
    const date = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - recul, 1);
    const index = date.getMonth();

    points.push({
      cle: `${date.getFullYear()}-${String(index + 1).padStart(2, "0")}`,
      court: MOIS_COURTS[index],
      long: `${MOIS_LONGS[index]} ${date.getFullYear()}`,
      recettes: 0,
      depenses: 0,
      ventes: 0,
    });
  }

  return points;
}

function cleDuMois(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Serie mensuelle des recettes, des depenses et du nombre de ventes.
 * C'est la source de la courbe d'evolution et des sparklines.
 */
export async function getSerieMensuelle(nombreDeMois = 12): Promise<PointMensuel[]> {
  const points = derniersMois(nombreDeMois);
  const debut = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - (nombreDeMois - 1),
    1,
  );
  const parCle = new Map(points.map((point) => [point.cle, point]));

  const [encaissements, depenses, ventes] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "CONFIRME", paidAt: { gte: debut }, payrollId: null },
      select: { amount: true, paidAt: true },
    }),
    prisma.expense.findMany({
      where: { occurredAt: { gte: debut } },
      select: { amount: true, occurredAt: true },
    }),
    prisma.documentSale.findMany({
      where: { soldAt: { gte: debut }, status: { not: "ANNULEE" } },
      select: { soldAt: true },
    }),
  ]);

  for (const ligne of encaissements) {
    const point = parCle.get(cleDuMois(ligne.paidAt));
    if (point) point.recettes += Number(ligne.amount);
  }
  for (const ligne of depenses) {
    const point = parCle.get(cleDuMois(ligne.occurredAt));
    if (point) point.depenses += Number(ligne.amount);
  }
  for (const ligne of ventes) {
    const point = parCle.get(cleDuMois(ligne.soldAt));
    if (point) point.ventes += 1;
  }

  return points;
}

/**
 * Origine des recettes sur une periode : formations, documents, prestations.
 * C'est la repartition affichee en camembert.
 */
export async function getRepartitionRecettes(debut: Date, fin: Date): Promise<Repartition[]> {
  const paiements = await prisma.payment.findMany({
    where: { status: "CONFIRME", paidAt: { gte: debut, lt: fin }, payrollId: null },
    select: {
      amount: true,
      registrationId: true,
      documentSaleId: true,
      serviceOrderId: true,
    },
  });

  const totaux = { formations: 0, documents: 0, prestations: 0, autres: 0 };

  for (const paiement of paiements) {
    const montant = Number(paiement.amount);
    if (paiement.registrationId) totaux.formations += montant;
    else if (paiement.documentSaleId) totaux.documents += montant;
    else if (paiement.serviceOrderId) totaux.prestations += montant;
    else totaux.autres += montant;
  }

  return [
    { label: "Formations", value: totaux.formations },
    { label: "Documents administratifs", value: totaux.documents },
    { label: "Prestations", value: totaux.prestations },
    { label: "Autres encaissements", value: totaux.autres },
  ].filter((ligne) => ligne.value > 0);
}

/** Depenses par categorie sur une periode. */
export async function getRepartitionDepenses(debut: Date, fin: Date): Promise<Repartition[]> {
  const lignes = await prisma.expense.groupBy({
    by: ["category"],
    where: { occurredAt: { gte: debut, lt: fin } },
    _sum: { amount: true },
  });

  const LIBELLES: Record<string, string> = {
    SALAIRE: "Salaires",
    LOYER: "Loyer",
    FOURNITURE: "Fournitures",
    TRANSPORT: "Transport",
    ELECTRICITE: "Électricité",
    EAU: "Eau",
    INTERNET: "Internet",
    MAINTENANCE: "Maintenance",
    MARKETING: "Marketing",
    IMPOT: "Impôts",
    AUTRE: "Autres",
  };

  return lignes
    .map((ligne) => ({
      label: LIBELLES[ligne.category] ?? ligne.category,
      value: Number(ligne._sum.amount ?? 0),
    }))
    .filter((ligne) => ligne.value > 0);
}

/** Effectif actif par statut — sante sociale en un coup d'oeil. */
export async function getRepartitionParStatut(): Promise<Repartition[]> {
  const lignes = await prisma.employee.groupBy({
    by: ["status"],
    where: { deletedAt: null },
    _count: { _all: true },
  });

  const LIBELLES: Record<string, string> = {
    ACTIF: "Actifs",
    CONGE: "En congé",
    SUSPENDU: "Suspendus",
    DEMISSIONNE: "Démissionnés",
    LICENCIE: "Licenciés",
    RETRAITE: "Retraités",
  };

  return lignes
    .map((ligne) => ({
      label: LIBELLES[ligne.status] ?? ligne.status,
      value: ligne._count._all,
    }))
    .filter((ligne) => ligne.value > 0);
}

/** Masse salariale par departement — ou part l'argent des salaires. */
export async function getMasseSalarialeParDepartement(): Promise<Repartition[]> {
  const departements = await prisma.department.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      employees: {
        where: { status: "ACTIF", deletedAt: null },
        select: { baseSalary: true },
      },
    },
  });

  const lignes = departements.map((departement) => ({
    label: departement.name,
    value: departement.employees.reduce((somme, employe) => somme + Number(employe.baseSalary), 0),
  }));

  const sansDepartement = await prisma.employee.findMany({
    where: { status: "ACTIF", deletedAt: null, departmentId: null },
    select: { baseSalary: true },
  });

  if (sansDepartement.length > 0) {
    lignes.push({
      label: "Non affecté",
      value: sansDepartement.reduce((somme, employe) => somme + Number(employe.baseSalary), 0),
    });
  }

  return lignes.filter((ligne) => ligne.value > 0);
}

export interface LigneAgent {
  label: string;
  detail?: string;
  value: number;
}

/** Classement des agents par commissions generees sur une periode. */
export async function getTopCommissions(
  debut: Date,
  fin: Date,
  limite = 5,
): Promise<LigneAgent[]> {
  const lignes = await prisma.commission.groupBy({
    by: ["employeeId"],
    where: { createdAt: { gte: debut, lt: fin }, status: { not: "ANNULEE" } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limite,
  });

  if (lignes.length === 0) return [];

  const employes = await prisma.employee.findMany({
    where: { id: { in: lignes.map((ligne) => ligne.employeeId) } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: { select: { title: true } },
    },
  });

  const parId = new Map(employes.map((employe) => [employe.id, employe]));

  return lignes.map((ligne) => {
    const employe = parId.get(ligne.employeeId);
    return {
      label: employe ? `${employe.firstName} ${employe.lastName}` : "Agent supprimé",
      detail: employe?.position?.title ?? undefined,
      value: Number(ligne._sum.amount ?? 0),
    };
  });
}

/** Formations les plus suivies, par nombre d'inscriptions. */
export async function getTopFormations(limite = 5): Promise<LigneAgent[]> {
  const formations = await prisma.training.findMany({
    where: { deletedAt: null },
    select: {
      title: true,
      level: true,
      _count: { select: { registrations: true } },
    },
    orderBy: { registrations: { _count: "desc" } },
    take: limite,
  });

  const NIVEAUX: Record<string, string> = {
    DEBUTANT: "Débutant",
    INTERMEDIAIRE: "Intermédiaire",
    AVANCE: "Avancé",
    EXPERT: "Expert",
  };

  return formations
    .map((formation) => ({
      label: formation.title,
      detail: NIVEAUX[formation.level] ?? formation.level,
      value: formation._count.registrations,
    }))
    .filter((ligne) => ligne.value > 0);
}
