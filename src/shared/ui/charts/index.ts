/**
 * Bibliotheque de visualisation de TED'S SERVICE.
 *
 * Tout est rendu en SVG ou en HTML : aucune dependance de graphiques n'est
 * installee. Un ERP affiche des parts, des classements et des series
 * mensuelles — trois formes, qui tiennent en quelques centaines de lignes et
 * se rendent cote serveur. Ajouter une bibliotheque aurait alourdi le paquet
 * client sans rien apporter a ces trois formes.
 *
 * Choisir la forme AVANT la couleur :
 *   - une part d'un tout          -> DonutChart
 *   - un classement, une grandeur -> BarChart
 *   - une evolution dans le temps -> TrendChart
 *   - une tendance dans une tuile -> Sparkline
 */

export { DonutChart, type PartCamembert } from "./donut-chart";
export { BarChart, type LigneBarres } from "./bar-chart";
export { TrendChart, type PointTemps } from "./trend-chart";
export { Sparkline } from "./sparkline";
export { ChartEmpty, ChartLegend, ChartTable, type SerieLegende } from "./chart-frame";
export {
  couleurSerie,
  ENCRE,
  MAX_CATEGORIES,
  RAMPE_BLEUE,
  replierCategories,
  SERIES,
  STATUT,
} from "./palette";
