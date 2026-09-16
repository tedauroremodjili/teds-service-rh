"use client";

import { useActionState, useEffect } from "react";
import { Archive } from "lucide-react";

import { archiveUserAction, type AccessFormState } from "./actions";

/**
 * Version compacte de `ArchiveUserButton`, pour une ligne de tableau.
 *
 * Meme action serveur, meme confirmation — seule la presentation change :
 * une icone au lieu d'un bouton plein, pour tenir dans la colonne d'actions
 * de la liste sans forcer un detour par la fiche du compte.
 */
export function ArchiveUserRowButton({ userId, label }: { userId: string; label: string }) {
  const [state, formAction, pending] = useActionState<AccessFormState, FormData>(
    archiveUserAction,
    {},
  );

  // Espace de la ligne trop etroit pour une alerte en place : le message
  // d'erreur (droits insuffisants, cible invalide...) reste donc signale,
  // simplement pas en ligne.
  useEffect(() => {
    if (state.tone === "danger" && state.message) {
      window.alert(state.message);
    }
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Archiver le compte de « ${label} » ? Il ne pourra plus se connecter et sortira des listes, mais son historique est conservé.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={userId} />
      <button
        type="submit"
        title="Archiver le compte"
        aria-label={`Archiver le compte de ${label}`}
        disabled={pending}
        className="flex size-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-50"
      >
        <Archive className="size-4" />
      </button>
    </form>
  );
}
