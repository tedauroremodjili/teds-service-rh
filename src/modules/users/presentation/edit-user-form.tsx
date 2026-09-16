"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Save } from "lucide-react";

import { LONGUEUR_MOT_DE_PASSE_MIN } from "@/modules/auth/domain/credentials";
import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/form";

import { updateUserAction, type NewUserFormState } from "./actions";

/**
 * Modification d'un compte.
 *
 * Le mot de passe ne se lit pas, il se REMPLACE : le champ est vide par défaut
 * et n'écrit que s'il est rempli. C'est la seule façon honnête de traiter un
 * secret que l'administrateur n'a pas à connaître.
 *
 * Le rôle et le statut ne sont pas ici : ils vivent sur la fiche, où leurs
 * effets (remise à zéro des droits, coupure d'accès) sont expliqués.
 */
export function EditUserForm({
  userId,
  email,
  employeeId,
  mustChangePassword,
  employees,
}: {
  userId: string;
  email: string;
  employeeId: string | null;
  mustChangePassword: boolean;
  /** Employés sans compte, plus celui déjà rattaché à ce compte. */
  employees: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState<NewUserFormState, FormData>(
    updateUserAction.bind(null, userId),
    {},
  );
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Adresse email"
          htmlFor="email"
          error={state.fieldErrors?.email}
          hint="Elle sert d'identifiant de connexion."
          required
        >
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={state.values?.email ?? email}
            hasError={Boolean(state.fieldErrors?.email)}
            required
          />
        </Field>

        <Field
          label="Employé rattaché"
          htmlFor="employeeId"
          error={state.fieldErrors?.employeeId}
          hint="Relie le compte à une fiche du personnel."
        >
          <Select
            id="employeeId"
            name="employeeId"
            defaultValue={state.values?.employeeId ?? employeeId ?? ""}
          >
            <option value="">— Aucun —</option>
            {employees.map((employe) => (
              <option key={employe.id} value={employe.id}>
                {employe.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Nouveau mot de passe"
          htmlFor="newPassword"
          error={state.fieldErrors?.password}
          hint={`Laisser vide pour ne pas le changer. Sinon ${LONGUEUR_MOT_DE_PASSE_MIN} caractères minimum, avec majuscule, minuscule et chiffre.`}
          className="md:col-span-2"
        >
          <div className="relative">
            <Input
              id="newPassword"
              name="newPassword"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              className="pr-11"
              hasError={Boolean(state.fieldErrors?.password)}
            />
            <button
              type="button"
              onClick={() => setVisible((affiche) => !affiche)}
              aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-surface-400 transition-colors hover:text-primary-700"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-surface-600">
        <input
          type="checkbox"
          name="mustChangePassword"
          defaultChecked={mustChangePassword}
          className="size-4 rounded border-surface-300 accent-primary-700"
        />
        Exiger un changement de mot de passe à la prochaine connexion
      </label>

      <div className="flex items-center gap-3 border-t border-surface-200 pt-5">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Link
          href={`/utilisateurs/${userId}`}
          className="text-sm text-surface-500 hover:text-primary-700"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
