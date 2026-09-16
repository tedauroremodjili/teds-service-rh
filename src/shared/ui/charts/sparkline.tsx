import { ENCRE } from "./palette";

/**
 * Sparkline — la tendance d'une tuile de statistique.
 *
 * Sans axe, sans graduation, sans etiquette : elle ne donne pas de valeur, elle
 * donne une forme. La valeur exacte, c'est le chiffre affiche au-dessus.
 * Le trace reste en gris attenue et seul le dernier point porte la couleur
 * d'accent, pour que le regard aille a la periode courante.
 */
export function Sparkline({
  values,
  couleur,
  largeur = 96,
  hauteur = 28,
  ariaLabel,
}: {
  values: number[];
  /** Couleur du point courant. Le trace reste toujours attenue. */
  couleur: string;
  largeur?: number;
  hauteur?: number;
  ariaLabel?: string;
}) {
  if (values.length < 2) return null;

  const maximum = Math.max(...values);
  const minimum = Math.min(...values);
  const amplitude = maximum - minimum || 1;
  const marge = 3;

  const x = (index: number) => (index / (values.length - 1)) * (largeur - marge * 2) + marge;
  const y = (valeur: number) =>
    hauteur - marge - ((valeur - minimum) / amplitude) * (hauteur - marge * 2);

  const trace = values.map((valeur, index) => `${x(index)},${y(valeur)}`).join(" ");
  const dernier = values.length - 1;

  return (
    <svg
      width={largeur}
      height={hauteur}
      viewBox={`0 0 ${largeur} ${hauteur}`}
      role="img"
      aria-label={ariaLabel ?? "Tendance sur la période"}
      className="shrink-0"
    >
      <polyline
        points={trace}
        fill="none"
        stroke={ENCRE.attenue}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(dernier)}
        cy={y(values[dernier])}
        r={3}
        fill={couleur}
        stroke={ENCRE.surface}
        strokeWidth={2}
      />
    </svg>
  );
}
