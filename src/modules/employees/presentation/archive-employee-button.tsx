"use client";

import { useActionState } from "react";
import { Archive } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";

import { archiveEmployeeAction, type ArchiveEmployeeFormState } from "./actions";

/**
 * Archivage d'une fiche employe.
 *
 * Archivage et non suppression : la fiche reste citee dans l'historique de
 * paie et les ventes deja realisees. L'effacer rendrait ces traces muettes —
 * meme raisonnement que `ArchiveUserButton` (module users).
 */
export function ArchiveEmployeeButton({ employeeId, label }: { employeeId: string; label: string }) {
  const [state, formAction, pending] = useActionState<ArchiveEmployeeFormState, FormData>(
    archiveEmployeeAction,
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
              `Archiver la fiche de « ${label} » ? Elle sortira des listes mais restera dans l'historique.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={employeeId} />
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          <Archive className="size-4" />
          {pending ? "Archivage…" : "Archiver la fiche"}
        </Button>
      </form>
    </div>
  );
}
