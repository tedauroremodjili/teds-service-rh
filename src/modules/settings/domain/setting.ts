/**
 * Vocabulaire du module 17 — parametres de l'entreprise.
 * Fichier de DOMAINE : aucune dependance technique.
 */

/** Categories connues, dans l'ordre d'affichage. */
export const SETTING_CATEGORIES = ["company", "finance", "hr", "general"] as const;
export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export const SETTING_CATEGORY_LABELS: Record<string, string> = {
  company: "Entreprise",
  finance: "Finances",
  hr: "Ressources humaines",
  general: "Général",
};

export const SETTING_CATEGORY_DESCRIPTIONS: Record<string, string> = {
  company: "Identité affichée sur les factures, les reçus et les certificats.",
  finance: "Monnaie et taux appliqués aux montants de l'application.",
  hr: "Règles de temps de travail et de congés utilisées par la paie.",
  general: "Autres réglages de l'application.",
};

/**
 * Rend une valeur JSON lisible.
 *
 * Les parametres sont stockes en JSON pour rester types (un taux est un nombre,
 * pas la chaine « 18 »). L'affichage doit donc traduire chaque forme, sans
 * jamais montrer un `[object Object]` a l'utilisateur.
 */
export function formatValeurParametre(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "—";
  if (typeof valeur === "boolean") return valeur ? "Activé" : "Désactivé";
  if (typeof valeur === "number") return valeur.toLocaleString("fr-FR");
  if (typeof valeur === "string") return valeur.length > 0 ? valeur : "—";
  if (Array.isArray(valeur)) return valeur.map((element) => formatValeurParametre(element)).join(", ");
  return JSON.stringify(valeur);
}

/** Ordre des categories : les connues d'abord, les autres a la suite. */
export function ordonnerCategories(categories: string[]): string[] {
  const connues = SETTING_CATEGORIES.filter((categorie) => categories.includes(categorie));
  const autres = categories
    .filter((categorie) => !(SETTING_CATEGORIES as readonly string[]).includes(categorie))
    .sort();
  return [...connues, ...autres];
}
