"use client";

import { useActionState } from "react";
import { Archive } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";

import { archiveUserAction, type AccessFormState } from "./actions";

/**
 * Archivage d'un compte.
 *
 * Archivage et non suppression : l'identifiant du compte est cité dans le
 * journal d'audit et dans l'historique des ventes. L'effacer physiquement
 * rendrait ces traces muettes — « qui a validé cette paie ? » resterait sans
 * réponse.
 */
export function ArchiveUserButton({ userId, label }: { userId: string; label: string }) {
  const [state, formAction, pending] = useActionState<AccessFormState, FormData>(
    archiveUserAction,
    {},
  );

  return (
    <div className="space-y-2">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

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
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          <Archive className="size-4" />
          {pending ? "Archivage…" : "Archiver le compte"}
        </Button>
      </form>
    </div>
  );
}
