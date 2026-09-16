/**
 * Cas d'usage : connexion d'un utilisateur (module 1).
 *
 * Un cas d'usage orchestre — il ne decide pas des regles. Les regles
 * (« au bout de 5 echecs le compte se verrouille », « le mot de passe doit
 * faire 8 caracteres ») vivent dans le domaine ; la lecture en base et le
 * hachage vivent dans l'infrastructure. Cette fonction se contente d'enchainer
 * les etapes dans le bon ordre.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import type { AuthRepository } from "../domain/auth-repository";
import {
  DUREE_VERROUILLAGE_MINUTES,
  Email,
  isLocked,
  minutesBeforeUnlock,
  registerFailedAttempt,
} from "../domain/credentials";
import { resolvePermissions } from "../domain/permissions";
import type { SessionPayload } from "../domain/session";

export interface LoginCommand {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface LoginDependencies {
  repository: AuthRepository;
  verifyPassword: (plain: string, hash: string) => Promise<boolean>;
  simulatePasswordCheck: () => Promise<void>;
}

export type LoginResult = {
  session: Omit<SessionPayload, "expiresAt">;
  mustChangePassword: boolean;
};

/**
 * Message unique en cas d'identifiants invalides : ne jamais indiquer si c'est
 * l'email ou le mot de passe qui est faux, sous peine de permettre l'enumeration
 * des comptes existants.
 */
const IDENTIFIANTS_INVALIDES = "Email ou mot de passe incorrect.";

export async function login(
  command: LoginCommand,
  deps: LoginDependencies,
): Promise<Result<LoginResult>> {
  const emailResult = Email.create(command.email);
  if (!emailResult.ok) return emailResult;

  const email = emailResult.value.value;

  if (command.password.length === 0) {
    return fail(DomainError.validation("Le mot de passe est obligatoire.", "password"));
  }

  const user = await deps.repository.findByEmail(email);

  // Compte inexistant : on consomme malgre tout le temps d'un hachage pour que
  // la duree de reponse ne trahisse pas l'existence du compte.
  if (!user) {
    await deps.simulatePasswordCheck();
    await deps.repository.appendLoginHistory({
      userId: null,
      email,
      success: false,
      ipAddress: command.ipAddress ?? null,
      userAgent: command.userAgent ?? null,
      reason: "COMPTE_INEXISTANT",
    });
    return fail(DomainError.validation(IDENTIFIANTS_INVALIDES, "email"));
  }

  if (isLocked(user.lockedUntil)) {
    const minutes = minutesBeforeUnlock(user.lockedUntil!);
    await deps.repository.appendLoginHistory({
      userId: user.id,
      email,
      success: false,
      ipAddress: command.ipAddress ?? null,
      userAgent: command.userAgent ?? null,
      reason: "COMPTE_VERROUILLE",
    });
    return fail(
      DomainError.businessRule(
        `Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        "COMPTE_VERROUILLE",
      ),
    );
  }

  if (user.status !== "ACTIF") {
    await deps.repository.appendLoginHistory({
      userId: user.id,
      email,
      success: false,
      ipAddress: command.ipAddress ?? null,
      userAgent: command.userAgent ?? null,
      reason: `STATUT_${user.status}`,
    });
    return fail(
      DomainError.businessRule(
        "Ce compte est désactivé. Contactez le responsable RH.",
        "COMPTE_INACTIF",
      ),
    );
  }

  const passwordMatches = await deps.verifyPassword(command.password, user.passwordHash);

  if (!passwordMatches) {
    const { attempts, lockedUntil } = registerFailedAttempt(user.failedLoginAttempts);
    await deps.repository.recordFailedAttempt(user.id, attempts, lockedUntil);
    await deps.repository.appendLoginHistory({
      userId: user.id,
      email,
      success: false,
      ipAddress: command.ipAddress ?? null,
      userAgent: command.userAgent ?? null,
      reason: "MOT_DE_PASSE_INVALIDE",
    });

    if (lockedUntil) {
      return fail(
        DomainError.businessRule(
          `Trop de tentatives échouées. Compte verrouillé pendant ${DUREE_VERROUILLAGE_MINUTES} minutes.`,
          "COMPTE_VERROUILLE",
        ),
      );
    }

    return fail(DomainError.validation(IDENTIFIANTS_INVALIDES, "password"));
  }

  await deps.repository.recordSuccessfulLogin(user.id);
  await deps.repository.appendLoginHistory({
    userId: user.id,
    email,
    success: true,
    ipAddress: command.ipAddress ?? null,
    userAgent: command.userAgent ?? null,
    reason: null,
  });

  return ok({
    session: {
      userId: user.id,
      email: user.email,
      role: user.role,
      // Socle du role + attributions individuelles : c'est ici que les deux se
      // combinent, une seule fois, au moment de la connexion.
      permissions: resolvePermissions(user.role, user.rolePermissions, user.permissionOverrides),
      employeeId: user.employeeId,
      displayName: user.displayName,
    },
    mustChangePassword: user.mustChangePassword,
  });
}
