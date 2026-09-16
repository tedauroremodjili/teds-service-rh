import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { AttendanceStatus, LeaveStatus, LeaveType } from "../domain/attendance";

/* --- Presences ------------------------------------------------------------ */

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Présent",
  RETARD: "En retard",
  ABSENT: "Absent",
  ABSENCE_JUSTIFIEE: "Absence justifiée",
  CONGE: "En congé",
  AUTORISATION: "Autorisation",
  MISSION: "En mission",
  FERIE: "Jour férié",
};

const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  PRESENT: "success",
  RETARD: "warning",
  ABSENT: "danger",
  ABSENCE_JUSTIFIEE: "neutral",
  CONGE: "info",
  AUTORISATION: "info",
  MISSION: "primary",
  FERIE: "neutral",
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <Badge tone={ATTENDANCE_TONES[status]}>{ATTENDANCE_STATUS_LABELS[status]}</Badge>;
}

/* --- Conges --------------------------------------------------------------- */

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUEL: "Congé annuel",
  MALADIE: "Maladie",
  MATERNITE: "Maternité",
  PATERNITE: "Paternité",
  SANS_SOLDE: "Sans solde",
  EXCEPTIONNEL: "Exceptionnel",
  AUTORISATION: "Autorisation d'absence",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  EN_ATTENTE: "En attente",
  APPROUVE: "Approuvé",
  REFUSE: "Refusé",
  ANNULE: "Annulé",
};

const LEAVE_TONES: Record<LeaveStatus, BadgeTone> = {
  EN_ATTENTE: "warning",
  APPROUVE: "success",
  REFUSE: "danger",
  ANNULE: "neutral",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return <Badge tone={LEAVE_TONES[status]}>{LEAVE_STATUS_LABELS[status]}</Badge>;
}
