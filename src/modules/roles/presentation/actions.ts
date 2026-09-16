"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAudit } from "@/infrastructure/auth/audit";
import { authorizeAction } from "@/infrastructure/auth/dal";
import { PERMISSIONS, type RoleName } from "@/modules/auth/domain/permissions";
import type { PermissionMatrixState } from "@/modules/auth/presentation/permission-matrix";
import type { SerializedDomainError } from "@/shared/domain/errors";

import {
  createRole,
  deleteRole,
  updateRoleInfo,
  updateRolePermissions,
} from "../application/role-use-cases";
import { prismaRoleRepository } from "../infrastructure/prisma-role-repository";

/**
 * Server Action du module roles.
 *
 * Modifier un role touche tous ses titulaires d'un coup : c'est l'ecriture la
 * plus lourde de consequences de l'application. D'ou `authorizeAction`, qui
 * recharge l'auteur depuis la base, et une entree d'audit qui garde le detail
 * du mouvement et le nombre de comptes concernes.
 */

/**
 * Les roles ne sont plus une enumeration figee : ils se creent depuis /roles.
 * On verifie donc seulement la FORME de l'identifiant ; l'existence reelle est
 * tranchee par le repository, seul a connaitre les roles enregistres.
 */
function isRoleName(value: string): value is RoleName {
  return /^[A-Z][A-Z0-9_]*$/.test(value);
}

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null
  );
}

export interface RoleFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

function toFormState(
  error: SerializedDomainError,
  values: Record<string, string>,
): RoleFormState {
  return {
    message: error.field ? undefined : error.message,
    fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
    values,
  };
}

function readValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/**
 * Cree un role.
 *
 * L'identifiant technique est derive du libelle : l'utilisateur nomme
 * « Responsable caisse », le systeme retient `RESPONSABLE_CAISSE`. C'est cet
 * identifiant qui apparait dans les journaux d'audit et dans les URL, et il ne
 * bougera plus meme si le libelle est reformule.
 */
export async function createRoleAction(
  _previousState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const actor = await authorizeAction(PERMISSIONS.ROLES_MANAGE);
  const values = readValues(formData);

  const permissions = formData
    .getAll("permissions")
    .filter((value): value is string => typeof value === "string");

  const result = await createRole(prismaRoleRepository, {
    label: values.label ?? "",
    description: values.description ?? null,
    name: values.name || undefined,
    permissions,
  });

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: actor.id,
    action: "ROLE_CREATE",
    entityType: "Role",
    entityId: result.value,
    after: { label: values.label, permissions: permissions.length },
    ipAddress: await clientIp(),
  });

  revalidatePath("/roles");
  redirect(`/roles/${result.value}`);
}

/** Renomme un rôle. L'identifiant technique, lui, ne change jamais. */
export async function updateRoleInfoAction(
  roleName: string,
  _previousState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const actor = await authorizeAction(PERMISSIONS.ROLES_MANAGE);
  const values = readValues(formData);

  if (!isRoleName(roleName)) {
    return { message: "Ce rôle n'existe pas.", values };
  }

  const result = await updateRoleInfo(prismaRoleRepository, {
    name: roleName,
    label: values.label ?? "",
    description: values.description ?? null,
  });

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: actor.id,
    action: "ROLE_UPDATE",
    entityType: "Role",
    entityId: roleName,
    after: { label: values.label },
    ipAddress: await clientIp(),
  });

  revalidatePath("/roles");
  revalidatePath(`/roles/${roleName}`);
  redirect(`/roles/${roleName}`);
}

/**
 * Supprime un rôle créé. Les rôles système et les rôles portés sont protégés.
 *
 * L'identifiant voyage dans le formulaire : le bouton fonctionne alors même
 * sans JavaScript, la soumission étant traitée nativement par le navigateur.
 */
export async function deleteRoleAction(
  _previousState: RoleFormState,
  formData: FormData,
): Promise<RoleFormState> {
  const actor = await authorizeAction(PERMISSIONS.ROLES_MANAGE);

  const roleName = String(formData.get("name") ?? "");
  if (!isRoleName(roleName)) {
    return { message: "Ce rôle n'existe pas." };
  }

  const result = await deleteRole(prismaRoleRepository, {
    actor: { id: actor.id, role: actor.role },
    name: roleName,
  });

  if (!result.ok) {
    return { message: result.error.message };
  }

  await recordAudit({
    userId: actor.id,
    action: "ROLE_DELETE",
    entityType: "Role",
    entityId: roleName,
    ipAddress: await clientIp(),
  });

  revalidatePath("/roles");
  redirect("/roles");
}

export async function updateRolePermissionsAction(
  roleName: string,
  _previousState: PermissionMatrixState,
  formData: FormData,
): Promise<PermissionMatrixState> {
  const actor = await authorizeAction(PERMISSIONS.ROLES_MANAGE);

  if (!isRoleName(roleName)) {
    return { message: "Ce rôle n'existe pas.", tone: "danger" };
  }

  const desired = formData
    .getAll("permissions")
    .filter((value): value is string => typeof value === "string");

  const result = await updateRolePermissions(prismaRoleRepository, {
    actor: { id: actor.id, role: actor.role },
    role: roleName,
    desired,
  });

  if (!result.ok) {
    return { message: result.error.message, tone: "danger" };
  }

  const { added, removed, affectedUsers } = result.value;

  if (added.length === 0 && removed.length === 0) {
    return { message: "Aucun changement : le socle était déjà celui-là.", tone: "success" };
  }

  await recordAudit({
    userId: actor.id,
    action: "ROLE_PERMISSIONS_UPDATE",
    entityType: "Role",
    entityId: roleName,
    before: { retirees: removed },
    after: { accordees: added },
    ipAddress: await clientIp(),
  });

  revalidatePath("/roles");
  revalidatePath(`/roles/${roleName}`);
  revalidatePath("/utilisateurs");

  const mouvements = [
    added.length > 0 ? `${added.length} droit${added.length > 1 ? "s" : ""} ajouté${added.length > 1 ? "s" : ""}` : null,
    removed.length > 0 ? `${removed.length} droit${removed.length > 1 ? "s" : ""} retiré${removed.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  return {
    message:
      `${mouvements.join(", ")}. ` +
      (affectedUsers > 0
        ? `${affectedUsers} compte${affectedUsers > 1 ? "s sont concernés" : " est concerné"} dès leur prochaine page ouverte.`
        : "Aucun compte ne porte encore ce rôle."),
    tone: "success",
  };
}
