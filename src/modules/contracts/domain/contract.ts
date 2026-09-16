/**
 * Vocabulaire du module 3 — contrats de travail.
 *
 * Fichier de DOMAINE : ni Prisma, ni Next.js, ni React. Il ne declare que les
 * valeurs metier partagees par les requetes de lecture et les vues.
 */

export const CONTRACT_TYPES = [
  "CDI",
  "CDD",
  "STAGE",
  "PRESTATION",
  "ESSAI",
  "APPRENTISSAGE",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_STATUSES = [
  "BROUILLON",
  "ACTIF",
  "SUSPENDU",
  "RENOUVELE",
  "EXPIRE",
  "RESILIE",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

/** Delai au-dela duquel une fin de contrat n'est plus consideree imminente. */
export const PREAVIS_EXPIRATION_JOURS = 30;

/**
 * Nombre de jours restants avant l'echeance, ou null pour un contrat sans fin
 * (CDI). Negatif si l'echeance est deja passee.
 */
export function joursAvantEcheance(endDate: Date | null, reference = new Date()): number | null {
  if (!endDate) return null;
  const millisecondesParJour = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate.getTime() - reference.getTime()) / millisecondesParJour);
}

/** Vrai si le contrat arrive a echeance dans le delai de preavis. */
export function expireBientot(
  endDate: Date | null,
  status: ContractStatus,
  reference = new Date(),
): boolean {
  if (status !== "ACTIF") return false;
  const jours = joursAvantEcheance(endDate, reference);
  return jours !== null && jours >= 0 && jours <= PREAVIS_EXPIRATION_JOURS;
}
