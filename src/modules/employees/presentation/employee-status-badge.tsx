import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { EmployeeStatus } from "../domain/employee";

/** Libelles et couleurs des statuts (module 2). */
export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIF: "Actif",
  SUSPENDU: "Suspendu",
  CONGE: "En congé",
  DEMISSIONNE: "Démissionné",
  LICENCIE: "Licencié",
  RETRAITE: "Retraité",
};

const TONES: Record<EmployeeStatus, BadgeTone> = {
  ACTIF: "success",
  SUSPENDU: "warning",
  CONGE: "info",
  DEMISSIONNE: "neutral",
  LICENCIE: "danger",
  RETRAITE: "neutral",
};

export function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  return <Badge tone={TONES[status]}>{EMPLOYEE_STATUS_LABELS[status]}</Badge>;
}

export const GENDER_LABELS: Record<string, string> = {
  MASCULIN: "Masculin",
  FEMININ: "Féminin",
};

export const MARITAL_STATUS_LABELS: Record<string, string> = {
  CELIBATAIRE: "Célibataire",
  MARIE: "Marié(e)",
  DIVORCE: "Divorcé(e)",
  VEUF: "Veuf/Veuve",
};
