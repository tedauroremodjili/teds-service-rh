/**
 * Cas d'usage du module users (module 1 — administration des comptes).
 *
 * Chaque fonction represente une intention complete : « attribuer des droits a
 * cet utilisateur », « changer son role », « suspendre son compte ». Elles ne
 * connaissent que le port UserRepository, jamais Prisma.
 */

import { Email, validatePasswordPolicy } from "@/modules/auth/domain/credentials";
import {
  isWildcardRole,
  resolvePermissions,
  type PermissionOverride,
  type RoleName,
} from "@/modules/auth/domain/permissions";
import { DomainError } from "@/shared/domain/errors";
import type { Page, PaginationParams } from "@/shared/domain/pagination";
import { fail, ok, type Result } from "@/shared/domain/result";

import {
  buildOverrides,
  ensureCanAssignRole,
  ensureCanChangeRole,
  ensureCanEditPermissions,
  type AccountIdentity,
  type UserStatus,
} from "../domain/user-account";
import type {
  UserDetail,
  UserFilters,
  UserListItem,
  UserRepository,
} from "../domain/user-repository";

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

export async function listUsers(
  repository: UserRepository,
  filters: UserFilters,
  pagination: PaginationParams,
): Promise<Page<UserListItem>> {
  return repository.list(filters, pagination);
}

/** Fiche d'un compte, enrichie de ses droits effectifs. */
export interface UserAccess {
  user: UserDetail;
  /** Droits venant du role, avant toute attribution individuelle. */
  fromRole: string[];
  /** Droits reellement detenus : role + ajouts − retraits. */
  effective: string[];
}

export async function getUserAccess(
  repository: UserRepository,
  id: string,
): Promise<Result<UserAccess>> {
  const user = await repository.findById(id);

  if (!user) {
    return fail(DomainError.notFound("Ce compte utilisateur n'existe pas."));
  }

  return ok({
    user,
    fromRole: user.rolePermissions,
    effective: resolvePermissions(user.role, user.rolePermissions, user.overrides),
  });
}

/* -------------------------------------------------------------------------- */
/* Attribution des droits                                                      */
/* -------------------------------------------------------------------------- */

export interface UpdatePermissionsCommand {
  actor: AccountIdentity;
  targetId: string;
  /** Liste complete des droits souhaites pour ce compte (cases cochees). */
  desired: readonly string[];
}

/** Ce qui a change, pour le journal d'audit et le message de retour. */
export interface PermissionChange {
  added: string[];
  removed: string[];
  overrides: PermissionOverride[];
}

/**
 * Attribue a un utilisateur precis l'ensemble des droits qu'on veut lui voir
 * detenir. Le role reste le socle : seule la difference est enregistree.
 */
export async function updateUserPermissions(
  repository: UserRepository,
  command: UpdatePermissionsCommand,
): Promise<Result<PermissionChange>> {
  const target = await repository.findById(command.targetId);
  if (!target) {
    return fail(DomainError.notFound("Ce compte utilisateur n'existe pas."));
  }

  const autorisation = ensureCanEditPermissions(command.actor, {
    id: target.id,
    role: target.role,
  });
  if (!autorisation.ok) return autorisation;

  const overridesResult = buildOverrides(target.rolePermissions, command.desired);
  if (!overridesResult.ok) return overridesResult;

  const overrides = overridesResult.value;

  // On compare l'avant et l'apres pour ne journaliser que le mouvement reel :
  // un enregistrement sans changement ne doit pas polluer l'audit.
  const avant = new Set(resolvePermissions(target.role, target.rolePermissions, target.overrides));
  const apres = new Set(resolvePermissions(target.role, target.rolePermissions, overrides));

  const added = [...apres].filter((permission) => !avant.has(permission));
  const removed = [...avant].filter((permission) => !apres.has(permission));

  const ecriture = await repository.replaceOverrides(target.id, overrides, command.actor.id);
  if (!ecriture.ok) return ecriture;

  return ok({ added, removed, overrides });
}

/* -------------------------------------------------------------------------- */
/* Creation d'un compte                                                        */
/* -------------------------------------------------------------------------- */

export interface CreateUserCommand {
  actor: AccountIdentity;
  email: string;
  password: string;
  role: RoleName;
  /** Employe a rattacher, si le compte correspond a un membre du personnel. */
  employeeId: string | null;
  /** Exiger un changement de mot de passe a la premiere connexion. */
  mustChangePassword: boolean;
}

/**
 * Ouvre un acces a quelqu'un.
 *
 * Le mot de passe est hache par une dependance injectee : le cas d'usage ne
 * connait ni bcrypt ni son cout, et reste testable sans rien hacher. Il ne
 * conserve jamais le mot de passe en clair au-dela de cet appel.
 */
export async function createUserAccount(
  repository: UserRepository,
  hashPassword: (plain: string) => Promise<string>,
  command: CreateUserCommand,
): Promise<Result<string>> {
  const email = Email.create(command.email);
  if (!email.ok) return email;

  const motDePasse = validatePasswordPolicy(command.password);
  if (!motDePasse.ok) return motDePasse;

  const autorisation = ensureCanAssignRole(command.actor, command.role);
  if (!autorisation.ok) return autorisation;

  const passwordHash = await hashPassword(motDePasse.value);

  return repository.create({
    email: email.value.value,
    passwordHash,
    role: command.role,
    employeeId: command.employeeId,
    mustChangePassword: command.mustChangePassword,
  });
}

/* -------------------------------------------------------------------------- */
/* Modification d'un compte                                                    */
/* -------------------------------------------------------------------------- */

export interface UpdateUserCommand {
  actor: AccountIdentity;
  targetId: string;
  email: string;
  employeeId: string | null;
  mustChangePassword: boolean;
  /** Vide = on ne touche pas au mot de passe. */
  newPassword?: string;
}

/**
 * Modifie les coordonnees d'un compte, et son mot de passe si un nouveau est
 * fourni.
 *
 * Le mot de passe n'est jamais lu ni renvoye : on ne peut que le REMPLACER.
 * C'est la seule facon honnete de gerer un secret dont l'administrateur ne doit
 * pas connaitre la valeur.
 */
export async function updateUserAccount(
  repository: UserRepository,
  hashPassword: (plain: string) => Promise<string>,
  command: UpdateUserCommand,
): Promise<Result<{ passwordChanged: boolean }>> {
  const target = await repository.findById(command.targetId);
  if (!target) {
    return fail(DomainError.notFound("Ce compte utilisateur n'existe pas."));
  }

  const email = Email.create(command.email);
  if (!email.ok) return email;

  const nouveau = command.newPassword?.trim() ?? "";
  let passwordHash: string | null = null;

  if (nouveau.length > 0) {
    const politique = validatePasswordPolicy(nouveau);
    if (!politique.ok) return politique;
    passwordHash = await hashPassword(politique.value);
  }

  const ecriture = await repository.updateAccount(target.id, {
    email: email.value.value,
    employeeId: command.employeeId,
    mustChangePassword: command.mustChangePassword,
  });
  if (!ecriture.ok) return ecriture;

  if (passwordHash) {
    const remplacement = await repository.replacePassword(target.id, passwordHash);
    if (!remplacement.ok) return remplacement;
  }

  return ok({ passwordChanged: passwordHash !== null });
}

export interface ArchiveUserCommand {
  actor: AccountIdentity;
  targetId: string;
}

/**
 * Archive un compte : il ne peut plus se connecter et sort des listes.
 * On n'archive pas le sien — ce serait se fermer la porte de l'exterieur.
 */
export async function archiveUserAccount(
  repository: UserRepository,
  command: ArchiveUserCommand,
): Promise<Result<void>> {
  if (command.actor.id === command.targetId) {
    return fail(
      DomainError.businessRule(
        "Vous ne pouvez pas archiver votre propre compte.",
        "AUTO_ARCHIVAGE",
      ),
    );
  }

  const target = await repository.findById(command.targetId);
  if (!target) {
    return fail(DomainError.notFound("Ce compte utilisateur n'existe pas."));
  }

  if (isWildcardRole(target.role) && !isWildcardRole(command.actor.role)) {
    return fail(
      DomainError.businessRule(
        "Seul un super administrateur peut archiver un autre super administrateur.",
        "PRIVILEGE_INSUFFISANT",
      ),
    );
  }

  return repository.archive(target.id);
}

/* -------------------------------------------------------------------------- */
/* Role et statut                                                              */
/* -------------------------------------------------------------------------- */

export interface ChangeRoleCommand {
  actor: AccountIdentity;
  targetId: string;
  role: RoleName;
}

/**
 * Change le role d'un compte.
 *
 * Les attributions individuelles sont effacees au passage : elles avaient ete
 * decidees par rapport a l'ancien socle. « Ce commercial peut aussi encaisser »
 * n'a plus de sens quand il devient comptable, et conserver l'ecart
 * produirait des droits que personne n'a explicitement voulus.
 */
export async function changeUserRole(
  repository: UserRepository,
  command: ChangeRoleCommand,
): Promise<Result<{ previousRole: RoleName }>> {
  const target = await repository.findById(command.targetId);
  if (!target) {
    return fail(DomainError.notFound("Ce compte utilisateur n'existe pas."));
  }

  if (target.role === command.role) {
    return fail(DomainError.businessRule("Ce compte a déjà ce rôle.", "AUCUN_CHANGEMENT"));
  }

  const autorisation = ensureCanChangeRole(
    command.actor,
    { id: target.id, role: target.role },
    command.role,
  );
  if (!autorisation.ok) return autorisation;

  const changement = await repository.changeRole(target.id, command.role);
  if (!changement.ok) return changement;

  const remiseAZero = await repository.replaceOverrides(target.id, [], command.actor.id);
  if (!remiseAZero.ok) return remiseAZero;

  return ok({ previousRole: target.role });
}

export interface ChangeStatusCommand {
  actor: AccountIdentity;
  targetId: string;
  status: UserStatus;
}

export async function changeUserStatus(
  repository: UserRepository,
  command: ChangeStatusCommand,
): Promise<Result<void>> {
  if (command.actor.id === command.targetId) {
    return fail(
      DomainError.businessRule(
        "Vous ne pouvez pas désactiver votre propre compte.",
        "AUTO_DESACTIVATION",
      ),
    );
  }

  const target = await repository.findById(command.targetId);
  if (!target) {
    return fail(DomainError.notFound("Ce compte utilisateur n'existe pas."));
  }

  return repository.setStatus(target.id, command.status);
}
