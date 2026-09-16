"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Field, Select } from "@/shared/ui/form";

import type { CiblesDisponibles } from "./rule-form";
import { grouperFormationsParCategorie } from "./training-options";

export interface EmployeeOption {
  id: string;
  label: string;
}

/**
 * Raccourci « attribuer une commission » : deux combos (employé, formation),
 * qui ouvrent directement le barème de l'employé choisi avec la formation
 * déjà présélectionnée — sans avoir à chercher sa fiche au préalable.
 *
 * Ce raccourci ne calcule ni n'enregistre rien : il ne fait que pointer vers
 * le formulaire qui, lui, fait foi (`rule-form.tsx`, sur la fiche
 * Rémunération de l'employé). Les « Règles de commission » du menu (module 6)
 * sont un barème global, sans employé ni formation — ce n'est pas le même
 * écran, d'où ce raccourci pour retrouver le bon.
 */
export function CommissionQuickAccess({
  employees,
  cibles,
}: {
  employees: EmployeeOption[];
  cibles: CiblesDisponibles;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [cibleFormation, setCibleFormation] = useState("");

  const { categoriesAvecFormations, formationsSansCategorie } = grouperFormationsParCategorie(
    cibles.formations,
    cibles.categoriesFormation,
  );

  const ouvrir = () => {
    if (!employeeId) return;
    const params = cibleFormation ? `?formation=${encodeURIComponent(cibleFormation)}` : "";
    router.push(`/employes/${employeeId}/remuneration${params}#ajouter-regle`);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Employé" htmlFor="quick-employee">
        <Select
          id="quick-employee"
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
        >
          <option value="">— Choisir un employé —</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Formation" htmlFor="quick-formation" hint="Facultatif : laisser vide sinon.">
        <Select
          id="quick-formation"
          value={cibleFormation}
          onChange={(event) => setCibleFormation(event.target.value)}
        >
          <option value="">— Toutes les formations —</option>
          {categoriesAvecFormations.map((categorie) => (
            <optgroup key={categorie.id} label={categorie.name}>
              <option value={`categorie:${categorie.id}`}>
                Toute la catégorie « {categorie.name} »
              </option>
              {categorie.formations.map((formation) => (
                <option key={formation.id} value={`formation:${formation.id}`}>
                  {formation.title}
                </option>
              ))}
            </optgroup>
          ))}
          {formationsSansCategorie.length > 0 ? (
            <optgroup label="Sans catégorie">
              {formationsSansCategorie.map((formation) => (
                <option key={formation.id} value={`formation:${formation.id}`}>
                  {formation.title}
                </option>
              ))}
            </optgroup>
          ) : null}
        </Select>
      </Field>

      <Button type="button" onClick={ouvrir} disabled={!employeeId}>
        Configurer la commission
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
