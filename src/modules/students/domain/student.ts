/**
 * Vocabulaire du module 9 — apprenants et inscriptions.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const REGISTRATION_STATUSES = [
  "INSCRIT",
  "REINSCRIT",
  "EN_COURS",
  "TERMINE",
  "ABANDONNE",
  "ANNULE",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** Statuts pour lesquels l'apprenant occupe une place et suit un cursus. */
export const REGISTRATION_STATUSES_ACTIFS: readonly RegistrationStatus[] = [
  "INSCRIT",
  "REINSCRIT",
  "EN_COURS",
];

/**
 * Reste du sur une inscription : le montant negocie moins ce qui a ete verse.
 * Une inscription annulee ne doit plus rien.
 */
export function resteDuInscription(
  agreedAmount: number,
  paidAmount: number,
  status: RegistrationStatus,
): number {
  if (status === "ANNULE") return 0;
  return Math.max(0, agreedAmount - paidAmount);
}
