/**
 * Vocabulaire des modules 8 et 9 — formations et certificats.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const TRAINING_LEVELS = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

export const TRAINING_STATUSES = [
  "BROUILLON",
  "OUVERTE",
  "EN_COURS",
  "TERMINEE",
  "ANNULEE",
] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

/**
 * Places restantes sur une session, ou null si l'effectif n'est pas plafonne.
 * Jamais negatif : une session en surbooking affiche zero place, pas « -3 ».
 */
export function placesRestantes(maxStudents: number | null, inscrits: number): number | null {
  if (maxStudents === null) return null;
  return Math.max(0, maxStudents - inscrits);
}

/** Taux de remplissage en pourcentage, ou null si l'effectif est libre. */
export function tauxRemplissage(maxStudents: number | null, inscrits: number): number | null {
  if (maxStudents === null || maxStudents <= 0) return null;
  return Math.min(100, Math.round((inscrits / maxStudents) * 100));
}
