import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getSession } from "@/infrastructure/auth/dal";
import { LoginForm } from "@/modules/auth/presentation/login-form";
import { Logo } from "@/shared/ui/logo";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Accès à l'espace de gestion TED'S SERVICE.",
};

export default async function ConnexionPage() {
  // Un utilisateur deja connecte n'a rien a faire ici.
  const session = await getSession();
  if (session) {
    redirect("/tableau-de-bord");
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo, titre et formulaire forment un seul bloc. */}
      <div className="rounded-2xl border border-surface-200 bg-white shadow-card">
        <div className="flex flex-col items-center border-b border-surface-100 px-6 pb-6 pt-8 text-center sm:px-8">
          <Logo className="max-w-[190px]" />

          <h1 className="mt-5 text-xl font-bold tracking-tight text-primary-900">
            Espace de gestion
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            Connectez-vous avec vos identifiants professionnels.
          </p>
        </div>

        <div className="px-6 py-7 sm:px-8">
          <LoginForm />
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-surface-500">
        <ShieldCheck className="size-4 shrink-0 text-primary-600" />
        Connexion sécurisée — vos accès sont journalisés.
      </p>
    </div>
  );
}
