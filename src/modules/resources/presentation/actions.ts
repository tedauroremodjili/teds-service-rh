"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAudit } from "@/infrastructure/auth/audit";
import { authorizeAction } from "@/infrastructure/auth/dal";
import type { SerializedDomainError } from "@/shared/domain/errors";

import {
  buildFormContext,
  createResource,
  removeResource,
  updateResource,
} from "../application/resource-use-cases";
import { findResource } from "../domain/catalog";
import type { ResourceDefinition } from "../domain/resource";
import { prismaResourceRepository } from "../infrastructure/prisma-resource-repository";

/**
 * Server Actions partagees par toutes les ressources.
 *
 * Elles recoivent la CLE de la ressource, pas sa definition : une Server Action
 * est appelee depuis le navigateur, et tout ce qui vient du navigateur doit
 * etre re-verifie sur le serveur. On relit donc le catalogue ici, puis on
 * exige la permission qu'il declare — un POST direct sur /contrats ne peut pas
 * emprunter les droits d'un autre ecran.
 */

export interface ResourceFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Valeurs saisies, renvoyees pour ne pas vider le formulaire. */
  values?: Record<string, string>;
}

function definitionOrThrow(key: string): ResourceDefinition {
  const definition = findResource(key);

  if (!definition) {
    throw new Error(`Ressource inconnue : « ${key} ».`);
  }

  return definition;
}

function toFormState(
  error: SerializedDomainError,
  values: Record<string, string>,
): ResourceFormState {
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

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null
  );
}

export async function createResourceAction(
  resourceKey: string,
  _previousState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const definition = definitionOrThrow(resourceKey);
  const user = await authorizeAction(definition.permissions.create);

  const values = readValues(formData);
  const result = await createResource(prismaResourceRepository, definition, values);

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: user.id,
    action: `${definition.model.toUpperCase()}_CREATE`,
    entityType: definition.model,
    entityId: result.value,
    after: values,
    ipAddress: await clientIp(),
  });

  revalidatePath(`/${definition.key}`);
  redirect(`/${definition.key}/${result.value}`);
}

export async function updateResourceAction(
  resourceKey: string,
  id: string,
  _previousState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const definition = definitionOrThrow(resourceKey);
  const user = await authorizeAction(definition.permissions.update);

  const values = readValues(formData);
  const result = await updateResource(prismaResourceRepository, definition, id, values);

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: user.id,
    action: `${definition.model.toUpperCase()}_UPDATE`,
    entityType: definition.model,
    entityId: id,
    after: values,
    ipAddress: await clientIp(),
  });

  revalidatePath(`/${definition.key}`);
  revalidatePath(`/${definition.key}/${id}`);
  redirect(`/${definition.key}/${id}`);
}

export interface QuickCreateState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
  /** Presente une fois la fiche creee : de quoi peupler le select appelant. */
  created?: { value: string; label: string };
}

/**
 * Cree une fiche depuis un AUTRE formulaire (« + Nouvel apprenant » sur
 * l'ecran Inscriptions) — memes regles metier et memes controles que la
 * creation normale (`createResourceAction`), mais sans redirection : la page
 * appelante reste ouverte, et selectionne elle-meme la fiche creee dans son
 * propre champ. Voir `FieldDefinition.quickCreate`.
 */
export async function quickCreateResourceAction(
  resourceKey: string,
  _previousState: QuickCreateState,
  formData: FormData,
): Promise<QuickCreateState> {
  const definition = definitionOrThrow(resourceKey);
  const user = await authorizeAction(definition.permissions.create);

  // Le formulaire rapide n'affiche que les champs simples obligatoires : les
  // champs auto-generes (reference, matricule, jeton) et les dates du jour ne
  // sont donc pas soumis. On les complete comme le ferait l'ecran de creation
  // normale, pour que la fiche cree exactement les memes valeurs.
  const { defaults } = await buildFormContext(prismaResourceRepository, definition, "creation");
  const values = { ...defaults, ...readValues(formData) };
  const result = await createResource(prismaResourceRepository, definition, values);

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: user.id,
    action: `${definition.model.toUpperCase()}_CREATE`,
    entityType: definition.model,
    entityId: result.value,
    after: values,
    ipAddress: await clientIp(),
  });

  revalidatePath(`/${definition.key}`);

  const label =
    definition.titleFields.map((champ) => values[champ]).filter(Boolean).join(" ") ||
    definition.singular;

  return { created: { value: result.value, label } };
}

/**
 * Suppression. L'identifiant voyage dans le formulaire plutot que dans la
 * fermeture : c'est ce qui permet au bouton de fonctionner meme sans
 * JavaScript, la soumission etant alors traitee nativement par le navigateur.
 */
export async function removeResourceAction(
  resourceKey: string,
  _previousState: ResourceFormState,
  formData: FormData,
): Promise<ResourceFormState> {
  const definition = definitionOrThrow(resourceKey);
  const user = await authorizeAction(definition.permissions.remove);

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return { message: "Élément introuvable." };
  }

  const result = await removeResource(prismaResourceRepository, definition, id);

  if (!result.ok) {
    // La suppression n'a pas de formulaire : on renvoie le message au bouton,
    // qui l'affiche tel quel.
    return { message: result.error.message };
  }

  await recordAudit({
    userId: user.id,
    action: `${definition.model.toUpperCase()}_${definition.softDelete ? "ARCHIVE" : "DELETE"}`,
    entityType: definition.model,
    entityId: id,
    ipAddress: await clientIp(),
  });

  revalidatePath(`/${definition.key}`);
  redirect(`/${definition.key}`);
}
