/**
 * Vocabulaire du module 5 — salaires.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const PAYROLL_STATUSES = ["BROUILLON", "CALCULE", "VALIDE", "PAYE", "ANNULE"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const PAYROLL_ITEM_TYPES = [
  "PRIME",
  "COMMISSION",
  "HEURES_SUP",
  "RETENUE",
  "AVANCE",
  "COTISATION",
  "IMPOT",
] as const;
export type PayrollItemType = (typeof PAYROLL_ITEM_TYPES)[number];

export interface Periode {
  year: number;
  month: number;
}

/**
 * Periode de paie lue depuis l'URL (« 2026-08 »), sinon le mois courant.
 * Une paie se raisonne toujours par mois : c'est l'unite du bulletin.
 */
export function parsePeriode(valeur?: string | null): Periode {
  if (valeur && /^\d{4}-\d{2}$/.test(valeur)) {
    const [annee, mois] = valeur.split("-").map(Number);
    if (mois >= 1 && mois <= 12) return { year: annee, month: mois };
  }
  const maintenant = new Date();
  return { year: maintenant.getFullYear(), month: maintenant.getMonth() + 1 };
}

/** Format « 2026-08 », attendu par un champ <input type="month">. */
export function versChampMois(periode: Periode): string {
  return `${periode.year}-${String(periode.month).padStart(2, "0")}`;
}
