import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { InventoryCategory, NiveauStock, StockMovementType } from "../domain/inventory";

/** Libelles du stock (module 13). */
export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  LIVRE: "Livre",
  SUPPORT: "Support de cours",
  DOCUMENT: "Document",
  BADGE: "Badge",
  CARTE: "Carte",
  CONSOMMABLE: "Consommable",
  MATERIEL: "Matériel",
};

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  INVENTAIRE: "Inventaire",
  PERTE: "Perte",
};

const NIVEAU_LABELS: Record<NiveauStock, string> = {
  RUPTURE: "Rupture",
  ALERTE: "Stock bas",
  NORMAL: "Disponible",
};

const NIVEAU_TONES: Record<NiveauStock, BadgeTone> = {
  RUPTURE: "danger",
  ALERTE: "warning",
  NORMAL: "success",
};

export function StockLevelBadge({ niveau }: { niveau: NiveauStock }) {
  return <Badge tone={NIVEAU_TONES[niveau]}>{NIVEAU_LABELS[niveau]}</Badge>;
}
