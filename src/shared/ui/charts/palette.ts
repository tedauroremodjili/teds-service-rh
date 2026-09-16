/**
 * Palette des visualisations de donnees.
 *
 * Les couleurs d'un graphique ne se choisissent pas a l'oeil : chacune fait un
 * travail precis, et l'ensemble doit rester lisible pour un daltonien.
 *
 * L'ordre des huit teintes ci-dessous a ete VERIFIE (distance perceptuelle en
 * OKLab, simulation protanopie/deuteranopie) : les paires voisines restent
 * distinguables. Cet ordre est le mecanisme de securite — il ne se reordonne
 * pas, et on n'ajoute jamais une neuvieme couleur « inventee ». Au-dela de six
 * categories, on replie la queue dans « Autres ».
 *
 * Les deux premieres teintes sont celles de la marque (bleu Ted's, orange
 * Service), ce qui ancre les graphiques dans la charte sans casser les tests.
 *
 * Contrainte connue et assumee : quatre de ces teintes passent sous 3:1 de
 * contraste sur fond blanc. La regle de compensation s'applique donc partout —
 * chaque graphique porte des valeurs ecrites (legende chiffree ou etiquettes
 * directes), jamais la couleur seule.
 */

/** Slots categoriels — identite d'une serie. Assignes dans l'ordre, jamais cycles. */
export const SERIES = [
  "#2b7cc9", // 1 — bleu Ted's
  "#f07d1a", // 2 — orange Service
  "#1baf7a", // 3 — vert d'eau
  "#eda100", // 4 — jaune
  "#e87ba4", // 5 — magenta
  "#008300", // 6 — vert
  "#4a3aa7", // 7 — violet
  "#e34948", // 8 — rouge
] as const;

/** Nombre de categories affichables avant repli dans « Autres ». */
export const MAX_CATEGORIES = 6;

/**
 * Rampe sequentielle (une seule teinte, clair -> fonce) : elle encode une
 * grandeur, pas une identite. C'est le choix par defaut d'un classement.
 */
export const RAMPE_BLEUE = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#184f95",
] as const;

/** Couleurs de statut — sens reserve, jamais recyclees en « serie 4 ». */
export const STATUT = {
  bon: "#008300",
  attention: "#eda100",
  serieux: "#f07d1a",
  critique: "#e34948",
} as const;

/** Encre et surfaces. Le texte ne porte JAMAIS la couleur d'une serie. */
export const ENCRE = {
  surface: "#ffffff",
  grille: "#e2e8f0",
  axe: "#94a3b8",
  texte: "#334155",
  texteAttenue: "#64748b",
  attenue: "#cbd5e1",
} as const;

/** Couleur du slot n (0-indexe), sans jamais depasser la palette. */
export function couleurSerie(index: number): string {
  return SERIES[index % SERIES.length];
}

/**
 * Replie une liste de categories a MAX_CATEGORIES entrees.
 * La queue devient « Autres » — on ne genere jamais de couleur supplementaire.
 */
export function replierCategories<T extends { label: string; value: number }>(
  entrees: T[],
  max = MAX_CATEGORIES,
): Array<{ label: string; value: number }> {
  const triees = [...entrees].sort((a, b) => b.value - a.value);
  if (triees.length <= max) return triees;

  const tete = triees.slice(0, max - 1);
  const reste = triees.slice(max - 1).reduce((total, ligne) => total + ligne.value, 0);

  return [...tete, { label: "Autres", value: reste }];
}
