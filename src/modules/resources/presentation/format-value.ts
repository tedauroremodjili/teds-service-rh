/**
 * Formatage d'une valeur de ressource pour l'affichage.
 *
 * Le tableau de liste et la fiche partagent ces regles : un montant se lit
 * « 300 000 FCFA » partout, une date « 03/08/2026 » partout. Fonction pure —
 * elle sert aussi bien cote serveur que cote client.
 */

import {
  formatDateShort,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/shared/lib/format";

import type { FieldDefinition } from "../domain/field";
import type { ResourceRow } from "../domain/resource-repository";

const VIDE = "—";

export function displayValue(field: FieldDefinition, row: ResourceRow): string {
  const value = row[field.name];

  if (field.kind === "relation") {
    return (row[`${field.name}__label`] as string | null) ?? VIDE;
  }

  if (value === null || value === undefined || value === "") return VIDE;

  switch (field.kind) {
    case "money":
      return formatMoney(value as number);
    case "percent":
      return formatPercent(value as number);
    case "number":
    case "integer":
      return formatNumber(value as number);
    case "date":
      return formatDateShort(value as string);
    case "datetime":
      return formatDateTime(value as string);
    case "boolean":
      return value ? "Oui" : "Non";
    case "enum":
      return field.options?.find((option) => option.value === value)?.label ?? String(value);
    default:
      return String(value);
  }
}

/** Titre d'une fiche : les champs declares, concatenes. */
export function rowTitle(titleFields: string[], row: ResourceRow, fallback: string): string {
  const parts = titleFields
    .map((name) => row[name])
    .filter((part) => part !== null && part !== undefined && part !== "")
    .map(String);

  return parts.length > 0 ? parts.join(" ") : fallback;
}

/**
 * Valeur telle que l'attend un controle HTML.
 * Les dates arrivent en ISO ; `<input type="date">` veut « 2026-08-03 » et
 * `datetime-local` veut « 2026-08-03T14:30 » — sans quoi le champ reste vide
 * et la modification perd silencieusement la valeur existante.
 */
export function inputValue(field: FieldDefinition, value: unknown): string {
  if (value === null || value === undefined) return "";

  if (field.kind === "date") return String(value).slice(0, 10);
  if (field.kind === "datetime") return String(value).slice(0, 16);

  return String(value);
}
