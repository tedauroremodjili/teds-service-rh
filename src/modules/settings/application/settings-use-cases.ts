/**
 * Cas d'usage du module 17 — parametres du systeme.
 *
 * L'ecran affiche l'union du catalogue et de la base : les parametres connus,
 * meme absents de la base (jamais renseignes), et ceux qui existent en base
 * sans etre au catalogue (ajoutes a la main). Personne ne se retrouve ainsi
 * avec un reglage invisible et donc immodifiable.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import {
  findSetting,
  inferKind,
  parseSettingValue,
  SETTINGS,
  toInputValue,
  type SettingDefinition,
  type SettingKind,
} from "../domain/catalog";
import { ordonnerCategories } from "../domain/setting";
import type { SettingsRepository } from "../domain/settings-repository";

/** Un parametre tel que l'ecran doit l'afficher. */
export interface EditableSetting {
  key: string;
  label: string;
  description: string | null;
  category: string;
  kind: SettingKind;
  placeholder?: string;
  /** Valeur prete pour un controle HTML. */
  value: string;
  /** Vrai si la cle n'a jamais ete enregistree. */
  isNew: boolean;
}

export interface SettingsGroup {
  category: string;
  settings: EditableSetting[];
}

export async function getEditableSettings(
  repository: SettingsRepository,
): Promise<SettingsGroup[]> {
  const stockes = await repository.list();
  const parCle = new Map(stockes.map((setting) => [setting.key, setting]));

  const editables: EditableSetting[] = SETTINGS.map((definition) => {
    const stocke = parCle.get(definition.key);

    return {
      key: definition.key,
      label: definition.label,
      description: definition.description ?? null,
      category: definition.category,
      kind: definition.kind,
      placeholder: definition.placeholder,
      value: toInputValue(definition.kind, stocke?.value),
      isNew: stocke === undefined,
    };
  });

  // Les cles presentes en base mais absentes du catalogue : on les affiche a la
  // suite plutot que de les ignorer, sinon elles deviendraient impossibles a
  // corriger depuis l'interface.
  for (const stocke of stockes) {
    if (findSetting(stocke.key)) continue;

    const kind = inferKind(stocke.value);
    editables.push({
      key: stocke.key,
      label: stocke.label,
      description: stocke.description,
      category: stocke.category,
      kind,
      value: toInputValue(kind, stocke.value),
      isNew: false,
    });
  }

  const parCategorie = new Map<string, EditableSetting[]>();
  for (const setting of editables) {
    const groupe = parCategorie.get(setting.category) ?? [];
    groupe.push(setting);
    parCategorie.set(setting.category, groupe);
  }

  return ordonnerCategories([...parCategorie.keys()]).map((category) => ({
    category,
    settings: parCategorie.get(category) ?? [],
  }));
}

export interface UpdateSettingsResult {
  /** Cles reellement modifiees, pour le journal d'audit. */
  changed: string[];
}

/**
 * Enregistre l'ecran de parametres.
 *
 * On itere sur les parametres CONNUS plutot que sur le formulaire recu : une
 * case a cocher decochee n'est pas transmise par le navigateur, et se fier au
 * formulaire ferait disparaitre silencieusement tout reglage booleen mis a
 * faux.
 */
export async function updateSettings(
  repository: SettingsRepository,
  values: Record<string, string | undefined>,
): Promise<Result<UpdateSettingsResult>> {
  const stockes = await repository.list();
  const parCle = new Map(stockes.map((setting) => [setting.key, setting]));

  // Catalogue + cles existantes : le meme perimetre que celui affiche.
  const definitions: SettingDefinition[] = [
    ...SETTINGS,
    ...stockes
      .filter((stocke) => !findSetting(stocke.key))
      .map((stocke) => ({
        key: stocke.key,
        label: stocke.label,
        description: stocke.description ?? undefined,
        category: stocke.category,
        kind: inferKind(stocke.value),
      })),
  ];

  const ecritures = [];
  const changed: string[] = [];

  for (const definition of definitions) {
    // Un parametre absent du formulaire envoye n'est pas touche — sauf les
    // booleens, dont l'absence signifie « decoche ».
    const soumis = values[definition.key];
    if (soumis === undefined && definition.kind !== "boolean") continue;

    const parsed = parseSettingValue(definition, soumis);
    if (!parsed.ok) return parsed;

    const stocke = parCle.get(definition.key);
    const inchange =
      stocke !== undefined && JSON.stringify(stocke.value) === JSON.stringify(parsed.value);

    if (inchange) continue;

    changed.push(definition.key);
    ecritures.push({
      key: definition.key,
      value: parsed.value,
      label: stocke?.label ?? definition.label,
      category: stocke?.category ?? definition.category,
      description: stocke?.description ?? definition.description ?? null,
    });
  }

  if (ecritures.length === 0) {
    return ok({ changed: [] });
  }

  const ecriture = await repository.saveMany(ecritures);
  if (!ecriture.ok) return ecriture;

  return ok({ changed });
}

/** Valeur d'un parametre, pour le code qui en a besoin (impression, calculs). */
export async function getSettingValue(
  repository: SettingsRepository,
  key: string,
): Promise<Result<unknown>> {
  const stockes = await repository.list();
  const trouve = stockes.find((setting) => setting.key === key);

  if (!trouve) {
    return fail(DomainError.notFound(`Le paramètre « ${key} » n'est pas enregistré.`));
  }

  return ok(trouve.value);
}
