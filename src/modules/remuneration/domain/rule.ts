/**
 * Bareme de remuneration par activite.
 *
 * Le probleme que ce module resout : chez TED'S SERVICE, une meme personne
 * n'est pas payee de la meme facon selon ce qu'elle fait. Tomo touche 85 % de
 * chaque somme versee par un enfant pour sa formation, 1 000 F par vente de
 * document, 5 % sur les prestations informatiques, et 500 F sur les 2 000 F de
 * frais d'inscription en anglais. Un taux unique par employe — le modele
 * precedent — ne peut rien exprimer de tout cela.
 *
 * Fichier de DOMAINE : aucune dependance a Prisma, Next.js ou React. Les
 * regles se testent avec des objets litteraux, sans base de donnees.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

/* -------------------------------------------------------------------------- */
/* Vocabulaire                                                                 */
/* -------------------------------------------------------------------------- */

export const ACTIVITES = [
  "FRAIS_INSCRIPTION",
  "FRAIS_FORMATION",
  "VENTE_DOCUMENT",
  "PRESTATION",
] as const;

export type Activite = (typeof ACTIVITES)[number];

export const ACTIVITE_LABELS: Record<Activite, string> = {
  FRAIS_INSCRIPTION: "Frais d'inscription",
  FRAIS_FORMATION: "Frais de formation",
  VENTE_DOCUMENT: "Vente de documents",
  PRESTATION: "Prestation de service",
};

export const MODES = ["POURCENTAGE", "MONTANT_FIXE", "MARGE"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  POURCENTAGE: "Pourcentage du montant encaissé",
  MONTANT_FIXE: "Montant fixe",
  MARGE: "Part de la marge sur documents vendus",
};

/** MARGE n'a de sens que pour des documents : ils sont seuls a porter un cout. */
export const MODES_PAR_ACTIVITE: Record<Activite, readonly Mode[]> = {
  FRAIS_INSCRIPTION: ["POURCENTAGE", "MONTANT_FIXE"],
  FRAIS_FORMATION: ["POURCENTAGE", "MONTANT_FIXE"],
  VENTE_DOCUMENT: ["POURCENTAGE", "MONTANT_FIXE", "MARGE"],
  PRESTATION: ["POURCENTAGE", "MONTANT_FIXE"],
};

export const ASSIETTES = ["PAR_OPERATION", "PAR_ARTICLE"] as const;
export type Assiette = (typeof ASSIETTES)[number];

export const ASSIETTE_LABELS: Record<Assiette, string> = {
  PAR_OPERATION: "Une fois par opération",
  PAR_ARTICLE: "Une fois par article",
};

export const PORTEES = ["MES_OPERATIONS", "TOUTE_ACTIVITE"] as const;
export type Portee = (typeof PORTEES)[number];

export const PORTEE_LABELS: Record<Portee, string> = {
  MES_OPERATIONS: "Uniquement mes ventes",
  TOUTE_ACTIVITE: "Toute l'activité ciblée",
};

export const PORTEE_DESCRIPTIONS: Record<Portee, string> = {
  MES_OPERATIONS:
    "L'employé est rémunéré sur les opérations qu'il a lui-même vendues — la commission commerciale classique.",
  TOUTE_ACTIVITE:
    "L'employé est rémunéré sur toutes les opérations correspondant à la cible, quel qu'en soit le vendeur — le cas de l'animatrice payée sur les paiements des enfants qu'elle encadre.",
};

/* -------------------------------------------------------------------------- */
/* La regle                                                                    */
/* -------------------------------------------------------------------------- */

export interface RegleRemuneration {
  id: string;
  employeeId: string;
  label: string;
  activity: Activite;
  mode: Mode;
  portee: Portee;
  /** Renseigne si mode = POURCENTAGE. */
  rate: number | null;
  /** Renseigne si mode = MONTANT_FIXE. */
  fixedAmount: number | null;
  fixedBasis: Assiette;

  // Ciblage : au plus un identifiant precis et une categorie par activite.
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
}

/**
 * Regle validee, pas encore rattachee a un employe.
 *
 * C'est la forme dont a besoin le formulaire de creation : le bareme s'y
 * saisit avant que la fiche existe, donc avant qu'il y ait un `employeeId` a
 * lui donner. Le rattachement se fait a l'ecriture, une fois l'employe cree.
 */
export type RegleValidee = Omit<RegleRemuneration, "id" | "employeeId">;

/** Donnees brutes d'un formulaire, avant validation. */
export interface RegleInput {
  employeeId: string;
  label: string;
  activity: string;
  mode: string;
  portee?: string | null;
  rate?: number | string | null;
  fixedAmount?: number | string | null;
  fixedBasis?: string | null;
  trainingId?: string | null;
  trainingCategoryId?: string | null;
  documentProductId?: string | null;
  documentCategory?: string | null;
  serviceId?: string | null;
  serviceCategory?: string | null;
  priority?: number | string | null;
  isActive?: boolean;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}

/**
 * Valide une regle et la normalise, sans la rattacher a un employe.
 *
 * Deux verifications portent tout le sens metier : un pourcentage sans taux ou
 * un montant fixe sans montant ne veulent rien dire, et une cible etrangere a
 * l'activite (une formation sur une regle de vente de documents) ne serait
 * jamais appariee — elle produirait une regle silencieusement inerte.
 *
 * L'employe n'entre pas dans ces controles : c'est ce qui permet de valider un
 * bareme saisi sur le formulaire de creation, avant que la fiche existe.
 */
export function validerRegleSansEmploye(
  input: Omit<RegleInput, "employeeId">,
): Result<RegleValidee> {
  const label = input.label.trim();
  if (label.length < 3) {
    return fail(DomainError.validation("Donnez un libellé à cette règle.", "label"));
  }

  if (!ACTIVITES.includes(input.activity as Activite)) {
    return fail(DomainError.validation("Choisissez l'activité concernée.", "activity"));
  }
  const activity = input.activity as Activite;

  if (!MODES.includes(input.mode as Mode)) {
    return fail(DomainError.validation("Choisissez le mode de calcul.", "mode"));
  }
  const mode = input.mode as Mode;

  if (!MODES_PAR_ACTIVITE[activity].includes(mode)) {
    return fail(
      DomainError.businessRule(
        `Le mode « ${MODE_LABELS[mode]} » ne s'applique pas à l'activité « ${ACTIVITE_LABELS[activity]} ».`,
        "MODE_INCOMPATIBLE",
      ),
    );
  }

  const portee = (input.portee ?? "MES_OPERATIONS") as Portee;
  if (!PORTEES.includes(portee)) {
    return fail(DomainError.validation("La portée est invalide.", "portee"));
  }

  const fixedBasis = (input.fixedBasis ?? "PAR_OPERATION") as Assiette;
  if (!ASSIETTES.includes(fixedBasis)) {
    return fail(DomainError.validation("L'assiette est invalide.", "fixedBasis"));
  }

  let rate: number | null = null;
  let fixedAmount: number | null = null;

  if (mode === "POURCENTAGE" || mode === "MARGE") {
    rate = Number(input.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return fail(DomainError.validation("Indiquez un taux supérieur à zéro.", "rate"));
    }
    if (rate > 100) {
      return fail(DomainError.validation("Le taux ne peut pas dépasser 100 %.", "rate"));
    }
    rate = Math.round(rate * 100) / 100;
  } else {
    fixedAmount = Number(input.fixedAmount);
    if (!Number.isFinite(fixedAmount) || fixedAmount <= 0) {
      return fail(
        DomainError.validation("Indiquez un montant supérieur à zéro.", "fixedAmount"),
      );
    }
    fixedAmount = Math.round(fixedAmount);
  }

  // --- Coherence du ciblage avec l'activite ---
  const cibleFormation = Boolean(input.trainingId || input.trainingCategoryId);
  const cibleDocument = Boolean(input.documentProductId || input.documentCategory);
  const cibleService = Boolean(input.serviceId || input.serviceCategory);

  const attendues: Record<Activite, boolean> = {
    FRAIS_INSCRIPTION: cibleDocument || cibleService,
    FRAIS_FORMATION: cibleDocument || cibleService,
    VENTE_DOCUMENT: cibleFormation || cibleService,
    PRESTATION: cibleFormation || cibleDocument,
  };

  if (attendues[activity]) {
    return fail(
      DomainError.businessRule(
        `La cible choisie ne correspond pas à l'activité « ${ACTIVITE_LABELS[activity]} » : la règle ne s'appliquerait jamais.`,
        "CIBLE_INCOHERENTE",
      ),
    );
  }

  const startDate = versDate(input.startDate);
  const endDate = versDate(input.endDate);
  if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
    return fail(
      DomainError.validation("La date de fin précède la date de début.", "endDate"),
    );
  }

  return ok({
    label,
    activity,
    mode,
    portee,
    rate,
    fixedAmount,
    fixedBasis,
    trainingId: vide(input.trainingId),
    trainingCategoryId: vide(input.trainingCategoryId),
    documentProductId: vide(input.documentProductId),
    documentCategory: vide(input.documentCategory),
    serviceId: vide(input.serviceId),
    serviceCategory: vide(input.serviceCategory),
    priority: Number(input.priority) || 0,
    isActive: input.isActive ?? true,
    startDate,
    endDate,
  });
}

/** Meme validation, pour une regle ajoutee au barème d'un employe existant. */
export function validerRegle(input: RegleInput): Result<Omit<RegleRemuneration, "id">> {
  const validee = validerRegleSansEmploye(input);
  if (!validee.ok) return validee;

  return ok({ ...validee.value, employeeId: input.employeeId });
}

/* -------------------------------------------------------------------------- */
/* Bareme saisi a la creation d'un employe                                     */
/* -------------------------------------------------------------------------- */

/**
 * Nombre de regles acceptees a la creation.
 *
 * Le bareme initial sert a poser ce que touche la personne — quelques lignes.
 * Un plafond evite qu'un formulaire trafique n'envoie mille regles a valider
 * et a ecrire ; le reste se compose ensuite depuis l'ecran Rémunération.
 */
export const MAX_REGLES_INITIALES = 20;

/**
 * Analyse le bareme transmis par le formulaire de creation.
 *
 * Le formulaire empile les regles cote navigateur et les envoie serialisees en
 * JSON dans un champ unique : c'est ce qui permet d'en saisir plusieurs sans
 * avoir enregistre l'employe. La chaine venant du client n'est pas digne de
 * confiance, donc chaque ligne repasse par la validation complete, et l'erreur
 * nomme la regle fautive — « Règle 2 : indiquez un taux supérieur à zéro »
 * plutot qu'un message flottant que l'utilisateur ne saurait ou rattacher.
 */
export function parseBaremeInitial(brut: string | null | undefined): Result<RegleValidee[]> {
  const texte = brut?.trim();
  if (!texte || texte === "[]") return ok([]);

  let lignes: unknown;
  try {
    lignes = JSON.parse(texte);
  } catch {
    return fail(
      DomainError.validation("Le barème saisi n'a pas pu être lu. Rechargez la page.", "bareme"),
    );
  }

  if (!Array.isArray(lignes)) {
    return fail(DomainError.validation("Le barème saisi est invalide.", "bareme"));
  }

  if (lignes.length > MAX_REGLES_INITIALES) {
    return fail(
      DomainError.businessRule(
        `Le barème initial est limité à ${MAX_REGLES_INITIALES} règles. Créez la fiche, puis complétez-la depuis son écran Rémunération.`,
        "BAREME_TROP_LONG",
      ),
    );
  }

  const regles: RegleValidee[] = [];

  for (const [index, ligne] of lignes.entries()) {
    if (typeof ligne !== "object" || ligne === null) {
      return fail(DomainError.validation(`Règle ${index + 1} : ligne illisible.`, "bareme"));
    }

    const validee = validerRegleSansEmploye(ligne as Omit<RegleInput, "employeeId">);
    if (!validee.ok) {
      // Le champ fautif est celui d'un sous-formulaire deja referme : on
      // rapatrie le message sur le bareme, seul endroit encore affiche.
      return fail(
        DomainError.validation(`Règle ${index + 1} : ${validee.error.message}`, "bareme"),
      );
    }

    regles.push(validee.value);
  }

  return ok(regles);
}

/**
 * Degre de precision du ciblage : 2 pour une cible nommee, 1 pour une
 * categorie, 0 pour aucune.
 *
 * C'est ce qui permet de faire cohabiter « 10 % sur toutes les formations » et
 * « 85 % sur la formation Anglais enfants » : pour un paiement d'anglais, la
 * seconde l'emporte, sans que la premiere ait besoin d'exclure quoi que ce soit.
 */
export function specificite(regle: RegleRemuneration): number {
  if (regle.trainingId || regle.documentProductId || regle.serviceId) return 2;
  if (regle.trainingCategoryId || regle.documentCategory || regle.serviceCategory) return 1;
  return 0;
}

/**
 * Description lisible du calcul, affichee dans les listes et les decomptes.
 * Elle ne regarde que le mode de calcul, ce qui lui permet de decrire aussi
 * bien une regle enregistree qu'une regle encore a l'etat de brouillon.
 */
export function decrireCalcul(
  regle: Pick<RegleRemuneration, "mode" | "rate" | "fixedAmount" | "fixedBasis">,
): string {
  if (regle.mode === "POURCENTAGE") {
    return `${(regle.rate ?? 0).toLocaleString("fr-FR")} % du montant encaissé`;
  }

  if (regle.mode === "MARGE") {
    return `${(regle.rate ?? 0).toLocaleString("fr-FR")} % de la marge (prix de vente − prix de revient)`;
  }

  const montant = `${(regle.fixedAmount ?? 0).toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;
  return regle.fixedBasis === "PAR_ARTICLE" ? `${montant} par article` : `${montant} par opération`;
}

/* -------------------------------------------------------------------------- */

function vide(valeur: string | null | undefined): string | null {
  const propre = valeur?.trim();
  return propre ? propre : null;
}

function versDate(valeur: string | Date | null | undefined): Date | null {
  if (!valeur) return null;
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}
