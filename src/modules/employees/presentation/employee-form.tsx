"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save, Scale } from "lucide-react";

import { EMPLOYEE_STATUSES, GENDERS, MARITAL_STATUSES } from "../domain/employee";
import type { EmployeeDetail } from "../domain/employee-repository";
import { BaremeInitial } from "@/modules/remuneration/presentation/bareme-initial";
import type { CiblesDisponibles } from "@/modules/remuneration/presentation/rule-form";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { Field, FieldSet, Input, Select, Textarea } from "@/shared/ui/form";

import type { EmployeeFormState } from "./actions";
import {
  EMPLOYEE_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
} from "./employee-status-badge";

export interface Option {
  id: string;
  label: string;
}

/**
 * Formulaire de creation et de modification d'un employe.
 *
 * Un seul composant sert les deux cas : la difference tient uniquement a
 * l'action recue en prop et aux valeurs initiales. Cela garantit que les deux
 * ecrans ne divergent jamais.
 *
 * Les champs sont des champs HTML natifs, sans etat React : c'est le formulaire
 * lui-meme qui porte les valeurs, et la Server Action les lit dans le FormData.
 * Moins de code, et le formulaire reste fonctionnel avant l'hydratation.
 */
export function EmployeeForm({
  action,
  employee,
  departments,
  positions,
  suggestedMatricule,
  remunerationTargets,
  submitLabel = "Enregistrer",
  cancelHref,
}: {
  action: (state: EmployeeFormState, formData: FormData) => Promise<EmployeeFormState>;
  employee?: EmployeeDetail;
  departments: Option[];
  positions: Option[];
  suggestedMatricule?: string;
  /**
   * Formations, catégories, documents et prestations sur lesquels un barème
   * peut porter. Fourni uniquement à la CRÉATION, et uniquement à qui a le
   * droit de calculer la paie : la page décide, le formulaire se contente
   * d'afficher la section quand elle a de quoi la remplir. En modification, le
   * barème vit sur l'écran Rémunération, où il se lit avec son décompte.
   */
  remunerationTargets?: CiblesDisponibles;
  submitLabel?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<EmployeeFormState, FormData>(action, {});

  /** Valeur d'un champ : saisie precedente > donnee existante > vide. */
  const value = (name: string, fallback?: string | number | null) =>
    state.values?.[name] ?? (fallback === null || fallback === undefined ? "" : String(fallback));

  const error = (name: string) => state.fieldErrors?.[name];

  const toInputDate = (date?: Date | string | null) => {
    if (!date) return "";
    const parsed = date instanceof Date ? date : new Date(date);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
  };

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      {/* --- Identite --------------------------------------------------- */}
      <Card>
        <CardBody>
          <FieldSet
            legend="Informations personnelles"
            description="État civil de l'employé, tel qu'il figure sur sa pièce d'identité."
          >
            <Field label="Matricule" htmlFor="matricule" error={error("matricule")} required>
              <Input
                id="matricule"
                name="matricule"
                defaultValue={value("matricule", employee?.matricule ?? suggestedMatricule)}
                placeholder="TSS-0001"
                hasError={Boolean(error("matricule"))}
                required
              />
            </Field>

            <Field label="Statut" htmlFor="status" error={error("status")}>
              <Select
                id="status"
                name="status"
                defaultValue={value("status", employee?.status ?? "ACTIF")}
              >
                {EMPLOYEE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {EMPLOYEE_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Prénom" htmlFor="firstName" error={error("firstName")} required>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={value("firstName", employee?.firstName)}
                hasError={Boolean(error("firstName"))}
                required
              />
            </Field>

            <Field label="Nom" htmlFor="lastName" error={error("lastName")} required>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={value("lastName", employee?.lastName)}
                hasError={Boolean(error("lastName"))}
                required
              />
            </Field>

            <Field label="Sexe" htmlFor="gender" error={error("gender")} required>
              <Select
                id="gender"
                name="gender"
                defaultValue={value("gender", employee?.gender)}
                hasError={Boolean(error("gender"))}
                required
              >
                <option value="">— Sélectionner —</option>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {GENDER_LABELS[gender]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="État civil" htmlFor="maritalStatus" error={error("maritalStatus")}>
              <Select
                id="maritalStatus"
                name="maritalStatus"
                defaultValue={value("maritalStatus", employee?.maritalStatus ?? "CELIBATAIRE")}
              >
                {MARITAL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {MARITAL_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Date de naissance"
              htmlFor="birthDate"
              error={error("birthDate")}
              required
            >
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={value("birthDate", toInputDate(employee?.birthDate))}
                hasError={Boolean(error("birthDate"))}
                required
              />
            </Field>

            <Field label="Lieu de naissance" htmlFor="birthPlace" error={error("birthPlace")}>
              <Input
                id="birthPlace"
                name="birthPlace"
                defaultValue={value("birthPlace", employee?.birthPlace)}
                placeholder="Brazzaville"
              />
            </Field>

            <Field label="Nationalité" htmlFor="nationality" error={error("nationality")}>
              <Input
                id="nationality"
                name="nationality"
                defaultValue={value("nationality", employee?.nationality ?? "Congolaise")}
              />
            </Field>
          </FieldSet>
        </CardBody>
      </Card>

      {/* --- Coordonnees ------------------------------------------------ */}
      <Card>
        <CardBody>
          <FieldSet legend="Coordonnées">
            <Field label="Téléphone" htmlFor="phone" error={error("phone")} required>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={value("phone", employee?.phone)}
                placeholder="+242 06 830 65 42"
                hasError={Boolean(error("phone"))}
                required
              />
            </Field>

            <Field label="Adresse email" htmlFor="email" error={error("email")} required>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={value("email", employee?.email)}
                placeholder="prenom.nom@tedsservice.cg"
                hasError={Boolean(error("email"))}
                required
              />
            </Field>

            <Field label="Adresse" htmlFor="address" error={error("address")} className="sm:col-span-2">
              <Textarea
                id="address"
                name="address"
                defaultValue={value("address", employee?.address)}
                placeholder="Quartier, avenue, arrondissement, ville"
              />
            </Field>
          </FieldSet>
        </CardBody>
      </Card>

      {/* --- Situation professionnelle ---------------------------------- */}
      <Card>
        <CardBody>
          <FieldSet
            legend="Informations professionnelles"
            description="Ces données alimentent la paie. Les commissions se définissent par formation, document ou prestation dans le barème de rémunération."
          >
            <Field label="Date d'embauche" htmlFor="hireDate" error={error("hireDate")} required>
              <Input
                id="hireDate"
                name="hireDate"
                type="date"
                defaultValue={value("hireDate", toInputDate(employee?.hireDate))}
                hasError={Boolean(error("hireDate"))}
                required
              />
            </Field>

            <Field label="Département" htmlFor="departmentId" error={error("departmentId")}>
              <Select
                id="departmentId"
                name="departmentId"
                defaultValue={value("departmentId", employee?.departmentId)}
              >
                <option value="">— Non affecté —</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Poste" htmlFor="positionId" error={error("positionId")}>
              <Select
                id="positionId"
                name="positionId"
                defaultValue={value("positionId", employee?.positionId)}
              >
                <option value="">— Non défini —</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Salaire de base (FCFA)"
              htmlFor="baseSalary"
              error={error("baseSalary")}
              hint={
                remunerationTargets
                  ? "Montant mensuel brut, en francs CFA. Laissez 0 si cet employé est rémunéré uniquement par le barème ci-dessous — un formateur payé sur ce que versent les apprenants, par exemple."
                  : "Montant mensuel brut, en francs CFA. Laissez 0 si cet employé est rémunéré uniquement par son barème (écran Rémunération de la fiche) — un formateur payé sur ce que versent les apprenants, par exemple."
              }
            >
              <Input
                id="baseSalary"
                name="baseSalary"
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                defaultValue={value("baseSalary", employee?.baseSalary)}
                placeholder="250000"
                hasError={Boolean(error("baseSalary"))}
              />
            </Field>

            {/*
              Pas de champ visible : un taux de commission ne se decide plus a
              plat sur la fiche, il se pose formation par formation (ou
              document, ou prestation) dans le bareme de remuneration —
              ci-dessous a la creation, sur l'ecran Remuneration ensuite. Le
              champ cache reconduit simplement la valeur actuelle sans
              l'exposer, pour qu'une fiche plus ancienne qui en portait un ne
              le perde pas au premier enregistrement.
            */}
            <input
              type="hidden"
              name="commissionRate"
              value={employee?.commissionRate ?? 0}
            />
          </FieldSet>
        </CardBody>
      </Card>

      {/* --- Bareme de remuneration (creation seulement) ------------------ */}
      {remunerationTargets ? (
        <Card>
          <CardHeader
            title="Barème de rémunération"
            description="Ce que touche cet employé, activité par activité. La somme de ces lignes s'ajoute chaque mois à son salaire de base."
            icon={<Scale className="size-4.5" />}
          />
          <CardBody>
            <BaremeInitial
              cibles={remunerationTargets}
              erreur={error("bareme")?.[0]}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardFooter>
          <Link
            href={cancelHref}
            className="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Enregistrement…" : submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
