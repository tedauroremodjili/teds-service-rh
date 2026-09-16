"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAudit } from "@/infrastructure/auth/audit";
import { authorizeAction } from "@/infrastructure/auth/dal";
import {
  PERMISSIONS,
  type RoleName,
} from "@/modules/auth/domain/permissions";
import { hashPassword } from "@/modules/auth/infrastructure/password-hasher";

import {
  archiveUserAccount,
  changeUserRole,
  changeUserStatus,
  createUserAccount,
  updateUserAccount,
  updateUserPermissions,
} from "../application/user-use-cases";
import { isUserStatus } from "../domain/user-account";
import { prismaUserRepository } from "../infrastructure/prisma-user-repository";

/**
 * Server Actions du module users.
 *
 * Ce sont les actions les plus sensibles de l'application : elles distribuent
 * les droits. Chacune commence donc par `authorizeAction(ROLES_MANAGE)`, qui
 * recharge l'utilisateur depuis la base — le formulaire affiche ne prouve rien,
 * une Server Action etant joignable par un POST direct. Chacune se termine par
 * une entree d'audit : « qui a donne quoi a qui, et quand ».
 */

export interface AccessFormState {
  message?: string;
  tone?: "success" | "danger";
}

export interface NewUserFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
}

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null
  );
}

/**
 * Les roles ne sont plus une enumeration figee : ils se creent depuis /roles.
 * On verifie donc seulement la FORME de l'identifiant ; l'existence reelle est
 * tranchee par le repository, seul a connaitre les roles enregistres.
 */
function isRoleName(value: string): value is RoleName {
  return /^[A-Z][A-Z0-9_]*$/.test(value);
}

/**
 * Ouvre un compte a quelqu'un.
 *
 * C'est le point d'entree de tout acces au systeme : rien n'est plus sensible.
 * `authorizeAction` recharge donc l'auteur depuis la base, et l'audit garde le
 * role attribue — jamais le mot de passe, meme hache.
 */
export async function createUserAction(
  _previousState: NewUserFormState,
  formData: FormData,
): Promise<NewUserFormState> {
  const actor = await authorizeAction(PERMISSIONS.USERS_MANAGE);

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "password") values[key] = value;
  }

  const role = String(formData.get("role") ?? "");
  if (!isRoleName(role)) {
    return { message: "Ce rôle n'existe pas.", values };
  }

  const result = await createUserAccount(prismaUserRepository, hashPassword, {
    actor: { id: actor.id, role: actor.role },
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    role,
    employeeId: String(formData.get("employeeId") ?? "") || null,
    mustChangePassword: formData.get("mustChangePassword") === "on",
  });

  if (!result.ok) {
    const error = result.error.toJSON();
    return {
      message: error.field ? undefined : error.message,
      fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
      values,
    };
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_CREATE",
    entityType: "User",
    entityId: result.value,
    after: { email: values.email, role },
    ipAddress: await clientIp(),
  });

  revalidatePath("/utilisateurs");
  redirect(`/utilisateurs/${result.value}`);
}

/**
 * Modifie un compte : email, rattachement, exigence de mot de passe, et
 * remplacement facultatif du mot de passe.
 */
export async function updateUserAction(
  userId: string,
  _previousState: NewUserFormState,
  formData: FormData,
): Promise<NewUserFormState> {
  const actor = await authorizeAction(PERMISSIONS.USERS_MANAGE);

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && key !== "newPassword") values[key] = value;
  }

  const result = await updateUserAccount(prismaUserRepository, hashPassword, {
    actor: { id: actor.id, role: actor.role },
    targetId: userId,
    email: String(formData.get("email") ?? ""),
    employeeId: String(formData.get("employeeId") ?? "") || null,
    mustChangePassword: formData.get("mustChangePassword") === "on",
    newPassword: String(formData.get("newPassword") ?? ""),
  });

  if (!result.ok) {
    const error = result.error.toJSON();
    return {
      message: error.field ? undefined : error.message,
      fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
      values,
    };
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_UPDATE",
    entityType: "User",
    entityId: userId,
    // Jamais le mot de passe, meme hache : on note seulement qu'il a change.
    after: { email: values.email, motDePasseRemplace: result.value.passwordChanged },
    ipAddress: await clientIp(),
  });

  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${userId}`);
  redirect(`/utilisateurs/${userId}`);
}

/**
 * Archive un compte : il sort des listes et ne peut plus se connecter.
 * L'identifiant voyage dans le formulaire, pour que le bouton fonctionne aussi
 * sans JavaScript.
 */
export async function archiveUserAction(
  _previousState: AccessFormState,
  formData: FormData,
): Promise<AccessFormState> {
  const actor = await authorizeAction(PERMISSIONS.USERS_MANAGE);

  const userId = String(formData.get("id") ?? "");
  if (!userId) {
    return { message: "Compte introuvable.", tone: "danger" };
  }

  const result = await archiveUserAccount(prismaUserRepository, {
    actor: { id: actor.id, role: actor.role },
    targetId: userId,
  });

  if (!result.ok) {
    return { message: result.error.message, tone: "danger" };
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_ARCHIVE",
    entityType: "User",
    entityId: userId,
    ipAddress: await clientIp(),
  });

  revalidatePath("/utilisateurs");
  redirect("/utilisateurs");
}

/** Attribue a un utilisateur precis l'ensemble des droits coches a l'ecran. */
export async function updateUserPermissionsAction(
  userId: string,
  _previousState: AccessFormState,
  formData: FormData,
): Promise<AccessFormState> {
  const actor = await authorizeAction(PERMISSIONS.ROLES_MANAGE);

  // Les cases cochees arrivent toutes sous le meme nom : `getAll` les
  // rassemble. Aucune case cochee = retrait de tous les droits du role, ce qui
  // est une demande legitime et non un formulaire vide.
  const desired = formData
    .getAll("permissions")
    .filter((value): value is string => typeof value === "string");

  const result = await updateUserPermissions(prismaUserRepository, {
    actor: { id: actor.id, role: actor.role },
    targetId: userId,
    desired,
  });

  if (!result.ok) {
    return { message: result.error.message, tone: "danger" };
  }

  const { added, removed } = result.value;

  if (added.length === 0 && removed.length === 0) {
    return { message: "Aucun changement : les droits étaient déjà ceux-là.", tone: "success" };
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_PERMISSIONS_UPDATE",
    entityType: "User",
    entityId: userId,
    before: { retirees: removed },
    after: { accordees: added },
    ipAddress: await clientIp(),
  });

  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${userId}`);

  return {
    message: resumeChangement(added.length, removed.length),
    tone: "success",
  };
}

function resumeChangement(accordees: number, retirees: number): string {
  const morceaux: string[] = [];
  if (accordees > 0) {
    morceaux.push(`${accordees} droit${accordees > 1 ? "s" : ""} accordé${accordees > 1 ? "s" : ""}`);
  }
  if (retirees > 0) {
    morceaux.push(`${retirees} droit${retirees > 1 ? "s" : ""} retiré${retirees > 1 ? "s" : ""}`);
  }
  return `${morceaux.join(", ")}. La modification s'applique dès la prochaine page ouverte par l'utilisateur.`;
}

/** Change le role d'un compte. Les attributions individuelles sont remises a zero. */
export async function changeUserRoleAction(
  userId: string,
  _previousState: AccessFormState,
  formData: FormData,
): Promise<AccessFormState> {
  const actor = await authorizeAction(PERMISSIONS.ROLES_MANAGE);

  const role = String(formData.get("role") ?? "");
  if (!isRoleName(role)) {
    return { message: "Ce rôle n'existe pas.", tone: "danger" };
  }

  const result = await changeUserRole(prismaUserRepository, {
    actor: { id: actor.id, role: actor.role },
    targetId: userId,
    role,
  });

  if (!result.ok) {
    return { message: result.error.message, tone: "danger" };
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_ROLE_CHANGE",
    entityType: "User",
    entityId: userId,
    before: { role: result.value.previousRole },
    after: { role },
    ipAddress: await clientIp(),
  });

  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${userId}`);

  return {
    message: "Rôle modifié. Les droits attribués individuellement ont été remis à zéro.",
    tone: "success",
  };
}

/** Active, désactive ou suspend un compte. */
export async function changeUserStatusAction(
  userId: string,
  _previousState: AccessFormState,
  formData: FormData,
): Promise<AccessFormState> {
  const actor = await authorizeAction(PERMISSIONS.USERS_MANAGE);

  const status = String(formData.get("status") ?? "");
  if (!isUserStatus(status)) {
    return { message: "Ce statut n'existe pas.", tone: "danger" };
  }

  const result = await changeUserStatus(prismaUserRepository, {
    actor: { id: actor.id, role: actor.role },
    targetId: userId,
    status,
  });

  if (!result.ok) {
    return { message: result.error.message, tone: "danger" };
  }

  await recordAudit({
    userId: actor.id,
    action: "USER_STATUS_CHANGE",
    entityType: "User",
    entityId: userId,
    after: { status },
    ipAddress: await clientIp(),
  });

  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${userId}`);

  return { message: `Compte ${status.toLowerCase()}.`, tone: "success" };
}
