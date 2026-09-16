/**
 * Vocabulaire du module 4 — presences et conges.
 *
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "RETARD",
  "ABSENT",
  "ABSENCE_JUSTIFIEE",
  "CONGE",
  "AUTORISATION",
  "MISSION",
  "FERIE",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const LEAVE_TYPES = [
  "ANNUEL",
  "MALADIE",
  "MATERNITE",
  "PATERNITE",
  "SANS_SOLDE",
  "EXCEPTIONNEL",
  "AUTORISATION",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ["EN_ATTENTE", "APPROUVE", "REFUSE", "ANNULE"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/**
 * Jour de pointage, normalise a minuit UTC.
 *
 * La colonne `date` est de type DATE en base : elle ne porte pas d'heure. Si on
 * la comparait a un `new Date()` local, le decalage horaire ferait glisser le
 * pointage d'un jour. On normalise donc toujours par ici.
 */
export function jourPointage(valeur?: string | null): Date {
  if (valeur && /^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
    return new Date(`${valeur}T00:00:00.000Z`);
  }
  const aujourdhui = new Date();
  return new Date(
    Date.UTC(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()),
  );
}

/** Format « 2026-08-03 », attendu par un champ <input type="date">. */
export function versChampDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** « 8 h 30 » a partir d'un nombre de minutes. */
export function formatDuree(minutes: number): string {
  if (minutes <= 0) return "—";
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  if (heures === 0) return `${reste} min`;
  return reste === 0 ? `${heures} h` : `${heures} h ${String(reste).padStart(2, "0")}`;
}
