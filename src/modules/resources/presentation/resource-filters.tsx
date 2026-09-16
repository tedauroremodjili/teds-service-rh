"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/form";

import type { FieldDefinition, FieldOption } from "../domain/field";

/**
 * Barre de filtres commune a toutes les listes.
 *
 * Comme ailleurs, l'etat vit dans l'URL : la liste reste rendue sur le serveur,
 * un filtre se partage par lien et le bouton « precedent » du navigateur
 * fonctionne. Seuls les champs declares `filterable` apparaissent — un filtre
 * arbitraire venu de l'URL est ignore par le repository.
 */
export function ResourceFilters({
  resourceKey,
  fields,
  options,
  searchable,
}: {
  resourceKey: string;
  fields: FieldDefinition[];
  options: Record<string, FieldOption[]>;
  searchable: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const recherche = searchParams.get("recherche") ?? "";
  const actifs = fields.filter((field) => searchParams.get(field.name));
  const hasFilters = Boolean(recherche) || actifs.length > 0;

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/${resourceKey}?${params.toString()}`);
  };

  if (!searchable && fields.length === 0) return null;

  return (
    <form
      className="flex flex-wrap items-end gap-3 border-b border-surface-200 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        update("recherche", String(formData.get("recherche") ?? ""));
      }}
    >
      {searchable ? (
        <div className="min-w-56 flex-1">
          <label htmlFor="recherche" className="mb-1.5 block text-xs font-medium text-surface-600">
            Rechercher
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-400" />
            <Input id="recherche" name="recherche" defaultValue={recherche} className="pl-9" />
          </div>
        </div>
      ) : null}

      {fields.map((field) => (
        <div key={field.name} className="w-52">
          <label
            htmlFor={`filtre-${field.name}`}
            className="mb-1.5 block text-xs font-medium text-surface-600"
          >
            {field.label}
          </label>
          <Select
            id={`filtre-${field.name}`}
            value={searchParams.get(field.name) ?? ""}
            onChange={(event) => update(field.name, event.target.value)}
          >
            <option value="">Tous</option>
            {(options[field.name] ?? field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ))}

      {hasFilters ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(`/${resourceKey}`)}>
          <X className="size-4" />
          Réinitialiser
        </Button>
      ) : null}
    </form>
  );
}
