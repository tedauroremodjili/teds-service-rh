/**
 * Regles metier de l'authentification (module 1 + section 7 « Securite »).
 * Aucune dependance technique : ces regles sont testables telles quelles.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

/** Nombre d'echecs tolerés avant verrouillage temporaire du compte. */
export const MAX_TENTATIVES = 5;

/** Duree du verrouillage apres depassement, en minutes. */
export const DUREE_VERROUILLAGE_MINUTES = 15;

/** Longueur minimale imposee aux mots de passe. */
export const LONGUEUR_MOT_DE_PASSE_MIN = 8;

export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Result<Email> {
    const normalized = raw.trim().toLowerCase();

    if (normalized.length === 0) {
      return fail(DomainError.validation("L'adresse email est obligatoire.", "email"));
    }
    // Verification volontairement simple : la seule preuve qu'une adresse est
    // valide reste l'envoi d'un message. On ecarte ici les fautes evidentes.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
      return fail(DomainError.validation("Cette adresse email n'est pas valide.", "email"));
    }

    return ok(new Email(normalized));
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Politique de mot de passe. Elle vit dans le domaine et non dans le formulaire,
 * car elle doit s'appliquer aussi aux creations de compte faites par un
 * administrateur ou par un script d'import.
 */
export function validatePasswordPolicy(password: string): Result<string> {
  if (password.length < LONGUEUR_MOT_DE_PASSE_MIN) {
    return fail(
      DomainError.validation(
        `Le mot de passe doit contenir au moins ${LONGUEUR_MOT_DE_PASSE_MIN} caractères.`,
        "password",
      ),
    );
  }
  if (!/[a-zA-Z]/.test(password)) {
    return fail(
      DomainError.validation("Le mot de passe doit contenir au moins une lettre.", "password"),
    );
  }
  if (!/[0-9]/.test(password)) {
    return fail(
      DomainError.validation("Le mot de passe doit contenir au moins un chiffre.", "password"),
    );
  }

  return ok(password);
}

/** Le compte est-il verrouille a cet instant ? */
export function isLocked(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/**
 * Calcule l'etat du compte apres un echec de connexion.
 * Au-dela du seuil, le compte est verrouille pour une duree fixe : cela ralentit
 * fortement une attaque par force brute sans bloquer definitivement un
 * utilisateur qui a simplement oublie son mot de passe.
 */
export function registerFailedAttempt(
  currentAttempts: number,
  now: Date = new Date(),
): { attempts: number; lockedUntil: Date | null } {
  const attempts = currentAttempts + 1;

  if (attempts >= MAX_TENTATIVES) {
    return {
      attempts,
      lockedUntil: new Date(now.getTime() + DUREE_VERROUILLAGE_MINUTES * 60_000),
    };
  }

  return { attempts, lockedUntil: null };
}

/** Minutes restantes avant deverrouillage, arrondies au superieur. */
export function minutesBeforeUnlock(lockedUntil: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000));
}
