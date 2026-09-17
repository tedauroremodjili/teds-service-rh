import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

import type { OperationRemuneree } from "../domain/calculator";
import type { Activite, RegleRemuneration, RegleValidee } from "../domain/rule";

/**
 * Acces aux baremes et aux operations remunerables.
 *
 * Les operations partent des PAIEMENTS confirmes : « 85 % de chaque somme
 * versee » se lit au fil des encaissements, pas au moment de la vente. Un
 * enfant qui regle en trois fois ouvre droit a trois lignes.
 */

/* -------------------------------------------------------------------------- */
/* Baremes                                                                     */
/* -------------------------------------------------------------------------- */

function versRegle(ligne: {
  id: string;
  employeeId: string;
  label: string;
  activity: string;
  mode: string;
  portee: string;
  rate: unknown;
  fixedAmount: unknown;
  fixedBasis: string;
  trainingId: string | null;
  trainingCategoryId: string | null;
  documentProductId: string | null;
  documentCategory: string | null;
  serviceId: string | null;
  serviceCategory: string | null;
  priority: number;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
}): RegleRemuneration {
  return {
    id: ligne.id,
    employeeId: ligne.employeeId,
    label: ligne.label,
    activity: ligne.activity as RegleRemuneration["activity"],
    mode: ligne.mode as RegleRemuneration["mode"],
    portee: ligne.portee as RegleRemuneration["portee"],
    // Les Decimal de Prisma sont ramenes a des nombres AVANT la frontiere
    // serveur/client, qui n'accepte que des valeurs serialisables.
    rate: ligne.rate === null ? null : Number(ligne.rate),
    fixedAmount: ligne.fixedAmount === null ? null : Number(ligne.fixedAmount),
    fixedBasis: ligne.fixedBasis as RegleRemuneration["fixedBasis"],
    trainingId: ligne.trainingId,
    trainingCategoryId: ligne.trainingCategoryId,
    documentProductId: ligne.documentProductId,
    documentCategory: ligne.documentCategory,
    serviceId: ligne.serviceId,
    serviceCategory: ligne.serviceCategory,
    priority: ligne.priority,
    isActive: ligne.isActive,
    startDate: ligne.startDate,
    endDate: ligne.endDate,
  };
}

export async function listerRegles(employeeId: string): Promise<RegleRemuneration[]> {
  const lignes = await prisma.remunerationRule.findMany({
    where: { employeeId },
    orderBy: [{ activity: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  return lignes.map(versRegle);
}

/** Toutes les regles actives, tous employes — base du calcul de paie mensuelle. */
export async function listerReglesActives(): Promise<RegleRemuneration[]> {
  const lignes = await prisma.remunerationRule.findMany({ where: { isActive: true } });
  return lignes.map(versRegle);
}

/**
 * Regles actives de plusieurs employes a la fois, groupees par employe.
 *
 * Sert a la liste des employes : plutot qu'une requete par ligne (N+1), une
 * seule requete ramene le bareme de toute la page affichee, pour que la
 * colonne « Commission » montre immediatement ce qui est reellement configure
 * — activite par activite — des qu'une regle est posee.
 */
export async function listerReglesActivesParEmploye(
  employeeIds: string[],
): Promise<Map<string, RegleRemuneration[]>> {
  const parEmploye = new Map<string, RegleRemuneration[]>();
  if (employeeIds.length === 0) return parEmploye;

  const lignes = await prisma.remunerationRule.findMany({
    where: { employeeId: { in: employeeIds }, isActive: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  for (const regle of lignes.map(versRegle)) {
    const liste = parEmploye.get(regle.employeeId) ?? [];
    liste.push(regle);
    parEmploye.set(regle.employeeId, liste);
  }

  return parEmploye;
}

/** Cibles proposees dans le formulaire de bareme. */
export async function listerCibles() {
  const [formations, categoriesFormation, documents, prestations] = await Promise.all([
    prisma.training.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true, categoryId: true },
      orderBy: { title: "asc" },
    }),
    prisma.trainingCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentProduct.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.service.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { formations, categoriesFormation, documents, prestations };
}

/* -------------------------------------------------------------------------- */
/* Operations remunerables                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Objet d'un paiement.
 *
 * Les encaissements anterieurs a l'introduction du champ `purpose` valent
 * AUTRE : on retombe alors sur le lien pour deviner l'activite, ce qui evite
 * de perdre l'historique. Un paiement rattache a une inscription est traite
 * comme des frais de FORMATION — c'est le cas de loin le plus frequent.
 */
function activiteDuPaiement(paiement: {
  purpose: string;
  registrationId: string | null;
  documentSaleId: string | null;
  serviceOrderId: string | null;
}): Activite | null {
  switch (paiement.purpose) {
    case "FRAIS_INSCRIPTION":
      return "FRAIS_INSCRIPTION";
    case "FRAIS_FORMATION":
      return "FRAIS_FORMATION";
    case "VENTE_DOCUMENT":
      return "VENTE_DOCUMENT";
    case "PRESTATION":
      return "PRESTATION";
    case "SALAIRE":
      return null;
    default:
      break;
  }

  if (paiement.registrationId) return "FRAIS_FORMATION";
  if (paiement.documentSaleId) return "VENTE_DOCUMENT";
  if (paiement.serviceOrderId) return "PRESTATION";
  return null;
}

export async function listerOperations(
  debut: Date,
  fin: Date,
): Promise<OperationRemuneree[]> {
  const paiements = await prisma.payment.findMany({
    where: {
      status: "CONFIRME",
      paidAt: { gte: debut, lt: fin },
      // Le versement d'un salaire n'ouvre evidemment pas droit a remuneration.
      payrollId: null,
    },
    select: {
      id: true,
      reference: true,
      amount: true,
      paidAt: true,
      purpose: true,
      registrationId: true,
      documentSaleId: true,
      serviceOrderId: true,
      registration: {
        select: {
          sellerId: true,
          student: { select: { firstName: true, lastName: true } },
          training: { select: { id: true, title: true, categoryId: true } },
        },
      },
      documentSale: {
        select: {
          sellerId: true,
          lines: {
            select: {
              quantity: true,
              lineTotal: true,
              unitCost: true,
              product: { select: { id: true, name: true, category: true } },
            },
          },
        },
      },
      serviceOrder: {
        select: {
          sellerId: true,
          customerName: true,
          service: { select: { id: true, name: true, category: true } },
        },
      },
    },
    orderBy: { paidAt: "asc" },
  });

  const operations: OperationRemuneree[] = [];

  for (const paiement of paiements) {
    const activity = activiteDuPaiement(paiement);
    if (!activity) continue;

    const montant = Number(paiement.amount);

    if (paiement.registration) {
      const apprenant = paiement.registration.student;
      operations.push({
        id: paiement.id,
        reference: paiement.reference,
        date: paiement.paidAt,
        activity,
        amount: montant,
        libelle: `${apprenant.firstName} ${apprenant.lastName} — ${paiement.registration.training.title}`,
        sellerId: paiement.registration.sellerId,
        trainingId: paiement.registration.training.id,
        trainingCategoryId: paiement.registration.training.categoryId,
      });
      continue;
    }

    if (paiement.documentSale) {
      operations.push({
        id: paiement.id,
        reference: paiement.reference,
        date: paiement.paidAt,
        activity,
        amount: montant,
        libelle:
          paiement.documentSale.lines.length === 1
            ? paiement.documentSale.lines[0].product.name
            : `Vente de ${paiement.documentSale.lines.length} documents`,
        sellerId: paiement.documentSale.sellerId,
        articles: paiement.documentSale.lines.map((ligne) => ({
          productId: ligne.product.id,
          category: ligne.product.category,
          quantity: ligne.quantity,
          amount: Number(ligne.lineTotal),
          costAmount: ligne.unitCost === null ? null : Number(ligne.unitCost) * ligne.quantity,
        })),
      });
      continue;
    }

    if (paiement.serviceOrder) {
      operations.push({
        id: paiement.id,
        reference: paiement.reference,
        date: paiement.paidAt,
        activity,
        amount: montant,
        libelle: `${paiement.serviceOrder.service.name} — ${paiement.serviceOrder.customerName}`,
        sellerId: paiement.serviceOrder.sellerId,
        serviceId: paiement.serviceOrder.service.id,
        serviceCategory: paiement.serviceOrder.service.category,
      });
    }
  }

  return operations;
}

/* -------------------------------------------------------------------------- */
/* Ecriture                                                                    */
/* -------------------------------------------------------------------------- */

export async function creerRegle(regle: Omit<RegleRemuneration, "id">): Promise<string> {
  const cree = await prisma.remunerationRule.create({
    data: {
      employeeId: regle.employeeId,
      label: regle.label,
      activity: regle.activity,
      mode: regle.mode,
      portee: regle.portee,
      rate: regle.rate,
      fixedAmount: regle.fixedAmount,
      fixedBasis: regle.fixedBasis,
      trainingId: regle.trainingId,
      trainingCategoryId: regle.trainingCategoryId,
      documentProductId: regle.documentProductId,
      documentCategory: regle.documentCategory as never,
      serviceId: regle.serviceId,
      serviceCategory: regle.serviceCategory as never,
      priority: regle.priority,
      isActive: regle.isActive,
      startDate: regle.startDate,
      endDate: regle.endDate,
    },
    select: { id: true },
  });

  return cree.id;
}

/**
 * Ecrit d'un bloc le bareme saisi a la creation d'un employe.
 *
 * `createMany` en une seule requete, donc atomique : on ne veut pas d'une
 * fiche dont trois regles sur cinq seraient passees — le gestionnaire croirait
 * le bareme complet et la paie serait fausse sans que rien ne le signale.
 */
export async function creerRegles(
  employeeId: string,
  regles: RegleValidee[],
): Promise<number> {
  if (regles.length === 0) return 0;

  const { count } = await prisma.remunerationRule.createMany({
    data: regles.map((regle) => ({
      employeeId,
      label: regle.label,
      activity: regle.activity,
      mode: regle.mode,
      portee: regle.portee,
      rate: regle.rate,
      fixedAmount: regle.fixedAmount,
      fixedBasis: regle.fixedBasis,
      trainingId: regle.trainingId,
      trainingCategoryId: regle.trainingCategoryId,
      documentProductId: regle.documentProductId,
      documentCategory: regle.documentCategory as never,
      serviceId: regle.serviceId,
      serviceCategory: regle.serviceCategory as never,
      priority: regle.priority,
      isActive: regle.isActive,
      startDate: regle.startDate,
      endDate: regle.endDate,
    })),
  });

  return count;
}

export async function supprimerRegle(id: string): Promise<void> {
  await prisma.remunerationRule.delete({ where: { id } });
}

export async function basculerRegle(id: string, actif: boolean): Promise<void> {
  await prisma.remunerationRule.update({ where: { id }, data: { isActive: actif } });
}
