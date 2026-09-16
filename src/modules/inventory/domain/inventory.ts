/**
 * Vocabulaire du module 13 — stock.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const INVENTORY_CATEGORIES = [
  "LIVRE",
  "SUPPORT",
  "DOCUMENT",
  "BADGE",
  "CARTE",
  "CONSOMMABLE",
  "MATERIEL",
] as const;
export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const STOCK_MOVEMENT_TYPES = ["ENTREE", "SORTIE", "INVENTAIRE", "PERTE"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/**
 * Etat d'un article vis-a-vis de son seuil d'alerte.
 * Trois niveaux plutot que deux : un stock a zero ne se traite pas comme un
 * stock bas — l'un bloque l'activite, l'autre la met en garde.
 */
export type NiveauStock = "RUPTURE" | "ALERTE" | "NORMAL";

export function niveauStock(quantity: number, alertQuantity: number): NiveauStock {
  if (quantity <= 0) return "RUPTURE";
  if (quantity <= alertQuantity) return "ALERTE";
  return "NORMAL";
}

/** Valeur d'un article au cout unitaire. */
export function valeurStock(quantity: number, unitCost: number): number {
  return Math.max(0, quantity) * unitCost;
}
