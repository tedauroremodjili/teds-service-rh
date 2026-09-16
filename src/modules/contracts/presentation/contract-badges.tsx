import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { ContractStatus, ContractType } from "../domain/contract";

/** Libelles et couleurs des statuts de contrat (module 3). */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  BROUILLON: "Brouillon",
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  RENOUVELE: "Renouvelé",
  EXPIRE: "Expiré",
  RESILIE: "Résilié",
};

const TONES: Record<ContractStatus, BadgeTone> = {
  BROUILLON: "neutral",
  ACTIF: "success",
  SUSPENDU: "warning",
  RENOUVELE: "info",
  EXPIRE: "neutral",
  RESILIE: "danger",
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  CDI: "CDI",
  CDD: "CDD",
  STAGE: "Stage",
  PRESTATION: "Prestation",
  ESSAI: "Période d'essai",
  APPRENTISSAGE: "Apprentissage",
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge tone={TONES[status]}>{CONTRACT_STATUS_LABELS[status]}</Badge>;
}
