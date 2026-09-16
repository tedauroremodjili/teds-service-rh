/**
 * Cas d'usage du module roles (module 1 — administration).
 *
 * Modifier un role, c'est modifier les droits de tous ses titulaires d'un coup.
 * Les garde-fous sont donc plus stricts que pour une attribution individuelle.
 */

import {
  isPermission,
  isSystemRole,
  isWildcardRole,
  ROLE_LABELS,
  toRoleName,
  type RoleName,
} from "@/modules/auth/domain/permissions";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import type { RoleOption, RoleRepository, RoleSummary } from "../domain/role-repository";

export async function listRoles(repository: RoleRepository): Promise<RoleSummary[]> {
  return repository.list();
}

export async function getRole(
  repository: RoleRepository,
  name: string,
): Promise<Result<RoleSummary>> {
  const role = await repository.findByName(name as RoleName);

  if (!role) {
    return fail(DomainError.notFound("Ce rôle n'existe pas."));
  }

  return ok(role);
}

export async function listRoleOptions(repository: RoleRepository): Promise<RoleOption[]> {
  return repository.options();
}

/* -------------------------------------------------------------------------- */
/* Creation, modification, suppression                                         */
/* -------------------------------------------------------------------------- */

export interface CreateRoleCommand {
  label: string;
  description: string | null;
  /** Identifiant technique ; derive du libelle s'il n'est pas fourni. */
  name?: string;
  permissions: readonly string[];
}

/**
 * Cree un role.
 *
 * L'identifiant technique est derive du libelle (« Responsable caisse » →
 * `RESPONSABLE_CAISSE`) : il sert de cle stable dans les journaux d'audit et
 * les URL, alors que le libelle peut etre reformule sans consequence.
 */
export async function createRole(
  repository: RoleRepository,
  command: CreateRoleCommand,
): Promise<Result<RoleName>> {
  const label = command.label.trim();

  if (label.length < 3) {
    return fail(
      DomainError.validation("Le nom du rôle doit faire au moins 3 caractères.", "label"),
    );
  }

  const name = toRoleName(command.name?.trim() || label);

  if (name.length === 0) {
    return fail(
      DomainError.validation(
        "Ce nom ne produit aucun identifiant valide. Utilisez des lettres.",
        "label",
      ),
    );
  }

  if (isSystemRole(name)) {
    return fail(
      DomainError.conflict(
        `« ${name} » est un rôle du système : choisissez un autre nom.`,
        "label",
      ),
    );
  }

  const inconnues = command.permissions.filter((code) => !isPermission(code));
  if (inconnues.length > 0) {
    return fail(
      DomainError.validation(
        `Permission inconnue : ${inconnues.join(", ")}.`,
        "permissions",
        "PERMISSION_INCONNUE",
      ),
    );
  }

  return repository.create({
    name,
    label,
    description: command.description?.trim() || null,
    permissions: command.permissions,
  });
}

export interface UpdateRoleInfoCommand {
  name: RoleName;
  label: string;
  description: string | null;
}

/**
 * Renomme un role. L'identifiant technique, lui, ne bouge pas : il est cite
 * dans les journaux d'audit et dans les comptes deja rattaches.
 */
export async function updateRoleInfo(
  repository: RoleRepository,
  command: UpdateRoleInfoCommand,
): Promise<Result<void>> {
  const label = command.label.trim();

  if (label.length < 3) {
    return fail(
      DomainError.validation("Le nom du rôle doit faire au moins 3 caractères.", "label"),
    );
  }

  const role = await repository.findByName(command.name);
  if (!role) {
    return fail(DomainError.notFound("Ce rôle n'existe pas."));
  }

  return repository.updateInfo(command.name, {
    label,
    description: command.description?.trim() || null,
  });
}

export interface DeleteRoleCommand {
  actor: { id: string; role: RoleName };
  name: RoleName;
}

/**
 * Supprime un role.
 *
 * Trois refus : un role systeme fait partie du socle du produit ; un role
 * encore porte par des comptes les laisserait sans droits ; et on ne supprime
 * pas le role sous lequel on travaille.
 */
export async function deleteRole(
  repository: RoleRepository,
  command: DeleteRoleCommand,
): Promise<Result<void>> {
  const role = await repository.findByName(command.name);
  if (!role) {
    return fail(DomainError.notFound("Ce rôle n'existe pas."));
  }

  if (role.isSystem) {
    return fail(
      DomainError.businessRule(
        `« ${role.label} » est un rôle du système : il ne se supprime pas. Vous pouvez en revanche vider son socle de droits.`,
        "ROLE_SYSTEME",
      ),
    );
  }

  if (command.actor.role === command.name) {
    return fail(
      DomainError.businessRule(
        "Vous ne pouvez pas supprimer le rôle sous lequel vous travaillez.",
        "AUTO_SUPPRESSION",
      ),
    );
  }

  if (role.userCount > 0) {
    return fail(
      DomainError.businessRule(
        `${role.userCount} compte${role.userCount > 1 ? "s portent" : " porte"} ce rôle. Réaffectez-${role.userCount > 1 ? "les" : "le"} avant de le supprimer.`,
        "ROLE_UTILISE",
      ),
    );
  }

  return repository.remove(command.name);
}

export interface UpdateRolePermissionsCommand {
  actor: { id: string; role: RoleName };
  role: RoleName;
  /** Liste complete des permissions souhaitees pour ce role. */
  desired: readonly string[];
}

export interface RoleChange {
  added: string[];
  removed: string[];
  /** Comptes concernes par le changement. */
  affectedUsers: number;
}

/**
 * Redefinit le socle d'un role.
 *
 * Trois refus, tous destines a garder le systeme administrable :
 *
 * 1. On ne modifie pas son propre role — sinon la permission « attribuer les
 *    droits » suffirait a s'octroyer tout le reste.
 * 2. Le role joker (super administrateur) n'a pas de socle a editer : il
 *    detient tout par construction.
 * 3. Un code de permission inconnu est refuse, pas ignore : il trahit un
 *    formulaire falsifie ou un catalogue desynchronise.
 */
export async function updateRolePermissions(
  repository: RoleRepository,
  command: UpdateRolePermissionsCommand,
): Promise<Result<RoleChange>> {
  if (command.actor.role === command.role) {
    return fail(
      DomainError.businessRule(
        "Vous ne pouvez pas modifier les droits de votre propre rôle. Demandez à un autre administrateur.",
        "AUTO_ATTRIBUTION",
      ),
    );
  }

  if (isWildcardRole(command.role)) {
    return fail(
      DomainError.businessRule(
        `Le rôle « ${ROLE_LABELS[command.role]} » détient tous les droits par construction : son socle ne s'édite pas.`,
        "ROLE_JOKER",
      ),
    );
  }

  const role = await repository.findByName(command.role);
  if (!role) {
    return fail(DomainError.notFound("Ce rôle n'existe pas."));
  }

  const inconnues = command.desired.filter((code) => !isPermission(code));
  if (inconnues.length > 0) {
    return fail(
      DomainError.validation(
        `Permission inconnue : ${inconnues.join(", ")}.`,
        "permissions",
        "PERMISSION_INCONNUE",
      ),
    );
  }

  const avant = new Set(role.permissions);
  const apres = new Set(command.desired);

  const added = [...apres].filter((code) => !avant.has(code));
  const removed = [...avant].filter((code) => !apres.has(code));

  const ecriture = await repository.replacePermissions(
    command.role,
    [...apres],
    command.actor.id,
  );
  if (!ecriture.ok) return ecriture;

  return ok({ added, removed, affectedUsers: role.userCount });
}
