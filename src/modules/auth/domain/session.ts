/**
 * Le contrat de session : ce que l'application sait de l'utilisateur connecte.
 *
 * C'est volontairement minimal. Le cookie de session voyage a chaque requete :
 * il ne doit contenir que l'identite et les droits, jamais de donnee sensible
 * (mot de passe, salaire, numero de piece d'identite).
 */

import type { Permission, RoleName } from "./permissions";
import { hasPermission } from "./permissions";

/** Charge utile signee et chiffree dans le cookie. */
export interface SessionPayload {
  userId: string;
  email: string;
  role: RoleName;
  /** Permissions resolues au moment de la connexion. */
  permissions: string[];
  /** Employe rattache, si le compte correspond a un membre du personnel. */
  employeeId: string | null;
  displayName: string;
  /** Horodatage d'expiration, en millisecondes (epoch). */
  expiresAt: number;
}

/** Vue lisible de l'utilisateur courant, telle qu'exposee aux pages. */
export interface CurrentUser {
  id: string;
  email: string;
  role: RoleName;
  permissions: string[];
  employeeId: string | null;
  displayName: string;
}

export function toCurrentUser(payload: SessionPayload): CurrentUser {
  return {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    permissions: payload.permissions,
    employeeId: payload.employeeId,
    displayName: payload.displayName,
  };
}

/** Raccourci de lecture, utilise partout dans les vues et les actions. */
export function can(user: CurrentUser | null, permission: Permission | Permission[]): boolean {
  if (!user) return false;
  return hasPermission(user.permissions, permission);
}

/**
 * Regle transverse : un agent ne consulte que ses propres donnees.
 * Un responsable RH ou un comptable, lui, consulte tout le personnel.
 */
export function canAccessEmployeeData(
  user: CurrentUser | null,
  employeeId: string,
  globalPermission: Permission,
): boolean {
  if (!user) return false;
  if (user.employeeId === employeeId) return true;
  return hasPermission(user.permissions, globalPermission);
}
