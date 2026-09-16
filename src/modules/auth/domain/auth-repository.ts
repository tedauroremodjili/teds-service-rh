/**
 * Port du module auth.
 *
 * Le domaine declare ce dont il a besoin ; il ignore totalement que la
 * persistance est assuree par PostgreSQL via Prisma. C'est l'inversion de
 * dependance de la Clean Architecture : l'infrastructure implemente cette
 * interface, jamais l'inverse. Consequence pratique : les cas d'usage se testent
 * avec une implementation en memoire, sans base de donnees.
 */

import type { PermissionOverride, RoleName } from "./permissions";

/** Vue du compte necessaire a l'authentification, et rien de plus. */
export interface AuthenticatableUser {
  id: string;
  email: string;
  passwordHash: string;
  status: "ACTIF" | "INACTIF" | "SUSPENDU";
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  mustChangePassword: boolean;
  role: RoleName;
  /** Socle du role, lu dans `role_permissions` — il se modifie depuis /roles. */
  rolePermissions: string[];
  /**
   * Droits attribues a CE compte, en plus ou en retrait de ceux du role.
   * Le role seul ne suffit donc jamais a decrire ce que l'utilisateur peut
   * faire : c'est `resolvePermissions()` qui tranche.
   */
  permissionOverrides: PermissionOverride[];
  employeeId: string | null;
  displayName: string;
}

export interface LoginAttemptRecord {
  userId: string | null;
  email: string;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
}

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthenticatableUser | null>;

  /** Enregistre un echec : compteur de tentatives et verrouillage eventuel. */
  recordFailedAttempt(userId: string, attempts: number, lockedUntil: Date | null): Promise<void>;

  /** Remet les compteurs a zero et horodate la connexion. */
  recordSuccessfulLogin(userId: string): Promise<void>;

  /** Historique des connexions (module 1). */
  appendLoginHistory(entry: LoginAttemptRecord): Promise<void>;
}
