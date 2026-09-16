import { couleurSerie, ENCRE, replierCategories } from "./palette";
import { ChartEmpty, ChartLegend, ChartTable } from "./chart-frame";

/**
 * Camembert en anneau — repartition d'un tout en parts.
 *
 * Trois partis pris :
 *
 *  - **Anneau plutot que disque plein.** Le centre libere accueille le total,
 *    qui est presque toujours l'information la plus utile.
 *  - **Au plus six parts.** L'oeil ne compare pas des angles au-dela ; la queue
 *    est repliee dans « Autres » plutot que de reclamer une septieme couleur.
 *  - **Legende chiffree.** Les parts portent leur valeur et leur pourcentage :
 *    aucune lecture ne repose sur la couleur seule.
 *
 * Le trace utilise `stroke-dasharray` sur un cercle : les 2 px de separation
 * entre parts sont obtenus en raccourcissant chaque arc, donc en laissant voir
 * la surface — jamais en dessinant un contour, qui ajouterait de l'encre.
 */

export interface PartCamembert {
  label: string;
  value: number;
}

export function DonutChart({
  data,
  formatValue,
  titreCentre,
  taille = 200,
  epaisseur = 26,
  messageVide = "Aucune donnée sur la période",
}: {
  data: PartCamembert[];
  /** Formatage des valeurs (montant, effectif...). */
  formatValue: (valeur: number) => string;
  /** Intitule sous le total, au centre de l'anneau. */
  titreCentre: string;
  taille?: number;
  epaisseur?: number;
  messageVide?: string;
}) {
  const parts = replierCategories(data).filter((part) => part.value > 0);
  const total = parts.reduce((somme, part) => somme + part.value, 0);

  if (total <= 0) {
    return <ChartEmpty message={messageVide} hauteur={taille} />;
  }

  const rayon = (taille - epaisseur) / 2;
  const circonference = 2 * Math.PI * rayon;
  const centre = taille / 2;

  /** Separation entre parts, exprimee en unites de perimetre. */
  const separation = parts.length > 1 ? 2 : 0;

  // Le decalage d'un segment est la somme des parts qui le precedent. On le
  // recalcule a partir des donnees plutot que d'accumuler dans une variable :
  // le compilateur React interdit d'ecrire dans une variable de rendu, et une
  // fonction pure donne le meme resultat a chaque passage.
  const segments = parts.map((part, index) => {
    const longueur = (part.value / total) * circonference;
    const debut = parts
      .slice(0, index)
      .reduce((somme, precedente) => somme + (precedente.value / total) * circonference, 0);

    return {
      ...part,
      couleur: couleurSerie(index),
      part: part.value / total,
      // On raccourcit l'arc de la separation, sans jamais passer sous zero.
      longueurVisible: Math.max(longueur - separation, 0.5),
      decalage: -debut,
    };
  });

  return (
    <div>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <svg
          width={taille}
          height={taille}
          viewBox={`0 0 ${taille} ${taille}`}
          role="img"
          aria-label={`${titreCentre} : ${formatValue(total)}`}
          className="shrink-0"
        >
          {/* Piste de fond : l'anneau reste lisible meme avec une seule part. */}
          <circle
            cx={centre}
            cy={centre}
            r={rayon}
            fill="none"
            stroke={ENCRE.grille}
            strokeWidth={epaisseur}
          />

          {/* -90° place le depart en haut, sens horaire. */}
          <g transform={`rotate(-90 ${centre} ${centre})`}>
            {segments.map((segment) => (
              <circle
                key={segment.label}
                cx={centre}
                cy={centre}
                r={rayon}
                fill="none"
                stroke={segment.couleur}
                strokeWidth={epaisseur}
                strokeDasharray={`${segment.longueurVisible} ${circonference - segment.longueurVisible}`}
                strokeDashoffset={segment.decalage}
                className="transition-opacity duration-150 hover:opacity-80"
              >
                <title>{`${segment.label} — ${formatValue(segment.value)} (${formaterPart(segment.part)})`}</title>
              </circle>
            ))}
          </g>

          {/* Total au centre : la valeur qu'on lit en premier. */}
          <text
            x={centre}
            y={centre - 4}
            textAnchor="middle"
            className="fill-primary-900 text-lg font-bold"
            style={{ fontSize: 18 }}
          >
            {formatValue(total)}
          </text>
          <text
            x={centre}
            y={centre + 14}
            textAnchor="middle"
            style={{ fontSize: 10, fill: ENCRE.texteAttenue }}
          >
            {titreCentre}
          </text>
        </svg>

        <ChartLegend
          className="min-w-0 flex-1 sm:flex-col sm:items-start sm:gap-2"
          series={segments.map((segment) => ({
            label: segment.label,
            couleur: segment.couleur,
            valeur: formatValue(segment.value),
            part: formaterPart(segment.part),
          }))}
        />
      </div>

      <ChartTable
        entetes={["Catégorie", "Valeur", "Part"]}
        lignes={segments.map((segment) => [
          segment.label,
          formatValue(segment.value),
          formaterPart(segment.part),
        ])}
      />
    </div>
  );
}

function formaterPart(part: number): string {
  return `${(part * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}
