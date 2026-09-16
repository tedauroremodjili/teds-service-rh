/**
 * Vocabulaire du module 12 — comptabilite.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const REVENUE_SOURCES = ["VENTE_DOCUMENT", "FORMATION", "PRESTATION", "AUTRE"] as const;
export type RevenueSource = (typeof REVENUE_SOURCES)[number];

export const EXPENSE_CATEGORIES = [
  "SALAIRE",
  "LOYER",
  "FOURNITURE",
  "TRANSPORT",
  "ELECTRICITE",
  "EAU",
  "INTERNET",
  "MAINTENANCE",
  "MARKETING",
  "IMPOT",
  "AUTRE",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * Solde d'un compte du grand livre.
 *
 * Convention comptable : un compte de charge (classe 6) est debiteur, un compte
 * de produit (classe 7) crediteur. On presente donc le solde en valeur absolue
 * accompagne de son sens, plutot qu'un nombre negatif difficile a lire.
 */
export interface SoldeCompte {
  debit: number;
  credit: number;
}

export function soldeDebiteur({ debit, credit }: SoldeCompte): boolean {
  return debit >= credit;
}

export function soldeAbsolu({ debit, credit }: SoldeCompte): number {
  return Math.abs(debit - credit);
}
