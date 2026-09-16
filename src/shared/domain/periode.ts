/**
 * Periode mensuelle — contrat partage par les journaux (caisse, comptabilite).
 *
 * Un journal se tient par mois : c'est la maille du rapprochement et de la
 * cloture. Le mois voyage dans l'URL (?mois=2026-08), ce qui rend une periode
 * partageable par lien.
 */

export interface Mois {
  debut: Date;
  /** Premier jour du mois suivant : la borne haute est EXCLUSIVE. */
  fin: Date;
  /** Format « 2026-08 », attendu par un champ <input type="month">. */
  champ: string;
  annee: number;
  /** Mois de 1 a 12. */
  mois: number;
}

export function parseMois(valeur?: string | null): Mois {
  const maintenant = new Date();
  let annee = maintenant.getFullYear();
  let index = maintenant.getMonth();

  if (valeur && /^\d{4}-\d{2}$/.test(valeur)) {
    const [anneeLue, moisLu] = valeur.split("-").map(Number);
    if (moisLu >= 1 && moisLu <= 12) {
      annee = anneeLue;
      index = moisLu - 1;
    }
  }

  return {
    debut: new Date(annee, index, 1),
    fin: new Date(annee, index + 1, 1),
    champ: `${annee}-${String(index + 1).padStart(2, "0")}`,
    annee,
    mois: index + 1,
  };
}
