"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";

import { deleteRoleAction, type RoleFormState } from "./actions";

/**
 * Suppression d'un rôle.
 *
 * La confirmation du navigateur est un garde-fou d'interface ; les refus qui
 * comptent sont ceux du domaine — rôle système, rôle encore porté par des
 * comptes, ou rôle sous lequel on travaille — et leur message s'affiche ici.
 */
export function DeleteRoleButton({ name, label }: { name: string; label: string }) {
  const [state, formAction, pending] = useActionState<RoleFormState, FormData>(
    deleteRoleAction,
    {},
  );

  return (
    <div className="space-y-2">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(`Supprimer définitivement le rôle « ${label} » ?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="name" value={name} />
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          <Trash2 className="size-4" />
          {pending ? "Suppression…" : "Supprimer ce rôle"}
        </Button>
      </form>
    </div>
  );
}
