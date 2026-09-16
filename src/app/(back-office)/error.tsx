"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button, LinkButton } from "@/shared/ui/button";

/**
 * Frontiere d'erreur du back-office.
 *
 * Un fichier error.tsx doit etre un composant CLIENT : React a besoin d'un
 * gestionnaire cote navigateur pour intercepter l'erreur et proposer une
 * nouvelle tentative sans rechargement complet de la page.
 *
 * Le message technique n'est jamais affiche tel quel : il pourrait reveler la
 * structure de la base. On journalise cote serveur, on rassure cote utilisateur.
 */
export default function BackOfficeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[back-office]", error);
  }, [error]);

  const estAutorisation =
    error.message === "NON_AUTORISE" || error.message === "NON_AUTHENTIFIE";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-50 text-danger-700">
          <AlertTriangle className="size-7" />
        </span>

        <h1 className="mt-5 text-lg font-bold text-primary-900">
          {estAutorisation ? "Action non autorisée" : "Une erreur est survenue"}
        </h1>
        <p className="mt-2 text-sm text-surface-500">
          {estAutorisation
            ? "Votre rôle ne vous permet pas d'effectuer cette opération."
            : "L'opération n'a pas pu aboutir. Vous pouvez réessayer ; si le problème persiste, contactez l'administrateur."}
        </p>

        {error.digest ? (
          <p className="mt-3 font-mono text-[0.7rem] text-surface-400">
            Référence : {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={reset}>
            Réessayer
          </Button>
          <LinkButton href="/tableau-de-bord">Tableau de bord</LinkButton>
        </div>
      </div>
    </div>
  );
}
