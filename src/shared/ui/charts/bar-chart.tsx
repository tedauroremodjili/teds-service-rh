import { cn } from "@/shared/lib/utils";

import { ENCRE, RAMPE_BLEUE } from "./palette";
import { ChartEmpty, ChartTable } from "./chart-frame";

/**
 * Barres horizontales — comparer des grandeurs, du plus grand au plus petit.
 *
 * Une seule teinte, volontairement. Ce graphique repond a « combien », pas a
 * « lequel » : donner une couleur differente a chaque barre depenserait le
 * canal de l'identite pour re-encoder ce que la longueur dit deja. La teinte
 * s'assombrit avec le rang, ce qui souligne le classement sans ajouter de sens.
 *
 * L'orientation horizontale est choisie parce que les libelles sont longs
 * (noms d'agents, de departements) : ils se lisent a l'horizontale sans etre
 * inclines ni tronques.
 */

export interface LigneBarres {
  label: string;
  value: number;
  /** Complement facultatif affiche sous le libelle (poste, departement...). */
  detail?: string;
}

export function BarChart({
  data,
  formatValue,
  messageVide = "Aucune donnée sur la période",
  intituleValeur = "Valeur",
  className,
}: {
  data: LigneBarres[];
  formatValue: (valeur: number) => string;
  messageVide?: string;
  intituleValeur?: string;
  className?: string;
}) {
  const lignes = [...data].filter((ligne) => ligne.value > 0).sort((a, b) => b.value - a.value);

  if (lignes.length === 0) {
    return <ChartEmpty message={messageVide} hauteur={160} />;
  }

  // L'echelle part du maximum : la barre la plus longue remplit la piste.
  const maximum = lignes[0].value;

  return (
    <div className={className}>
      <ul className="space-y-3">
        {lignes.map((ligne, index) => {
          const proportion = ligne.value / maximum;
          // Les rangs suivants prennent des pas plus clairs de la meme rampe.
          const couleur = RAMPE_BLEUE[Math.min(RAMPE_BLEUE.length - 1, 5 - Math.min(index, 4))];

          return (
            <li key={`${ligne.label}-${index}`}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-surface-700">
                  {ligne.label}
                  {ligne.detail ? (
                    <span className="ml-1.5 text-xs text-surface-400">{ligne.detail}</span>
                  ) : null}
                </span>
                {/* Valeur ecrite systematiquement : la couleur ne porte rien seule. */}
                <span className="shrink-0 text-sm font-semibold tabular-nums text-surface-800">
                  {formatValue(ligne.value)}
                </span>
              </div>

              <div
                className="h-2.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: ENCRE.grille }}
                role="img"
                aria-label={`${ligne.label} : ${formatValue(ligne.value)}`}
              >
                {/*
                  Extremite arrondie du cote de la donnee, carree a la base :
                  la barre garde son origine visuellement ancree a zero.
                */}
                <div
                  className={cn("h-full rounded-r-[4px] transition-[width] duration-500")}
                  style={{
                    width: `${Math.max(proportion * 100, 1.5)}%`,
                    backgroundColor: couleur,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <ChartTable
        entetes={["Libellé", intituleValeur]}
        lignes={lignes.map((ligne) => [
          ligne.detail ? `${ligne.label} (${ligne.detail})` : ligne.label,
          formatValue(ligne.value),
        ])}
      />
    </div>
  );
}
