"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input, Select } from "@/shared/ui/form";

import { USER_STATUSES, USER_STATUS_LABELS } from "../domain/user-account";

/**
 * Filtres de la liste des comptes.
 *
 * Comme ailleurs dans l'ERP, l'etat vit dans l'URL : la vue reste rendue sur le
 * serveur et un filtre est partageable par lien.
 *
 * La liste des roles arrive en PROP, lue en base par la page. Elle n'est plus
 * une constante du code : depuis que les roles se creent depuis /roles, une
 * liste figee omettrait tout role ajoute apres coup.
 */
export function UserFilters({
  roles,
}: {
  roles: Array<{ name: string; label: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const recherche = searchParams.get("recherche") ?? "";
  const role = searchParams.get("role") ?? "";
  const statut = searchParams.get("statut") ?? "";
  const personnalises = searchParams.get("personnalises") === "1";
  const hasFilters = Boolean(recherche || role || statut || personnalises);

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/utilisateurs?${params.toString()}`);
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3 border-b border-surface-200 px-5 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        update("recherche", String(formData.get("recherche") ?? ""));
      }}
    >
      <div className="min-w-56 flex-1">
        <label htmlFor="recherche" className="mb-1.5 block text-xs font-medium text-surface-600">
          Rechercher
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-400" />
          <Input
            id="recherche"
            name="recherche"
            defaultValue={recherche}
            placeholder="Email, nom ou matricule"
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-48">
        <label htmlFor="role" className="mb-1.5 block text-xs font-medium text-surface-600">
          Rôle
        </label>
        <Select id="role" name="role" value={role} onChange={(e) => update("role", e.target.value)}>
          <option value="">Tous les rôles</option>
          {roles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-40">
        <label htmlFor="statut" className="mb-1.5 block text-xs font-medium text-surface-600">
          Statut
        </label>
        <Select
          id="statut"
          name="statut"
          value={statut}
          onChange={(e) => update("statut", e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {USER_STATUSES.map((valeur) => (
            <option key={valeur} value={valeur}>
              {USER_STATUS_LABELS[valeur]}
            </option>
          ))}
        </Select>
      </div>

      <label className="flex h-10 cursor-pointer items-center gap-2 text-xs text-surface-600">
        <input
          type="checkbox"
          checked={personnalises}
          onChange={(e) => update("personnalises", e.target.checked ? "1" : "")}
          className="size-4 rounded border-surface-300 accent-primary-700"
        />
        Droits personnalisés
      </label>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/utilisateurs")}
        >
          <X className="size-4" />
          Réinitialiser
        </Button>
      ) : null}
    </form>
  );
}
