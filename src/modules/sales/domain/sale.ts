/**
 * Vocabulaire du module 7 — vente de documents administratifs.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const SALE_STATUSES = [
  "BROUILLON",
  "CONFIRMEE",
  "PAYEE",
  "PARTIELLEMENT_PAYEE",
  "ANNULEE",
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

/**
 * Reste du sur une vente. Une vente annulee ne doit rien, quel que soit le
 * montant deja encaisse — le remboursement se traite a part.
 */
export function resteAPayer(totalAmount: number, paidAmount: number, status: SaleStatus): number {
  if (status === "ANNULEE") return 0;
  return Math.max(0, totalAmount - paidAmount);
}
