/**
 * Cas d'usage du moteur de ressources.
 *
 * Ils orchestrent toujours la meme sequence — valider, calculer, verifier la
 * coherence, ecrire — quel que soit l'ecran appele. Le catalogue fournit les
 * regles ; ces fonctions n'en inventent aucune.
 */

import { DomainError } from "@/shared/domain/errors";
import type { Page, PaginationParams } from "@/shared/domain/pagination";
import { fail, ok, type Result } from "@/shared/domain/result";

import type { FieldOption } from "../domain/field";
import {
  applyComputations,
  checkConsistency,
  formFields,
  parseResourceInput,
  type ResourceDefinition,
} from "../domain/resource";
import type {
  ResourceFilters,
  ResourceRepository,
  ResourceRow,
} from "../domain/resource-repository";

export async function listResource(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  filters: ResourceFilters,
  pagination: PaginationParams,
): Promise<Page<ResourceRow>> {
  return repository.list(definition, filters, pagination);
}

export async function getResource(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  id: string,
): Promise<Result<ResourceRow>> {
  const row = await repository.findById(definition, id);

  if (!row) {
    return fail(
      DomainError.notFound(
        `${definition.singular} introuvable : l'élément a été supprimé ou l'adresse est erronée.`,
      ),
    );
  }

  return ok(row);
}

/** Prepare les donnees a ecrire : conversion, calculs, coherence. */
function prepare(
  definition: ResourceDefinition,
  values: Record<string, string | undefined>,
): Result<Record<string, unknown>> {
  const parsed = parseResourceInput(definition, values);
  if (!parsed.ok) return parsed;

  const computed = applyComputations(definition, parsed.value);

  const coherent = checkConsistency(computed);
  if (!coherent.ok) return coherent;

  return ok(computed);
}

export async function createResource(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  values: Record<string, string | undefined>,
): Promise<Result<string>> {
  const data = prepare(definition, values);
  if (!data.ok) return data;

  return repository.create(definition, data.value);
}

export async function updateResource(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  id: string,
  values: Record<string, string | undefined>,
): Promise<Result<void>> {
  const data = prepare(definition, values);
  if (!data.ok) return data;

  const existant = await repository.findById(definition, id);
  if (!existant) {
    return fail(DomainError.notFound(`${definition.singular} introuvable.`));
  }

  return repository.update(definition, id, data.value);
}

export async function removeResource(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  id: string,
): Promise<Result<void>> {
  return repository.remove(definition, id);
}

/* -------------------------------------------------------------------------- */
/* Contexte des formulaires                                                    */
/* -------------------------------------------------------------------------- */

export interface FormContext {
  /** Contenu des listes deroulantes, par nom de champ. */
  options: Record<string, FieldOption[]>;
  /** Valeurs proposees a la creation (références et jetons compris). */
  defaults: Record<string, string>;
}

/**
 * Rassemble ce dont le formulaire a besoin en une seule fois.
 *
 * Les listes deroulantes sont chargees en parallele : une commande de
 * prestation en compte quatre, et les enchainer multiplierait le temps
 * d'affichage pour rien.
 */
export async function buildFormContext(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  mode: "creation" | "modification",
): Promise<FormContext> {
  const champs = formFields(definition);

  const relations = champs.filter((field) => field.kind === "relation" && field.relation);
  const chargements = await Promise.all(
    relations.map(async (field) => [field.name, await repository.optionsFor(field)] as const),
  );

  const defaults: Record<string, string> = {};

  if (mode === "creation") {
    for (const field of champs) {
      if (field.defaultValue) defaults[field.name] = field.defaultValue;
    }

    // Les valeurs auto-generees ne sont proposees qu'a la creation : regenerer
    // une reference ou un matricule en modification casserait le lien avec les
    // pieces deja imprimees et avec l'historique.
    const auto = champs.filter((field) => field.autoValue);
    for (const field of auto) {
      defaults[field.name] =
        field.autoValue === "token"
          ? repository.newToken()
          : await repository.nextSequence(definition, field);
    }

    // Une date obligatoire est presque toujours « aujourd'hui » : la proposer
    // evite une saisie sur chaque enregistrement.
    for (const field of champs) {
      if (field.required && (field.kind === "date" || field.kind === "datetime")) {
        defaults[field.name] ??= todayValue(field.kind);
      }
    }
  }

  return {
    options: Object.fromEntries(chargements),
    defaults,
  };
}

/** Valeur du jour au format attendu par les controles HTML. */
function todayValue(kind: "date" | "datetime"): string {
  const maintenant = new Date();
  const iso = new Date(maintenant.getTime() - maintenant.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

  return kind === "date" ? iso.slice(0, 10) : iso;
}
