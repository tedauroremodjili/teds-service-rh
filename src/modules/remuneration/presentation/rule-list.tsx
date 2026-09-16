"use client";

import { Power, Trash2 } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/ui/feedback";
import { Scale } from "lucide-react";

import {
  ACTIVITE_LABELS,
  decrireCalcul,
  PORTEE_LABELS,
  type RegleRemuneration,
} from "../domain/rule";
import { basculerRegleAction, supprimerRegleAction } from "./actions";

/**
 * Barème d'un employé : la liste de ses règles.
 *
 * Une règle se désactive plutôt qu'elle ne se supprime, quand elle a déjà servi
 * à calculer une paie : désactiver conserve la trace de ce qui s'appliquait,
 * supprimer l'efface. Les deux gestes sont proposés, dans cet ordre.
 */
export function RuleList({
  employeeId,
  regles,
  cibleParId,
  modifiable,
}: {
  employeeId: string;
  regles: RegleRemuneration[];
  /** Nom lisible d'une cible, indexé par identifiant. */
  cibleParId: Record<string, string>;
  modifiable: boolean;
}) {
  if (regles.length === 0) {
    return (
      <EmptyState
        icon={<Scale />}
        title="Aucune règle de rémunération"
        description="Tant que le barème est vide, cet employé ne touche que son salaire de base."
      />
    );
  }

  const nomCible = (regle: RegleRemuneration): string | null => {
    const id =
      regle.trainingId ??
      regle.trainingCategoryId ??
      regle.documentProductId ??
      regle.serviceId;

    if (id) return cibleParId[id] ?? "Cible supprimée";
    return regle.documentCategory ?? regle.serviceCategory ?? null;
  };

  return (
    <ul className="divide-y divide-surface-100">
      {regles.map((regle) => {
        const cible = nomCible(regle);

        return (
          <li
            key={regle.id}
            className={`flex flex-wrap items-start gap-3 px-5 py-4 ${regle.isActive ? "" : "opacity-60"}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-surface-800">{regle.label}</p>
                {!regle.isActive ? <Badge tone="neutral">inactive</Badge> : null}
              </div>

              <p className="mt-1 text-sm text-surface-600">
                <span className="font-semibold text-primary-800">{decrireCalcul(regle)}</span>
                {" — "}
                {ACTIVITE_LABELS[regle.activity].toLowerCase()}
                {cible ? (
                  <>
                    {" · "}
                    <span className="text-accent-700">{cible}</span>
                  </>
                ) : (
                  " · toutes cibles"
                )}
              </p>

              <p className="mt-0.5 text-xs text-surface-400">
                {PORTEE_LABELS[regle.portee]}
              </p>
            </div>

            {modifiable ? (
              <div className="flex shrink-0 items-center gap-1">
                <form action={basculerRegleAction.bind(null, employeeId, regle.id, !regle.isActive)}>
                  <button
                    type="submit"
                    title={regle.isActive ? "Désactiver la règle" : "Réactiver la règle"}
                    aria-label={regle.isActive ? "Désactiver la règle" : "Réactiver la règle"}
                    className="flex size-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-surface-100 hover:text-primary-700"
                  >
                    <Power className="size-4" />
                  </button>
                </form>

                <form
                  action={supprimerRegleAction.bind(null, employeeId, regle.id)}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        `Supprimer « ${regle.label} » ? Les décomptes déjà calculés seront recalculés sans elle.`,
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  <button
                    type="submit"
                    title="Supprimer la règle"
                    aria-label="Supprimer la règle"
                    className="flex size-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
