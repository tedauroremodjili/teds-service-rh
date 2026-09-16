import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { TrainingLevel, TrainingStatus } from "../domain/training";

/** Libelles et couleurs des formations (module 8). */
export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  BROUILLON: "Brouillon",
  OUVERTE: "Inscriptions ouvertes",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const TONES: Record<TrainingStatus, BadgeTone> = {
  BROUILLON: "neutral",
  OUVERTE: "info",
  EN_COURS: "success",
  TERMINEE: "primary",
  ANNULEE: "danger",
};

export const TRAINING_LEVEL_LABELS: Record<TrainingLevel, string> = {
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
  AVANCE: "Avancé",
  EXPERT: "Expert",
};

export function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  return <Badge tone={TONES[status]}>{TRAINING_STATUS_LABELS[status]}</Badge>;
}
