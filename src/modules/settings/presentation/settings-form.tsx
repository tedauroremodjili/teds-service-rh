"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Textarea } from "@/shared/ui/form";

import type { EditableSetting, SettingsGroup } from "../application/settings-use-cases";
import {
  SETTING_CATEGORY_DESCRIPTIONS,
  SETTING_CATEGORY_LABELS,
} from "../domain/setting";

import { updateSettingsAction, type SettingsFormState } from "./actions";

/**
 * Écran des paramètres du système.
 *
 * Un seul formulaire pour tout : l'identité de l'entreprise, les finances, les
 * règles RH. Le type déclaré de chaque paramètre décide du contrôle affiché —
 * un taux se saisit dans un champ numérique borné, un email dans un champ
 * email — et la validation réelle est refaite côté serveur.
 */
export function SettingsForm({
  groups,
  editable,
}: {
  groups: SettingsGroup[];
  /** Faux sans la permission « Modifier les paramètres » : lecture seule. */
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    updateSettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <Alert tone={state.tone === "danger" ? "danger" : "success"}>{state.message}</Alert>
      ) : null}

      {!editable ? (
        <Alert tone="info">
          Lecture seule : la permission « Modifier les paramètres » est requise pour enregistrer
          des changements.
        </Alert>
      ) : null}

      {groups.map((group) => (
        <section
          key={group.category}
          className="rounded-xl border border-surface-200 bg-white shadow-card"
        >
          <header className="border-b border-surface-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-surface-800">
              {SETTING_CATEGORY_LABELS[group.category] ?? group.category}
            </h2>
            {SETTING_CATEGORY_DESCRIPTIONS[group.category] ? (
              <p className="mt-0.5 text-xs text-surface-500">
                {SETTING_CATEGORY_DESCRIPTIONS[group.category]}
              </p>
            ) : null}
          </header>

          <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
            {group.settings.map((setting) => (
              <Field
                key={setting.key}
                label={setting.label}
                htmlFor={setting.key}
                error={state.fieldErrors?.[setting.key]}
                hint={setting.description ?? undefined}
                className={setting.kind === "textarea" ? "md:col-span-2" : undefined}
              >
                <Controle
                  setting={setting}
                  disabled={!editable || pending}
                  hasError={Boolean(state.fieldErrors?.[setting.key])}
                />
              </Field>
            ))}
          </div>
        </section>
      ))}

      {editable ? (
        <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-5 py-4 shadow-card">
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Enregistrement…" : "Enregistrer les paramètres"}
          </Button>
          <p className="text-xs text-surface-500">
            Les documents imprimés reprennent immédiatement ces valeurs.
          </p>
        </div>
      ) : null}
    </form>
  );
}

function Controle({
  setting,
  disabled,
  hasError,
}: {
  setting: EditableSetting;
  disabled: boolean;
  hasError: boolean;
}) {
  const commun = {
    id: setting.key,
    name: setting.key,
    defaultValue: setting.value,
    placeholder: setting.placeholder,
    disabled,
    hasError,
  };

  switch (setting.kind) {
    case "textarea":
      return <Textarea {...commun} rows={3} />;

    case "boolean":
      return (
        <label className="flex h-10 items-center gap-2 text-sm text-surface-600">
          <input
            id={setting.key}
            name={setting.key}
            type="checkbox"
            defaultChecked={setting.value === "on"}
            disabled={disabled}
            className="size-4 rounded border-surface-300 accent-primary-700"
          />
          Activé
        </label>
      );

    case "email":
      return <Input {...commun} type="email" inputMode="email" />;

    case "phone":
      return <Input {...commun} type="tel" inputMode="tel" />;

    case "url":
      return <Input {...commun} type="url" inputMode="url" />;

    case "time":
      return <Input {...commun} type="time" />;

    case "percent":
      return <Input {...commun} type="number" step="0.01" min="0" max="100" />;

    case "number":
      return <Input {...commun} type="number" step="1" min="0" />;

    default:
      return <Input {...commun} type="text" />;
  }
}
