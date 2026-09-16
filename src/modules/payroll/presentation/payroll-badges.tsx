import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { PayrollItemType, PayrollStatus } from "../domain/payroll";

/** Libelles et couleurs des statuts de paie (module 5). */
export const PAYROLL_STATUS_LABELS: Record<PayrollStatus, string> = {
  BROUILLON: "Brouillon",
  CALCULE: "Calculé",
  VALIDE: "Validé",
  PAYE: "Payé",
  ANNULE: "Annulé",
};

const TONES: Record<PayrollStatus, BadgeTone> = {
  BROUILLON: "neutral",
  CALCULE: "info",
  VALIDE: "primary",
  PAYE: "success",
  ANNULE: "danger",
};

export const PAYROLL_ITEM_TYPE_LABELS: Record<PayrollItemType, string> = {
  PRIME: "Prime",
  COMMISSION: "Commission",
  HEURES_SUP: "Heures supplémentaires",
  RETENUE: "Retenue",
  AVANCE: "Avance",
  COTISATION: "Cotisation",
  IMPOT: "Impôt",
};

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  return <Badge tone={TONES[status]}>{PAYROLL_STATUS_LABELS[status]}</Badge>;
}
