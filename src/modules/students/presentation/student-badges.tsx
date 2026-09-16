import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { RegistrationStatus } from "../domain/student";

/** Libelles et couleurs des inscriptions (module 9). */
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  INSCRIT: "Inscrit",
  REINSCRIT: "Réinscrit",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ABANDONNE: "Abandon",
  ANNULE: "Annulé",
};

const TONES: Record<RegistrationStatus, BadgeTone> = {
  INSCRIT: "info",
  REINSCRIT: "info",
  EN_COURS: "success",
  TERMINE: "primary",
  ABANDONNE: "warning",
  ANNULE: "danger",
};

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return <Badge tone={TONES[status]}>{REGISTRATION_STATUS_LABELS[status]}</Badge>;
}
