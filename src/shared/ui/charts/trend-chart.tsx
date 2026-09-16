"use client";

import { useRef, useState } from "react";

import { formatCompact, formatMoney, formatNumber } from "@/shared/lib/format";

import { couleurSerie, ENCRE } from "./palette";
import { ChartEmpty, ChartLegend, ChartTable } from "./chart-frame";

/**
 * Evolution dans le temps — une ou deux series sur douze mois.
 *
 * Composant CLIENT, et pour une seule raison : le survol. Un graphique de
 * tendance sans lecture au pointeur oblige a deviner les valeurs entre deux
 * graduations. Le reticule et l'infobulle donnent la valeur exacte de chaque
 * serie au mois pointe.
 *
 * Regles de trace respectees ici :
 *  - un seul axe des ordonnees, jamais deux echelles superposees ;
 *  - traits de 2 px, aplat de remplissage a 10 % d'opacite ;
 *  - grille en gris d'un pas au-dessus de la surface, pleine et discrete ;
 *  - etiquettes de fin sur chaque serie, plutot qu'une valeur sur chaque point ;
 *  - anneau de surface de 2 px sur les points, pour qu'ils restent lisibles
 *    quand deux courbes se croisent.
 */

export interface PointTemps {
  /** Libelle court affiche sous l'axe (« août »). */
  label: string;
  /** Libelle complet, utilise dans l'infobulle et le tableau (« août 2026 »). */
  labelLong?: string;
  values: number[];
}

/**
 * Nature des valeurs tracees.
 *
 * On transmet un DESCRIPTEUR, pas une fonction de formatage : ce composant est
 * un composant client, et une fonction ne traverse pas la frontiere
 * serveur/client — elle n'est pas serialisable. Le composant choisit lui-meme
 * le formateur correspondant.
 */
export type FormatValeurs = "montant" | "nombre";

const MARGE = { haut: 16, droite: 56, bas: 28, gauche: 56 };
const LARGEUR = 720;
const HAUTEUR = 260;

export function TrendChart({
  points,
  series,
  format = "montant",
  messageVide = "Aucune donnée sur la période",
}: {
  points: PointTemps[];
  series: string[];
  format?: FormatValeurs;
  messageVide?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [indexSurvole, setIndexSurvole] = useState<number | null>(null);

  // Valeur exacte dans l'infobulle et le tableau, graduation compacte sur
  // l'axe : la place y est comptee et l'ordre de grandeur suffit.
  const formatValue = format === "montant" ? formatMoney : formatNumber;
  const tick = format === "montant" ? formatCompact : formatNumber;

  if (points.length === 0 || series.length === 0) {
    return <ChartEmpty message={messageVide} hauteur={HAUTEUR} />;
  }

  const toutesValeurs = points.flatMap((point) => point.values);
  const maximumBrut = Math.max(...toutesValeurs, 0);
  // Echelle arrondie vers le haut : les graduations tombent sur des nombres ronds.
  const maximum = arrondirEchelle(maximumBrut);

  const largeurTracee = LARGEUR - MARGE.gauche - MARGE.droite;
  const hauteurTracee = HAUTEUR - MARGE.haut - MARGE.bas;

  const x = (index: number) =>
    points.length === 1
      ? MARGE.gauche + largeurTracee / 2
      : MARGE.gauche + (index / (points.length - 1)) * largeurTracee;

  const y = (valeur: number) =>
    MARGE.haut + hauteurTracee - (maximum === 0 ? 0 : (valeur / maximum) * hauteurTracee);

  const graduations = [0, 0.25, 0.5, 0.75, 1].map((ratio) => maximum * ratio);

  /** Une serie n'est en aplat que si elle est seule : sinon les aplats se masquent. */
  const avecAplat = series.length === 1;

  const pointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    // Le SVG est mis a l'echelle par son viewBox : on repasse en coordonnees
    // internes avant de chercher le mois le plus proche.
    const positionInterne = ((event.clientX - rect.left) / rect.width) * LARGEUR;
    const ratio = (positionInterne - MARGE.gauche) / largeurTracee;
    const index = Math.round(ratio * (points.length - 1));

    setIndexSurvole(Math.min(points.length - 1, Math.max(0, index)));
  };

  const pointActif = indexSurvole === null ? null : points[indexSurvole];

  return (
    <div>
      {series.length > 1 ? (
        <ChartLegend
          className="mb-3"
          series={series.map((label, index) => ({ label, couleur: couleurSerie(index) }))}
        />
      ) : null}

      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
          className="h-[260px] w-full min-w-[520px]"
          onPointerMove={pointer}
          onPointerLeave={() => setIndexSurvole(null)}
          role="img"
          aria-label={`Évolution sur ${points.length} périodes`}
        >
          {/* --- Grille et graduations --- */}
          {graduations.map((valeur) => (
            <g key={valeur}>
              <line
                x1={MARGE.gauche}
                x2={LARGEUR - MARGE.droite}
                y1={y(valeur)}
                y2={y(valeur)}
                stroke={ENCRE.grille}
                strokeWidth={1}
              />
              <text
                x={MARGE.gauche - 8}
                y={y(valeur) + 3}
                textAnchor="end"
                style={{ fontSize: 10, fill: ENCRE.texteAttenue }}
                className="tabular-nums"
              >
                {tick(valeur)}
              </text>
            </g>
          ))}

          {/* --- Axe des mois --- */}
          {points.map((point, index) => (
            <text
              key={`${point.label}-${index}`}
              x={x(index)}
              y={HAUTEUR - 8}
              textAnchor="middle"
              style={{ fontSize: 10, fill: ENCRE.texteAttenue }}
            >
              {point.label}
            </text>
          ))}

          {/* --- Reticule --- */}
          {indexSurvole !== null ? (
            <line
              x1={x(indexSurvole)}
              x2={x(indexSurvole)}
              y1={MARGE.haut}
              y2={MARGE.haut + hauteurTracee}
              stroke={ENCRE.axe}
              strokeWidth={1}
            />
          ) : null}

          {/* --- Series --- */}
          {series.map((label, indexSerie) => {
            const couleur = couleurSerie(indexSerie);
            const valeurs = points.map((point) => point.values[indexSerie] ?? 0);
            const ligne = valeurs.map((valeur, i) => `${x(i)},${y(valeur)}`).join(" ");
            const derniereValeur = valeurs[valeurs.length - 1];

            return (
              <g key={label}>
                {avecAplat ? (
                  <polygon
                    points={`${MARGE.gauche},${y(0)} ${ligne} ${x(points.length - 1)},${y(0)}`}
                    fill={couleur}
                    opacity={0.1}
                  />
                ) : null}

                <polyline
                  points={ligne}
                  fill="none"
                  stroke={couleur}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Point de fin, avec anneau de surface. */}
                <circle
                  cx={x(points.length - 1)}
                  cy={y(derniereValeur)}
                  r={4}
                  fill={couleur}
                  stroke={ENCRE.surface}
                  strokeWidth={2}
                />

                {/* Point survole, mis en avant. */}
                {indexSurvole !== null ? (
                  <circle
                    cx={x(indexSurvole)}
                    cy={y(valeurs[indexSurvole])}
                    r={4.5}
                    fill={couleur}
                    stroke={ENCRE.surface}
                    strokeWidth={2}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* Infobulle en HTML : le texte y reste selectionnable et bien rendu. */}
        {pointActif ? (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-xs shadow-card"
            style={{
              left: `${(x(indexSurvole!) / LARGEUR) * 100}%`,
              transform:
                indexSurvole! > points.length / 2 ? "translateX(-105%)" : "translateX(5%)",
            }}
          >
            <p className="mb-1 font-semibold text-surface-800">
              {pointActif.labelLong ?? pointActif.label}
            </p>
            <ul className="space-y-0.5">
              {series.map((label, index) => (
                <li key={label} className="flex items-center gap-2 whitespace-nowrap">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: couleurSerie(index) }}
                  />
                  <span className="text-surface-500">{label}</span>
                  <span className="ml-auto font-semibold tabular-nums text-surface-800">
                    {formatValue(pointActif.values[index] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ChartTable
        entetes={["Période", ...series]}
        lignes={points.map((point) => [
          point.labelLong ?? point.label,
          ...series.map((_, index) => formatValue(point.values[index] ?? 0)),
        ])}
      />
    </div>
  );
}

/** Arrondit le haut d'echelle a un nombre rond (1, 2, 5 x 10^n). */
function arrondirEchelle(maximum: number): number {
  if (maximum <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const normalise = maximum / magnitude;

  const palier = normalise <= 1 ? 1 : normalise <= 2 ? 2 : normalise <= 5 ? 5 : 10;
  return palier * magnitude;
}
