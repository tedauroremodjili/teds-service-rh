/**
 * Vocabulaire du catalogue de documents (module 7).
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const DOCUMENT_CATEGORIES = [
  "ATTESTATION",
  "CERTIFICAT",
  "DUPLICATA",
  "CARTE_ETUDIANT",
  "BADGE",
  "DOSSIER",
  "RELEVE_NOTES",
  "SUPPORT_COURS",
  "LIVRE",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const PRODUCT_STATUSES = ["DISPONIBLE", "RUPTURE", "ARCHIVE"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * Un stock `null` designe un document genere a la demande (une attestation
 * s'imprime), qui ne peut donc jamais manquer. Seuls les articles physiques
 * declenchent une alerte.
 */
export function stockEnAlerte(stock: number | null, alertStock: number | null): boolean {
  if (stock === null) return false;
  return stock <= (alertStock ?? 0);
}
