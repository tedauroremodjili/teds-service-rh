/**
 * Regles du domaine « comptes utilisateurs » (module 1).
 *
 * Ce fichier ne connait ni Prisma, ni Next.js : il dit seulement qui a le droit
 * de toucher aux droits de qui, et ce qu'une attribution valide signifie.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import {
  diffFromBase,
  isPermission,
  isWildcardRole,
  ROLE_LABELS,
  type Permission,
  type PermissionOverride,
  type RoleName,
} from "@/modules/auth/domain/permissions";

export const USER_STATUSES = ["ACTIF", "INACTIF", "SUSPENDU"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  SUSPENDU: "Suspendu",
};

export function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}

/** Identite minimale necessaire pour arbitrer une modification de droits. */
export interface AccountIdentity {
  id: string;
  role: RoleName;
}

/**
 * Peut-on modifier les droits de ce compte ?
 *
 * Deux garde-fous, tous deux la pour eviter qu'on se tire une balle dans le
 * pied :
 *
 * 1. Le super administrateur detient le joker. Lui retirer une permission ne
 *    produirait rien de coherent (le joker couvre tout) et laisserait croire a
 *    une restriction effective. Ses droits ne se modifient donc pas au cas par
 *    cas — on change son role si l'on veut le restreindre.
 * 2. Personne ne modifie ses propres droits, meme avec la permission
 *    `roles.manage` : c'est ce qui distingue une attribution d'une
 *    auto-escalade, et cela evite aussi de se verrouiller soi-meme hors de
 *    l'administration.
 */
export function ensureCanEditPermissions(
  actor: AccountIdentity,
  target: AccountIdentity,
): Result<void> {
  if (actor.id === target.id) {
    return fail(
      DomainError.businessRule(
        "Vous ne pouvez pas modifier vos propres droits. Demandez à un autre administrateur.",
        "AUTO_ATTRIBUTION",
      ),
    );
  }

  if (isWildcardRole(target.role)) {
    return fail(
      DomainError.businessRule(
        `Le rôle « ${ROLE_LABELS[target.role]} » dispose de tous les droits : ils ne se modifient pas un par un. Changez son rôle pour le restreindre.`,
        "ROLE_JOKER",
      ),
    );
  }

  return ok(undefined);
}

/**
 * Qui peut attribuer quel role a la creation d'un compte.
 * Seul un super administrateur en cree un autre : c'est le seul role qui
 * detient le joker, donc le seul qui puisse le transmettre.
 */
export function ensureCanAssignRole(actor: AccountIdentity, nextRole: RoleName): Result<void> {
  if (!isWildcardRole(actor.role) && isWildcardRole(nextRole)) {
    return fail(
      DomainError.businessRule(
        "Seul un super administrateur peut créer un autre super administrateur.",
        "PRIVILEGE_INSUFFISANT",
      ),
    );
  }

  return ok(undefined);
}

/**
 * Meme arbitrage pour le changement de role : on ne se promeut pas soi-meme,
 * et on ne degrade pas un super administrateur par accident.
 */
export function ensureCanChangeRole(
  actor: AccountIdentity,
  target: AccountIdentity,
  nextRole: RoleName,
): Result<void> {
  if (actor.id === target.id) {
    return fail(
      DomainError.businessRule(
        "Vous ne pouvez pas modifier votre propre rôle.",
        "AUTO_ATTRIBUTION",
      ),
    );
  }

  if (!isWildcardRole(actor.role) && isWildcardRole(nextRole)) {
    return fail(
      DomainError.businessRule(
        "Seul un super administrateur peut nommer un autre super administrateur.",
        "PRIVILEGE_INSUFFISANT",
      ),
    );
  }

  if (!isWildcardRole(actor.role) && isWildcardRole(target.role)) {
    return fail(
      DomainError.businessRule(
        "Seul un super administrateur peut modifier le rôle d'un super administrateur.",
        "PRIVILEGE_INSUFFISANT",
      ),
    );
  }

  return ok(undefined);
}

/**
 * Transforme les cases cochees a l'ecran en ecarts a enregistrer.
 *
 * L'interface envoie la liste complete des droits souhaites ; on la compare au
 * socle du role pour n'ecrire en base que la difference. Un code inconnu est
 * refuse plutot qu'ignore silencieusement : il trahit soit un formulaire
 * falsifie, soit un catalogue desynchronise.
 */
export function buildOverrides(
  rolePermissions: readonly string[],
  desired: readonly string[],
): Result<PermissionOverride[]> {
  const inconnues = desired.filter((code) => !isPermission(code));

  if (inconnues.length > 0) {
    return fail(
      DomainError.validation(
        `Permission inconnue : ${inconnues.join(", ")}.`,
        "permissions",
        "PERMISSION_INCONNUE",
      ),
    );
  }

  return ok(diffFromBase(rolePermissions, desired as readonly Permission[]));
}
