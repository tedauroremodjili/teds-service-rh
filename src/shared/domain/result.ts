/**
 * Result — le type de retour de toutes les operations metier.
 *
 * Pourquoi ne pas simplement lancer des exceptions ? Parce qu'une regle de
 * gestion violee (« ce matricule existe deja ») n'est pas un bug : c'est un
 * resultat normal que l'appelant doit traiter. On la represente donc dans le
 * type de retour, ce qui force TypeScript a verifier que le cas d'echec est
 * gere. Les exceptions restent reservees aux pannes techniques.
 */

import type { DomainError } from "./errors";

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DomainError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(error: DomainError): Result<T> {
  return { ok: false, error };
}

/** Vrai si tous les resultats sont des succes. Utile pour valider en lot. */
export function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok;
}

/**
 * Rassemble plusieurs Result en un seul.
 * Renvoie la premiere erreur rencontree, sinon le tableau des valeurs.
 */
export function combine<T>(results: Result<T>[]): Result<T[]> {
  const values: T[] = [];

  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }

  return ok(values);
}
