/**
 * Vocabulaire du module 11 — caisse.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const CASH_DIRECTIONS = ["ENTREE", "SORTIE"] as const;
export type CashDirection = (typeof CASH_DIRECTIONS)[number];

export const PAYMENT_METHODS = [
  "ESPECES",
  "MOBILE_MONEY",
  "VIREMENT",
  "CHEQUE",
  "CARTE",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["EN_ATTENTE", "CONFIRME", "ANNULE", "REMBOURSE"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Montant signe d'un mouvement : une sortie diminue la caisse. */
export function montantSigne(direction: CashDirection, amount: number): number {
  return direction === "ENTREE" ? amount : -amount;
}
