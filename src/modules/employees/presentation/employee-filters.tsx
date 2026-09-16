"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { EMPLOYEE_STATUSES } from "../domain/employee";
import { Input, Select } from "@/shared/ui/form";
import { Button } from "@/shared/ui/button";

import { EMPLOYEE_STATUS_LABELS } from "./employee-status-badge";
import type { Option } from "./employee-form";

/**
 * Barre de filtres de la liste des employes.
 *
 * Les filtres sont ecrits dans l'URL (?recherche=&statut=). Consequence : une
 * recherche est partageable par lien, revient avec le bouton « precedent » du
 * navigateur, et la page reste rendue sur le serveur — la liste elle-meme n'a
 * pas besoin d'etre un composant client.
 */
export function EmployeeFilters({ departments }: { departments: Option[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const recherche = searchParams.get("recherche") ?? "";
  const statut = searchParams.get("statut") ?? "";
  const departement = searchParams.get("departement") ?? "";
  const hasFilters = Boolean(recherche || statut || departement);

  /** Met a jour un parametre et repart de la premiere page. */
  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/employes?${params.toString()}`);
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
            placeholder="Nom, matricule, email ou téléphone"
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-full sm:w-48">
        <label htmlFor="statut" className="mb-1.5 block text-xs font-medium text-surface-600">
          Statut
        </label>
        <Select
          id="statut"
          name="statut"
          value={statut}
          onChange={(event) => update("statut", event.target.value)}
        >
          <option value="">Tous les statuts</option>
          {EMPLOYEE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {EMPLOYEE_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      <div className="w-full sm:w-56">
        <label htmlFor="departement" className="mb-1.5 block text-xs font-medium text-surface-600">
          Département
        </label>
        <Select
          id="departement"
          name="departement"
          value={departement}
          onChange={(event) => update("departement", event.target.value)}
        >
          <option value="">Tous les départements</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          <Search className="size-4" />
          Filtrer
        </Button>
        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={() => router.push("/employes")}>
            <X className="size-4" />
            Réinitialiser
          </Button>
        ) : null}
      </div>
    </form>
  );
}
