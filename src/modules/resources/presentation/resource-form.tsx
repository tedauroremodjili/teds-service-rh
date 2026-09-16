"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Save } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select, Textarea } from "@/shared/ui/form";

import type { FieldDefinition, FieldOption } from "../domain/field";
import { formFields, type ResourceDefinition } from "../domain/resource";
import type { ResourceRow } from "../domain/resource-repository";

import { createResourceAction, updateResourceAction, type ResourceFormState } from "./actions";
import { inputValue } from "./format-value";

/**
 * Formulaire genere a partir de la definition de la ressource.
 *
 * Un seul formulaire pour tout l'ERP : le type declare du champ decide du
 * controle affiche (montant, date, liste deroulante...). La validation reelle
 * reste cote serveur — les attributs HTML ne sont qu'un confort de saisie, et
 * un `required` se contourne en deux clics dans un navigateur.
 *
 * La definition traverse la frontiere serveur/client parce qu'elle ne contient
 * que des donnees : ni fonction, ni composant, ni icone.
 */

interface ResourceFormProps {
  definition: ResourceDefinition;
  /** Absent en creation. */
  id?: string;
  /** Valeurs existantes, en modification. */
  row?: ResourceRow;
  options: Record<string, FieldOption[]>;
  defaults: Record<string, string>;
}

export function ResourceForm({ definition, id, row, options, defaults }: ResourceFormProps) {
  const action = id
    ? updateResourceAction.bind(null, definition.key, id)
    : createResourceAction.bind(null, definition.key);

  const [state, formAction, pending] = useActionState<ResourceFormState, FormData>(action, {});

  const champs = formFields(definition);

  /** Ordre de priorite : ce que l'utilisateur vient de saisir, puis la base, puis le defaut. */
  const valueOf = (field: FieldDefinition): string => {
    const saisie = state.values?.[field.name];
    if (saisie !== undefined) return saisie;

    if (row && row[field.name] !== null && row[field.name] !== undefined) {
      return inputValue(field, row[field.name]);
    }

    return defaults[field.name] ?? "";
  };

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {champs.map((field) => {
          const erreur = state.fieldErrors?.[field.name];
          const pleineLargeur = field.kind === "textarea" || field.kind === "json";

          return (
            <Field
              key={field.name}
              label={field.label}
              htmlFor={field.name}
              error={erreur}
              hint={field.hint}
              required={field.required}
              className={pleineLargeur ? "md:col-span-2" : undefined}
            >
              <Control
                field={field}
                value={valueOf(field)}
                options={options[field.name] ?? field.options ?? []}
                hasError={Boolean(erreur)}
                disabled={pending}
              />
            </Field>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-surface-200 pt-5">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Link
          href={id ? `/${definition.key}/${id}` : `/${definition.key}`}
          className="text-sm text-surface-500 hover:text-primary-700"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Controle correspondant au type du champ                                     */
/* -------------------------------------------------------------------------- */

function Control({
  field,
  value,
  options,
  hasError,
  disabled,
}: {
  field: FieldDefinition;
  value: string;
  options: FieldOption[];
  hasError: boolean;
  disabled: boolean;
}) {
  const commun = {
    id: field.name,
    name: field.name,
    defaultValue: value,
    hasError,
    disabled,
  };

  switch (field.kind) {
    case "textarea":
    case "json":
      return <Textarea {...commun} rows={field.kind === "json" ? 3 : 4} />;

    case "boolean":
      return (
        <label className="flex h-10 items-center gap-2 text-sm text-surface-600">
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            defaultChecked={value === "true" || value === "on"}
            disabled={disabled}
            className="size-4 rounded border-surface-300 accent-primary-700"
          />
          Oui
        </label>
      );

    case "enum":
    case "relation":
      return (
        <Select {...commun}>
          {/* Une liste obligatoire garde une option vide : mieux vaut un refus
              explicite du serveur qu'une valeur choisie par defaut a l'insu
              de l'utilisateur. */}
          <option value="">— Choisir —</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );

    case "money":
      return <Input {...commun} type="number" step="1" min="0" inputMode="numeric" />;

    case "percent":
      return <Input {...commun} type="number" step="0.01" min="0" max="100" />;

    case "integer":
      return <Input {...commun} type="number" step="1" />;

    case "number":
      return <Input {...commun} type="number" step="0.01" />;

    case "date":
      return <Input {...commun} type="date" />;

    case "datetime":
      return <Input {...commun} type="datetime-local" />;

    default:
      return <Input {...commun} type="text" />;
  }
}
