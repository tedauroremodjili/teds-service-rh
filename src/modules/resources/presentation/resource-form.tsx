"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, Save, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select, Textarea } from "@/shared/ui/form";

import { findResource } from "../domain/catalog";
import type { FieldDefinition, FieldOption } from "../domain/field";
import { formFields, type ResourceDefinition } from "../domain/resource";
import type { ResourceRow } from "../domain/resource-repository";

import {
  createResourceAction,
  quickCreateResourceAction,
  updateResourceAction,
  type QuickCreateState,
  type ResourceFormState,
} from "./actions";
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

/**
 * Vrai une fois passe le premier rendu client, jamais pendant le rendu
 * serveur. Necessaire pour poser un portail (`document.body` n'existe pas
 * cote serveur) sans avertissement d'hydratation : `useSyncExternalStore`
 * est le moyen prevu pour cela — contrairement a un `useEffect` qui appelle
 * `setState`, il ne provoque pas de rendu intermediaire visible, React sait
 * directement qu'un second rendu client est necessaire apres l'hydratation.
 * Meme principe que `panneauStore` dans `app-shell.tsx`.
 */
function useMonteCoteClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

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

          if (field.kind === "relation" && field.quickCreate) {
            return (
              <RelationFieldWithQuickCreate
                key={field.name}
                field={field}
                targetKey={field.quickCreate}
                value={valueOf(field)}
                options={options[field.name] ?? []}
                error={erreur}
                disabled={pending}
              />
            );
          }

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
/* Champ relation avec creation rapide de la fiche visee                       */
/* -------------------------------------------------------------------------- */

/**
 * Select d'un champ relation, avec un bouton « + Nouveau » qui ouvre une fiche
 * minimale de la ressource visee SANS quitter ce formulaire-ci.
 *
 * Les deux fiches restent bien distinctes en base (un apprenant peut avoir
 * plusieurs inscriptions) : ce bouton ne fait qu'eviter l'aller-retour d'ecran
 * pour la premiere inscription d'un apprenant qui n'existe pas encore.
 */
function RelationFieldWithQuickCreate({
  field,
  targetKey,
  value: valeurInitiale,
  options: optionsInitiales,
  error,
  disabled,
}: {
  field: FieldDefinition;
  targetKey: string;
  value: string;
  options: FieldOption[];
  error?: string[];
  disabled: boolean;
}) {
  const cible = findResource(targetKey);
  const monteCoteClient = useMonteCoteClient();

  const [options, setOptions] = useState(optionsInitiales);
  const [value, setValue] = useState(valeurInitiale);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Field label={field.label} htmlFor={field.name} error={error} hint={field.hint} required={field.required}>
        <div className="flex gap-2">
          <Select
            id={field.name}
            name={field.name}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            hasError={Boolean(error)}
            disabled={disabled}
            className="flex-1"
          >
            <option value="">— Choisir —</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {cible ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" />
              Nouveau
            </Button>
          ) : null}
        </div>
      </Field>

      {/*
       * Le dialogue se pose hors du <form> englobant, via un portail : un
       * <form> ne peut pas en contenir un autre (HTML invalide), or c'est
       * justement le cas ici — ce champ vit DANS le formulaire de la
       * ressource appelante, et le dialogue porte son propre <form> pour la
       * creation rapide. `monteCoteClient` ecarte le rendu serveur, ou
       * `document.body` n'existe pas (voir `useMonteCoteClient`).
       */}
      {cible && monteCoteClient
        ? createPortal(
            <dialog
              ref={dialogRef}
              onClose={() => setOpen(false)}
              className="w-full max-w-md rounded-xl border border-surface-200 p-0 shadow-card-hover backdrop:bg-primary-950/50"
            >
              {open ? (
                <QuickCreateForm
                  cible={cible}
                  onCreated={(cree) => {
                    setOptions((precedentes) => [...precedentes, cree]);
                    setValue(cree.value);
                    setOpen(false);
                  }}
                  onCancel={() => setOpen(false)}
                />
              ) : null}
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}

function QuickCreateForm({
  cible,
  onCreated,
  onCancel,
}: {
  cible: ResourceDefinition;
  onCreated: (option: FieldOption) => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState<QuickCreateState, FormData>(
    quickCreateResourceAction.bind(null, cible.key),
    {},
  );

  // Champs simples uniquement (texte, nombre, date, enumeration) : une autre
  // relation ouvrirait un formulaire rapide dans le formulaire rapide. Les
  // champs auto-generes (reference, matricule, jeton) ne se saisissent pas
  // non plus — le serveur les complete, comme a la creation normale.
  const champsRapides = cible.fields.filter(
    (champ) => champ.required && !champ.computed && !champ.autoValue && champ.kind !== "relation",
  );

  useEffect(() => {
    if (state.created) onCreated(state.created);
    // onCreated est stable (definie inline par l'appelant a chaque rendu) :
    // ne surveiller que la vraie donnee evite une boucle de mises a jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.created]);

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-primary-900">
          Nouvel(le) {cible.singular.toLowerCase()}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fermer"
          className="flex size-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700"
        >
          <X className="size-4" />
        </button>
      </div>

      <form action={formAction} className="space-y-4">
        {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

        {champsRapides.map((champ) => (
          <Field
            key={champ.name}
            label={champ.label}
            htmlFor={champ.name}
            error={state.fieldErrors?.[champ.name]}
            required
          >
            <Control
              field={champ}
              value={state.values?.[champ.name] ?? champ.defaultValue ?? ""}
              options={champ.options ?? []}
              hasError={Boolean(state.fieldErrors?.[champ.name])}
              disabled={pending}
            />
          </Field>
        ))}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Création…" : "Créer"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Controle correspondant au type du champ                                     */
/* -------------------------------------------------------------------------- */

export function Control({
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
