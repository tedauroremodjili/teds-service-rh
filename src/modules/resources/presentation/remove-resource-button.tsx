"use client";

import { useActionState } from "react";
import { Archive, Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";

import { removeResourceAction, type ResourceFormState } from "./actions";

/**
 * Bouton de suppression (logique ou definitive selon la ressource).
 *
 * La confirmation est cote client — c'est un garde-fou d'interface. Le refus
 * qui compte est celui du serveur : les ressources a valeur comptable
 * declarent `deletable: false` et l'action renvoie alors un message, affiche
 * ici tel quel.
 */
export function RemoveResourceButton({
  resourceKey,
  id,
  label,
  softDelete,
}: {
  resourceKey: string;
  id: string;
  /** Nom affiche dans la demande de confirmation. */
  label: string;
  softDelete: boolean;
}) {
  const [state, formAction, pending] = useActionState<ResourceFormState, FormData>(
    removeResourceAction.bind(null, resourceKey),
    {},
  );

  const question = softDelete
    ? `Archiver « ${label} » ? La fiche sortira des listes mais restera dans l'historique.`
    : `Supprimer définitivement « ${label} » ? Cette action est irréversible.`;

  return (
    <div className="space-y-2">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(question)) event.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {softDelete ? <Archive className="size-4" /> : <Trash2 className="size-4" />}
          {pending ? "Suppression…" : softDelete ? "Archiver" : "Supprimer"}
        </Button>
      </form>
    </div>
  );
}
