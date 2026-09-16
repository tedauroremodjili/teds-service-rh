import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { CommissionSourceType, CommissionStatus } from "../domain/commission";

/** Libelles et couleurs des commissions (module 6). */
export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  EN_ATTENTE: "En attente",
  VALIDEE: "Validée",
  INTEGREE_PAIE: "Intégrée en paie",
  ANNULEE: "Annulée",
};

const TONES: Record<CommissionStatus, BadgeTone> = {
  EN_ATTENTE: "warning",
  VALIDEE: "info",
  INTEGREE_PAIE: "success",
  ANNULEE: "danger",
};

export const COMMISSION_SOURCE_LABELS: Record<CommissionSourceType, string> = {
  VENTE_DOCUMENT: "Vente de document",
  INSCRIPTION_FORMATION: "Inscription formation",
  PRESTATION: "Prestation de service",
};

export function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return <Badge tone={TONES[status]}>{COMMISSION_STATUS_LABELS[status]}</Badge>;
}
