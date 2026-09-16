import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Habillage commun a tous les graphiques : legende et vue tableau.
 *
 * La vue tableau n'est pas un supplement : c'est ce qui rend le graphique
 * lisible quand la couleur ne suffit pas (impression noir et blanc, daltonisme,
 * lecteur d'ecran). Elle est repliee par defaut, jamais absente.
 */

export interface SerieLegende {
  label: string;
  couleur: string;
  /** Valeur deja formatee — la legende chiffree remplace la lecture par couleur. */
  valeur?: string;
  part?: string;
}

export function ChartLegend({
  series,
  className,
}: {
  series: SerieLegende[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {series.map((serie) => (
        <li key={serie.label} className="flex items-center gap-2 text-xs">
          {/* La pastille porte l'identite ; le texte reste en encre neutre. */}
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: serie.couleur }}
          />
          <span className="text-surface-600">{serie.label}</span>
          {serie.valeur ? (
            <span className="font-semibold tabular-nums text-surface-800">{serie.valeur}</span>
          ) : null}
          {serie.part ? <span className="text-surface-400">{serie.part}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function ChartTable({
  entetes,
  lignes,
  legende = "Voir les données",
}: {
  entetes: string[];
  lignes: Array<Array<string | number>>;
  legende?: string;
}) {
  return (
    <details className="group mt-4">
      <summary className="cursor-pointer list-none text-xs font-medium text-surface-500 transition-colors hover:text-primary-700">
        <span className="underline decoration-dotted underline-offset-2">{legende}</span>
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-surface-200">
              {entetes.map((entete, index) => (
                <th
                  key={entete}
                  scope="col"
                  className={cn(
                    "px-2 py-1.5 font-medium text-surface-500",
                    index === 0 ? "text-left" : "text-right",
                  )}
                >
                  {entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {lignes.map((ligne, indexLigne) => (
              <tr key={indexLigne}>
                {ligne.map((cellule, indexCellule) => (
                  <td
                    key={indexCellule}
                    className={cn(
                      "px-2 py-1.5 text-surface-700",
                      indexCellule === 0 ? "text-left" : "text-right tabular-nums",
                    )}
                  >
                    {cellule}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Message affiche a la place d'un graphique sans donnee. */
export function ChartEmpty({ message, hauteur = 200 }: { message: string; hauteur?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-surface-200 text-sm text-surface-400"
      style={{ height: hauteur }}
    >
      {message}
    </div>
  );
}

export function ChartBlock({ children }: { children: ReactNode }) {
  return <div className="w-full overflow-x-auto">{children}</div>;
}
