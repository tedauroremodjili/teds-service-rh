/**
 * Vocabulaire du module 6 — commissions sur ventes.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const COMMISSION_SOURCE_TYPES = [
  "VENTE_DOCUMENT",
  "INSCRIPTION_FORMATION",
  "PRESTATION",
] as const;
export type CommissionSourceType = (typeof COMMISSION_SOURCE_TYPES)[number];

export const COMMISSION_STATUSES = [
  "EN_ATTENTE",
  "VALIDEE",
  "INTEGREE_PAIE",
  "ANNULEE",
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

/**
 * Lien vers la piece a l'origine de la commission.
 * La commission ne se comprend qu'avec sa source : sans ce lien, un agent ne
 * peut pas verifier le montant qui lui est attribue.
 */
export function lienSource(sourceType: CommissionSourceType, sourceId: string): string {
  switch (sourceType) {
    case "VENTE_DOCUMENT":
      return `/ventes?recherche=${encodeURIComponent(sourceId)}`;
    case "INSCRIPTION_FORMATION":
      return `/apprenants?recherche=${encodeURIComponent(sourceId)}`;
    case "PRESTATION":
      return `/prestations?recherche=${encodeURIComponent(sourceId)}`;
  }
}
