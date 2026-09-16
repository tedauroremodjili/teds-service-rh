"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input } from "@/shared/ui/form";

import { loginAction, type LoginFormState } from "./actions";

/**
 * Formulaire de connexion.
 *
 * C'est un composant CLIENT (« use client ») car il gere un etat local :
 * l'affichage du mot de passe et l'indicateur de chargement. Le traitement,
 * lui, reste integralement sur le serveur — `useActionState` relie le formulaire
 * a la Server Action et expose `pending` pendant l'aller-retour.
 *
 * Consequence utile : le formulaire fonctionne meme si JavaScript n'est pas
 * encore charge, la soumission etant alors traitee nativement par le navigateur.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginAction,
    {},
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Field label="Adresse email" htmlFor="email" error={state.fieldErrors?.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="prenom.nom@tedsservice.cg"
          defaultValue={state.values?.email}
          hasError={Boolean(state.fieldErrors?.email)}
          required
        />
      </Field>

      <Field
        label="Mot de passe"
        htmlFor="password"
        error={state.fieldErrors?.password}
        required
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-11"
            hasError={Boolean(state.fieldErrors?.password)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-surface-400 transition-colors hover:text-primary-700"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <LogIn className="size-4" />
        {pending ? "Connexion en cours…" : "Se connecter"}
      </Button>
    </form>
  );
}
