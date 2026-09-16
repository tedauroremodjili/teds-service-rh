"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { coerceFormData } from "@/shared/lib/form-action";

import { login } from "../application/login";
import { prismaAuthRepository } from "../infrastructure/prisma-auth-repository";
import {
  simulatePasswordCheck,
  verifyPassword,
} from "../infrastructure/password-hasher";
import { createSessionCookie, destroySessionCookie } from "../infrastructure/session";

/**
 * Server Actions du module auth — la couche PRESENTATION.
 *
 * Son role est strictement limite : lire le FormData, appeler le cas d'usage,
 * traduire le resultat pour l'interface. Aucune regle metier ici.
 *
 * Rappel de securite (documentation Next.js) : une Server Action est joignable
 * par une requete POST directe, pas seulement via le formulaire. Toute action
 * qui n'est pas publique doit donc verifier la session elle-meme — ce que fait
 * le DAL pour les autres modules.
 */

export interface LoginFormState {
  message?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  values?: { email?: string };
}

export async function loginAction(
  previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  // Avant hydratation, le navigateur soumet le formulaire nativement et
  // l'action ne recoit que le FormData : on accepte les deux formes d'appel.
  const champs = coerceFormData(previousState, formData);

  const email = String(champs.get("email") ?? "");
  const password = String(champs.get("password") ?? "");

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  const result = await login(
    { email, password, ipAddress, userAgent: headerList.get("user-agent") },
    {
      repository: prismaAuthRepository,
      verifyPassword,
      simulatePasswordCheck,
    },
  );

  if (!result.ok) {
    const { error } = result;

    return {
      message: error.kind === "VALIDATION" ? undefined : error.message,
      fieldErrors: error.field
        ? { [error.field]: [error.message] }
        : undefined,
      values: { email },
    };
  }

  await createSessionCookie(result.value.session);

  // redirect() interrompt l'execution en levant une exception de controle de
  // flux geree par le framework : rien apres cette ligne ne s'execute.
  redirect("/tableau-de-bord");
}

export async function logoutAction(): Promise<void> {
  await destroySessionCookie();
  redirect("/connexion");
}
