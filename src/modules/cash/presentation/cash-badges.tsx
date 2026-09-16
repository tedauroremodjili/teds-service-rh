import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { CashDirection, PaymentMethod, PaymentStatus } from "../domain/cash";

/** Libelles de la caisse et des paiements (modules 11 et 12). */
export const CASH_DIRECTION_LABELS: Record<CashDirection, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  CARTE: "Carte bancaire",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  EN_ATTENTE: "En attente",
  CONFIRME: "Confirmé",
  ANNULE: "Annulé",
  REMBOURSE: "Remboursé",
};

const PAYMENT_TONES: Record<PaymentStatus, BadgeTone> = {
  EN_ATTENTE: "warning",
  CONFIRME: "success",
  ANNULE: "danger",
  REMBOURSE: "info",
};

export function CashDirectionBadge({ direction }: { direction: CashDirection }) {
  return (
    <Badge tone={direction === "ENTREE" ? "success" : "danger"}>
      {CASH_DIRECTION_LABELS[direction]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONES[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
