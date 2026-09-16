"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";

import { LONGUEUR_MOT_DE_PASSE_MIN } from "@/modules/auth/domain/credentials";
import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/form";

import { createUserAction, type NewUserFormState } from "./actions";

/**
 * Ouverture d'un compte.
 *
 * Le rôle choisi ici n'est qu'un point de départ : une fois le compte créé, sa
 * fiche permet d'ajouter ou de retirer des droits un par un. C'est pourquoi
 * l'écran reste volontairement court — l'ajustement fin vient après.
 */
export function NewUserForm({
  employees,
  roles,
}: {
  /** Employés sans compte, proposés au rattachement. */
  employees: Array<{ id: string; label: string }>;
  /** Rôles disponibles, lus en base : ils se créent depuis /roles. */
  roles: Array<{ name: string; label: string; description: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<NewUserFormState, FormData>(
    createUserAction,
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
            autoComplete="off"
            placeholder="prenom.nom@tedsservice.cg"
            defaultValue={state.values?.email}
            hasError={Boolean(state.fieldErrors?.email)}
            required
          />
        </Field>

        <Field
          label="Mot de passe provisoire"
          htmlFor="password"
          error={state.fieldErrors?.password}
          hint={`${LONGUEUR_MOT_DE_PASSE_MIN} caractères minimum, avec majuscule, minuscule et chiffre.`}
          required
        >
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              className="pr-11"
              hasError={Boolean(state.fieldErrors?.password)}
              required
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

        <Field
          label="Rôle"
          htmlFor="role"
          error={state.fieldErrors?.role}
          hint="Socle de droits du compte ; il s'ajuste ensuite sur sa fiche."
          required
        >
          <Select id="role" name="role" defaultValue={state.values?.role ?? "AGENT"} required>
            {roles.map((role) => (
              <option key={role.name} value={role.name} title={role.description ?? undefined}>
                {role.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Employé rattaché"
          htmlFor="employeeId"
          error={state.fieldErrors?.employeeId}
          hint={
            employees.length === 0
              ? "Aucun employé sans compte pour l'instant."
              : "Facultatif : relie le compte à une fiche du personnel."
          }
        >
          <Select
            id="employeeId"
            name="employeeId"
            defaultValue={state.values?.employeeId ?? ""}
            disabled={employees.length === 0}
          >
            <option value="">— Aucun —</option>
            {employees.map((employe) => (
              <option key={employe.id} value={employe.id}>
                {employe.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-surface-600">
        <input
          type="checkbox"
          name="mustChangePassword"
          defaultChecked
          className="size-4 rounded border-surface-300 accent-primary-700"
        />
        Exiger un changement de mot de passe à la première connexion
      </label>

      <div className="flex items-center gap-3 border-t border-surface-200 pt-5">
        <Button type="submit" disabled={pending}>
          <UserPlus className="size-4" />
          {pending ? "Création…" : "Créer le compte"}
        </Button>
        <Link href="/utilisateurs" className="text-sm text-surface-500 hover:text-primary-700">
          Annuler
        </Link>
      </div>
    </form>
  );
}
