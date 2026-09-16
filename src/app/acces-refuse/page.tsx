import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { getCurrentUser } from "@/infrastructure/auth/dal";
import { ROLE_LABELS } from "@/modules/auth/domain/permissions";
import { LinkButton } from "@/shared/ui/button";

export const metadata: Metadata = {
  title: "Accès refusé",
};

/**
 * Page affichee lorsqu'un utilisateur connecte tente d'ouvrir un ecran auquel
 * son role ne donne pas acces. On indique son role courant : dans un ERP, la
 * reponse utile est « demandez le droit a votre administrateur », pas un 403 nu.
 */
export default async function AccesRefusePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger-700">
          <ShieldAlert className="size-7" />
        </span>

        <h1 className="mt-5 text-xl font-bold text-primary-900">Accès refusé</h1>
        <p className="mt-2 text-sm text-surface-500">
          Votre rôle ne vous autorise pas à consulter cette page.
          {user ? (
            <>
              {" "}
              Vous êtes connecté en tant que{" "}
              <strong className="font-semibold text-surface-700">
                {ROLE_LABELS[user.role]}
              </strong>
              .
            </>
          ) : null}
        </p>
        <p className="mt-2 text-sm text-surface-500">
          Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez le
          responsable RH ou l&apos;administrateur de l&apos;application.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <LinkButton href="/tableau-de-bord" variant="primary">
            Retour au tableau de bord
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
