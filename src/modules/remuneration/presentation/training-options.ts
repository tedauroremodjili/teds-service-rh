/**
 * Regroupement des formations par categorie (Anglais, Informatique, ...).
 *
 * Fonction pure, partagee par le formulaire de bareme (`rule-form.tsx`) et le
 * raccourci d'acces rapide (`commission-quick-access.tsx`) : les deux
 * proposent le meme choix « une formation precise, ou toute une categorie »,
 * construit a partir du catalogue reel — une categorie ajoutee au catalogue
 * apparait ici le jour meme, sans rien coder en dur.
 */

export interface FormationCiblable {
  id: string;
  title: string;
  categoryId: string | null;
}

export interface CategorieCiblable {
  id: string;
  name: string;
}

export interface CategorieAvecFormations extends CategorieCiblable {
  formations: FormationCiblable[];
}

export function grouperFormationsParCategorie(
  formations: FormationCiblable[],
  categories: CategorieCiblable[],
): { categoriesAvecFormations: CategorieAvecFormations[]; formationsSansCategorie: FormationCiblable[] } {
  const categoriesAvecFormations = categories.map((categorie) => ({
    ...categorie,
    formations: formations.filter((formation) => formation.categoryId === categorie.id),
  }));

  const formationsSansCategorie = formations.filter((formation) => !formation.categoryId);

  return { categoriesAvecFormations, formationsSansCategorie };
}

/** Prefixes des valeurs d'un select de ciblage — voir `cibleFormation` dans les formulaires. */
export const PREFIXE_FORMATION = "formation:";
export const PREFIXE_CATEGORIE = "categorie:";

export function cibleVersChamps(cible: string): {
  trainingId: string;
  trainingCategoryId: string;
} {
  return {
    trainingId: cible.startsWith(PREFIXE_FORMATION) ? cible.slice(PREFIXE_FORMATION.length) : "",
    trainingCategoryId: cible.startsWith(PREFIXE_CATEGORIE)
      ? cible.slice(PREFIXE_CATEGORIE.length)
      : "",
  };
}
