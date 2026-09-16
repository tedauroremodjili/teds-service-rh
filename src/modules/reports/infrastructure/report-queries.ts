import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Lectures du module 14 — rapports.
 *
 * Un rapport est une PHOTOGRAPHIE d'une periode : toutes les mesures partagent
 * les memes bornes, sinon les chiffres ne se comparent pas entre eux. Les
 * bornes sont donc passees en parametre, jamais recalculees dans chaque requete.
 */

export interface RapportRh {
  effectifActif: number;
  embauchesDeLaPeriode: number;
  departsDeLaPeriode: number;
  masseSalariale: number;
  congesApprouves: number;
  tauxPresence: number | null;
}

export interface RapportCommercial {
  ventesDocuments: number;
  caDocuments: number;
  inscriptions: number;
  caFormations: number;
  prestations: number;
  caPrestations: number;
}

export interface RapportFinancier {
  recettes: number;
  depenses: number;
  resultat: number;
  encaissements: number;
  soldeCaisse: number;
}

export interface RapportFormation {
  sessionsEnCours: number;
  apprenantsActifs: number;
  certificatsDelivres: number;
  moyenneGenerale: number | null;
}

export interface LigneClassement {
  id: string;
  libelle: string;
  detail: string | null;
  valeur: number;
  quantite: number;
}

/** Indicateurs RH de la periode. */
export async function getRapportRh(debut: Date, fin: Date): Promise<RapportRh> {
  const periode = { gte: debut, lt: fin };

  const [effectifActif, embauches, departs, masse, conges, presences, pointages] =
    await Promise.all([
      prisma.employee.count({ where: { status: "ACTIF", deletedAt: null } }),
      prisma.employee.count({ where: { hireDate: periode, deletedAt: null } }),
      prisma.employee.count({
        where: {
          deletedAt: null,
          status: { in: ["DEMISSIONNE", "LICENCIE", "RETRAITE"] },
          updatedAt: periode,
        },
      }),
      prisma.employee.aggregate({
        where: { status: "ACTIF", deletedAt: null },
        _sum: { baseSalary: true },
      }),
      prisma.leave.aggregate({
        where: { status: "APPROUVE", startDate: periode },
        _sum: { daysCount: true },
      }),
      prisma.attendance.count({
        where: { date: periode, status: { in: ["PRESENT", "MISSION", "RETARD"] } },
      }),
      prisma.attendance.count({ where: { date: periode } }),
    ]);

  return {
    effectifActif,
    embauchesDeLaPeriode: embauches,
    departsDeLaPeriode: departs,
    masseSalariale: Number(masse._sum.baseSalary ?? 0),
    congesApprouves: conges._sum.daysCount ?? 0,
    // Sans pointage sur la periode, le taux n'existe pas : afficher 0 % serait
    // un mensonge, on renvoie null et la vue affiche un tiret.
    tauxPresence: pointages > 0 ? Math.round((presences / pointages) * 100) : null,
  };
}

/** Activite commerciale de la periode, par canal de vente. */
export async function getRapportCommercial(debut: Date, fin: Date): Promise<RapportCommercial> {
  const periode = { gte: debut, lt: fin };

  const [documents, inscriptions, prestations] = await Promise.all([
    prisma.documentSale.aggregate({
      where: { soldAt: periode, status: { not: "ANNULEE" } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.studentRegistration.aggregate({
      where: { registeredAt: periode, status: { not: "ANNULE" } },
      _sum: { agreedAmount: true },
      _count: { _all: true },
    }),
    prisma.serviceOrder.aggregate({
      where: { orderedAt: periode, status: { notIn: ["ANNULEE", "DEVIS"] } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return {
    ventesDocuments: documents._count._all,
    caDocuments: Number(documents._sum.totalAmount ?? 0),
    inscriptions: inscriptions._count._all,
    caFormations: Number(inscriptions._sum.agreedAmount ?? 0),
    prestations: prestations._count._all,
    caPrestations: Number(prestations._sum.amount ?? 0),
  };
}

/** Resultat financier de la periode. */
export async function getRapportFinancier(debut: Date, fin: Date): Promise<RapportFinancier> {
  const periode = { gte: debut, lt: fin };

  const [recettes, depenses, encaissements, entrees, sorties] = await Promise.all([
    prisma.revenue.aggregate({ where: { occurredAt: periode }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { occurredAt: periode }, _sum: { amount: true } }),
    prisma.payment.aggregate({
      where: { status: "CONFIRME", paidAt: periode, payrollId: null },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({ where: { direction: "ENTREE" }, _sum: { amount: true } }),
    prisma.cashTransaction.aggregate({ where: { direction: "SORTIE" }, _sum: { amount: true } }),
  ]);

  const montantRecettes = Number(recettes._sum.amount ?? 0);
  const montantDepenses = Number(depenses._sum.amount ?? 0);

  return {
    recettes: montantRecettes,
    depenses: montantDepenses,
    resultat: montantRecettes - montantDepenses,
    encaissements: Number(encaissements._sum.amount ?? 0),
    // Le solde de caisse est un CUMUL : il ne se borne pas a la periode.
    soldeCaisse: Number(entrees._sum.amount ?? 0) - Number(sorties._sum.amount ?? 0),
  };
}

/** Activite de formation sur la periode. */
export async function getRapportFormation(debut: Date, fin: Date): Promise<RapportFormation> {
  const periode = { gte: debut, lt: fin };

  const [sessionsEnCours, apprenantsActifs, certificats, notes] = await Promise.all([
    prisma.training.count({ where: { deletedAt: null, status: { in: ["OUVERTE", "EN_COURS"] } } }),
    prisma.studentRegistration.count({
      where: { status: { in: ["INSCRIT", "REINSCRIT", "EN_COURS"] } },
    }),
    prisma.certificate.count({ where: { issuedAt: periode } }),
    prisma.studentRegistration.aggregate({
      where: { finalGrade: { not: null } },
      _avg: { finalGrade: true },
    }),
  ]);

  return {
    sessionsEnCours,
    apprenantsActifs,
    certificatsDelivres: certificats,
    moyenneGenerale:
      notes._avg.finalGrade === null ? null : Number(notes._avg.finalGrade.toFixed(2)),
  };
}

/**
 * Meilleurs vendeurs de documents sur la periode.
 *
 * Deux requetes plutot qu'une jointure : `groupBy` ne ramene pas les champs de
 * la relation. On agrege d'abord, on nomme ensuite.
 *
 * Le vendeur est facultatif sur une vente (voir `DocumentSale.sellerId`) :
 * TED'S SERVICE vend au prix fixe du document, sans vendeur attitre. Ce
 * classement exclut donc les ventes sans vendeur — les compter donnerait un
 * unique « vendeur inconnu » cumulant tout le chiffre d'affaires, ce qui ne
 * repond pas a la question posee par ce rapport.
 */
export async function getTopVendeurs(debut: Date, fin: Date, limit = 5): Promise<LigneClassement[]> {
  const groupes = await prisma.documentSale.groupBy({
    by: ["sellerId"],
    where: {
      soldAt: { gte: debut, lt: fin },
      status: { not: "ANNULEE" },
      sellerId: { not: null },
    },
    _sum: { totalAmount: true },
    _count: { _all: true },
    orderBy: { _sum: { totalAmount: "desc" } },
    take: limit,
  });

  // `where: { sellerId: { not: null } }` garantit deja l'absence de null en
  // base ; ce filtre ne fait que le refleter cote type, sans assertion.
  const parVendeur = groupes.filter(
    (ligne): ligne is typeof ligne & { sellerId: string } => ligne.sellerId !== null,
  );

  if (parVendeur.length === 0) return [];

  const vendeurs = await prisma.employee.findMany({
    where: { id: { in: parVendeur.map((ligne) => ligne.sellerId) } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      matricule: true,
      position: { select: { title: true } },
    },
  });

  const parId = new Map(vendeurs.map((vendeur) => [vendeur.id, vendeur]));

  return parVendeur.map((ligne) => {
    const vendeur = parId.get(ligne.sellerId);

    return {
      id: ligne.sellerId,
      libelle: vendeur ? `${vendeur.lastName} ${vendeur.firstName}` : "Vendeur inconnu",
      detail: vendeur?.position?.title ?? vendeur?.matricule ?? null,
      valeur: Number(ligne._sum.totalAmount ?? 0),
      quantite: ligne._count._all,
    };
  });
}

/** Formations les plus demandees sur la periode. */
export async function getTopFormations(
  debut: Date,
  fin: Date,
  limit = 5,
): Promise<LigneClassement[]> {
  const parFormation = await prisma.studentRegistration.groupBy({
    by: ["trainingId"],
    where: { registeredAt: { gte: debut, lt: fin }, status: { not: "ANNULE" } },
    _sum: { agreedAmount: true },
    _count: { _all: true },
    orderBy: { _count: { trainingId: "desc" } },
    take: limit,
  });

  if (parFormation.length === 0) return [];

  const formations = await prisma.training.findMany({
    where: { id: { in: parFormation.map((ligne) => ligne.trainingId) } },
    select: { id: true, title: true, code: true },
  });

  const parId = new Map(formations.map((formation) => [formation.id, formation]));

  return parFormation.map((ligne) => {
    const formation = parId.get(ligne.trainingId);

    return {
      id: ligne.trainingId,
      libelle: formation?.title ?? "Formation supprimée",
      detail: formation?.code ?? null,
      valeur: Number(ligne._sum.agreedAmount ?? 0),
      quantite: ligne._count._all,
    };
  });
}
