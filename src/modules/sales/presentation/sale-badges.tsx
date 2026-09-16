import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { SaleStatus } from "../domain/sale";

/** Libelles et couleurs des ventes (module 7). */
export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  BROUILLON: "Brouillon",
  CONFIRMEE: "Confirmée",
  PAYEE: "Payée",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  ANNULEE: "Annulée",
};

const TONES: Record<SaleStatus, BadgeTone> = {
  BROUILLON: "neutral",
  CONFIRMEE: "info",
  PAYEE: "success",
  PARTIELLEMENT_PAYEE: "warning",
  ANNULEE: "danger",
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return <Badge tone={TONES[status]}>{SALE_STATUS_LABELS[status]}</Badge>;
}
