import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import {
  calculerRemuneration,
  salaireTotal,
  type DecompteRemuneration,
} from "../domain/calculator";
import {
  validerRegle,
  type RegleInput,
  type RegleRemuneration,
  type RegleValidee,
} from "../domain/rule";
import {
  creerRegle,
  creerRegles,
  listerOperations,
  listerRegles,
} from "../infrastructure/prisma-remuneration-repository";

/**
 * Cas d'usage des baremes de remuneration.
 *
 * Le decompte est RECALCULE a chaque consultation plutot que stocke. Un
 * bareme corrige doit se refleter immediatement, et rien ne justifie de figer
 * un total tant que la paie du mois n'est pas validee — c'est a ce moment-la,
 * et a ce moment-la seulement, que le montant devient une ecriture.
 */

export interface DecompteEmploye extends DecompteRemuneration {
  employe: {
    id: string;
    matricule: string;
    nom: string;
    poste: string | null;
    salaireDeBase: number;
  };
  regles: RegleRemuneration[];
  /** Salaire de base + remuneration d'activite. */
  salaireTotal: number;
}

export async function getDecompteEmploye(
  employeeId: string,
  debut: Date,
  fin: Date,
): Promise<Result<DecompteEmploye>> {
  const employe = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: {
      id: true,
      matricule: true,
      firstName: true,
      lastName: true,
      baseSalary: true,
      position: { select: { title: true } },
    },
  });

  if (!employe) {
    return fail(DomainError.notFound("Cet employé n'existe pas ou a été archivé."));
  }

  const [regles, operations] = await Promise.all([
    listerRegles(employeeId),
    listerOperations(debut, fin),
  ]);

  const decompte = calculerRemuneration(
    regles.filter((regle) => regle.isActive),
    operations,
  );

  const salaireDeBase = Number(employe.baseSalary);

  return ok({
    ...decompte,
    employe: {
      id: employe.id,
      matricule: employe.matricule,
      nom: `${employe.firstName} ${employe.lastName}`,
      poste: employe.position?.title ?? null,
      salaireDeBase,
    },
    regles,
    salaireTotal: salaireTotal(salaireDeBase, decompte.total),
  });
}

/**
 * Decompte de TOUS les employes concernes sur une periode.
 * C'est la vue dont a besoin la personne qui prepare la paie du mois.
 */
export interface LigneRecapitulative {
  employeeId: string;
  matricule: string;
  nom: string;
  poste: string | null;
  salaireDeBase: number;
  remuneration: number;
  operations: number;
  salaireTotal: number;
}

export async function getRecapitulatifMensuel(
  debut: Date,
  fin: Date,
): Promise<LigneRecapitulative[]> {
  const [employes, operations, regles] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null, status: { in: ["ACTIF", "CONGE"] } },
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        baseSalary: true,
        position: { select: { title: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    listerOperations(debut, fin),
    prisma.remunerationRule.findMany({ where: { isActive: true } }),
  ]);

  // Les operations sont lues UNE fois, puis rejouees pour chaque employe : la
  // requete est la partie couteuse, le calcul ne l'est pas.
  const parEmploye = new Map<string, RegleRemuneration[]>();
  for (const ligne of regles) {
    const liste = parEmploye.get(ligne.employeeId) ?? [];
    liste.push({
      id: ligne.id,
      employeeId: ligne.employeeId,
      label: ligne.label,
      activity: ligne.activity as RegleRemuneration["activity"],
      mode: ligne.mode as RegleRemuneration["mode"],
      portee: ligne.portee as RegleRemuneration["portee"],
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
    });
    parEmploye.set(ligne.employeeId, liste);
  }

  return employes.map((employe) => {
    const decompte = calculerRemuneration(parEmploye.get(employe.id) ?? [], operations);
    const salaireDeBase = Number(employe.baseSalary);

    return {
      employeeId: employe.id,
      matricule: employe.matricule,
      nom: `${employe.firstName} ${employe.lastName}`,
      poste: employe.position?.title ?? null,
      salaireDeBase,
      remuneration: decompte.total,
      operations: decompte.lignes.length,
      salaireTotal: salaireTotal(salaireDeBase, decompte.total),
    };
  });
}

export async function ajouterRegle(input: RegleInput): Promise<Result<string>> {
  const validee = validerRegle(input);
  if (!validee.ok) return validee;

  const employe = await prisma.employee.count({
    where: { id: input.employeeId, deletedAt: null },
  });
  if (employe === 0) {
    return fail(DomainError.notFound("Cet employé n'existe pas ou a été archivé."));
  }

  return ok(await creerRegle(validee.value));
}

/**
 * Rattache a un employe le bareme saisi lors de sa creation.
 *
 * Les regles sont deja validees quand elles arrivent ici : c'est voulu, et
 * c'est ce qui rend la creation sure. Le formulaire les valide AVANT d'ecrire
 * la fiche, si bien qu'un barème fautif n'a pas cree d'employe a moitie
 * configure — le seul echec possible a ce stade est une cible supprimee entre
 * l'affichage du formulaire et son envoi.
 */
export async function attacherBaremeInitial(
  employeeId: string,
  regles: RegleValidee[],
): Promise<Result<number>> {
  if (regles.length === 0) return ok(0);

  try {
    return ok(await creerRegles(employeeId, regles));
  } catch {
    return fail(
      DomainError.businessRule(
        "Le barème n'a pas pu être enregistré : une formation, un document ou une prestation ciblée a peut-être été supprimée. Complétez le barème depuis l'écran Rémunération de la fiche.",
        "BAREME_NON_ENREGISTRE",
      ),
    );
  }
}
