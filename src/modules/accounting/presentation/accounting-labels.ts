import type { ExpenseCategory, RevenueSource } from "../domain/accounting";

/** Libelles francais des ecritures et des depenses (module 12). */
export const REVENUE_SOURCE_LABELS: Record<RevenueSource, string> = {
  VENTE_DOCUMENT: "Vente de documents",
  FORMATION: "Formations",
  PRESTATION: "Prestations",
  AUTRE: "Autres produits",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALAIRE: "Salaires",
  LOYER: "Loyer",
  FOURNITURE: "Fournitures",
  TRANSPORT: "Transport",
  ELECTRICITE: "Électricité",
  EAU: "Eau",
  INTERNET: "Internet",
  MAINTENANCE: "Maintenance",
  MARKETING: "Marketing",
  IMPOT: "Impôts et taxes",
  AUTRE: "Autres charges",
};
