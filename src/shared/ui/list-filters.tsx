"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/form";

/**
 * Barre de filtres generique des listes du back-office.
 *
 * Meme principe que la barre des employes : les criteres sont ecrits dans
 * l'URL (?recherche=&statut=), si bien qu'une liste filtree est partageable
 * par lien, revient avec le bouton « precedent » et reste rendue sur le
 * serveur. Seule cette barre est un composant client.
 *
 * Les modules recoivent des donnees SERIALISABLES (chaines et options) : aucune
 * icone ni composant ne traverse la frontiere serveur/client.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  /** Nom du parametre d'URL (« statut », « type »...). */
  name: string;
  label: string;
  /** Libelle de l'option vide (« Tous les statuts »). */
  placeholder: string;
  options: FilterOption[];
}

export interface FilterField {
  name: string;
  label: string;
  type: "date" | "month" | "number";
}

export function ListFilters({
  basePath,
  searchName = "recherche",
  searchLabel = "Rechercher",
  searchPlaceholder,
  selects = [],
  fields = [],
}: {
  basePath: string;
  searchName?: string;
  searchLabel?: string;
  /** Absent = pas de champ de recherche libre sur cette liste. */
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  fields?: FilterField[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const valeur = (name: string) => searchParams.get(name) ?? "";

  const noms = [
    ...(searchPlaceholder ? [searchName] : []),
    ...selects.map((select) => select.name),
    ...fields.map((field) => field.name),
  ];
  const filtresActifs = noms.some((nom) => valeur(nom) !== "");

  /** Met a jour un critere et repart de la premiere page. */
  const update = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("page");
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3 border-b border-surface-200 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!searchPlaceholder) return;
        const formData = new FormData(event.currentTarget);
        update(searchName, String(formData.get(searchName) ?? ""));
      }}
    >
      {searchPlaceholder ? (
        <div className="min-w-56 flex-1">
          <label htmlFor={searchName} className="mb-1.5 block text-xs font-medium text-surface-600">
            {searchLabel}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-400" />
            <Input
              id={searchName}
              name={searchName}
              // `key` force le champ a se resynchroniser quand l'URL change
              // (reinitialisation des filtres, retour arriere du navigateur).
              key={valeur(searchName)}
              defaultValue={valeur(searchName)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>
      ) : null}

      {selects.map((select) => (
        <div key={select.name} className="w-full sm:w-52">
          <label
            htmlFor={select.name}
            className="mb-1.5 block text-xs font-medium text-surface-600"
          >
            {select.label}
          </label>
          <Select
            id={select.name}
            name={select.name}
            value={valeur(select.name)}
            onChange={(event) => update(select.name, event.target.value)}
          >
            <option value="">{select.placeholder}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      ))}

      {fields.map((field) => (
        <div key={field.name} className="w-full sm:w-44">
          <label htmlFor={field.name} className="mb-1.5 block text-xs font-medium text-surface-600">
            {field.label}
          </label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            value={valeur(field.name)}
            onChange={(event) => update(field.name, event.target.value)}
          />
        </div>
      ))}

      <div className="flex gap-2">
        {searchPlaceholder ? (
          <Button type="submit" variant="secondary">
            <Search className="size-4" />
            Filtrer
          </Button>
        ) : null}
        {filtresActifs ? (
          <Button type="button" variant="ghost" onClick={() => router.push(basePath)}>
            <X className="size-4" />
            Réinitialiser
          </Button>
        ) : null}
      </div>
    </form>
  );
}
