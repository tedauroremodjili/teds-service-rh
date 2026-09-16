/**
 * Vocabulaire de l'impression — module 18.
 *
 * Une piece imprimee n'est pas une page d'ecran mise en noir et blanc : elle a
 * un format (A4), un en-tete d'entreprise, un titre officiel, parfois deux
 * exemplaires sur la meme feuille, et une mention legale en pied. Ce fichier
 * declare, pour chaque ressource du catalogue, la forme que prend sa piece.
 *
 * Fichier de DOMAINE : ni Prisma, ni React, ni Next.js.
 */

/**
 * Les cinq gabarits du produit.
 *
 * - « bulletin »   : bulletin de paie, avec le detail brut / retenues / net ;
 * - « facture »    : piece de vente avec des lignes et des totaux ;
 * - « recu »       : encaissement ou decaissement, en deux exemplaires ;
 * - « certificat » : piece d'apparat, centree, avec cachet et signature ;
 * - « fiche »      : repli generique — toutes les valeurs de l'enregistrement.
 */
export type PrintTemplate = "bulletin" | "facture" | "recu" | "certificat" | "fiche";

export interface PrintableDocument {
  template: PrintTemplate;
  /** Titre officiel imprime dans le cartouche. */
  title: string;
  /**
   * Nombre d'exemplaires imprimes sur la meme feuille. Deux pour les recus :
   * la souche reste a la caisse, l'autre part avec le payeur.
   */
  copies: 1 | 2;
  /** Mention portee en pied de piece. */
  footnote?: string;
}

const FICHE: PrintableDocument = {
  template: "fiche",
  title: "Fiche",
  copies: 1,
};

/**
 * Gabarit par ressource.
 *
 * Toute ressource absente de cette table s'imprime en fiche generique : ajouter
 * une entree au catalogue donne donc immediatement une impression correcte, et
 * declarer un gabarit ici la rend officielle.
 */
const PAR_RESSOURCE: Readonly<Record<string, PrintableDocument>> = {
  salaires: {
    template: "bulletin",
    title: "Bulletin de paie",
    copies: 1,
    footnote:
      "Bulletin à conserver sans limitation de durée. Toute réclamation doit être adressée au service des ressources humaines dans les trente jours suivant sa remise.",
  },
  ventes: {
    template: "facture",
    title: "Facture",
    copies: 1,
    footnote: "Les documents vendus ne sont ni repris ni échangés.",
  },
  prestations: {
    template: "facture",
    title: "Facture de prestation",
    copies: 1,
    footnote:
      "Prestation réalisée conformément au devis accepté. Le solde éventuel est exigible à la livraison.",
  },
  inscriptions: {
    template: "facture",
    title: "Avis d'inscription",
    copies: 1,
    footnote:
      "L'inscription n'est définitive qu'après règlement intégral des frais de formation.",
  },
  paiements: {
    template: "recu",
    title: "Reçu de paiement",
    copies: 2,
    footnote: "Reçu à conserver — il fait foi du règlement.",
  },
  caisse: {
    template: "recu",
    title: "Pièce de caisse",
    copies: 2,
    footnote: "Pièce justificative à joindre au journal de caisse.",
  },
  certificats: {
    template: "certificat",
    title: "Certificat de formation",
    copies: 1,
    footnote:
      "L'authenticité de ce certificat peut être vérifiée auprès de l'établissement à l'aide de son code de vérification.",
  },
};

/** Gabarit d'une ressource ; la fiche generique a defaut. */
export function printableFor(resourceKey: string, singular: string): PrintableDocument {
  return PAR_RESSOURCE[resourceKey] ?? { ...FICHE, title: singular };
}

/** Vrai si la ressource a une piece dediee (et non la fiche generique). */
export function hasDedicatedDocument(resourceKey: string): boolean {
  return resourceKey in PAR_RESSOURCE;
}

/* -------------------------------------------------------------------------- */
/* Listes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Nombre de lignes imprimees au maximum.
 *
 * Une liste de plusieurs milliers de lignes bloquerait le navigateur avant
 * meme d'atteindre la boite de dialogue d'impression. Au-dela de ce seuil,
 * l'ecran le dit franchement plutot que de tronquer en silence.
 */
export const MAX_LIGNES_IMPRIMEES = 500;

/**
 * Orientation d'une liste : au-dela de six colonnes, le portrait tasse le
 * texte au point de le rendre illisible. Le paysage est alors la bonne reponse.
 */
export function listOrientation(columnCount: number): "portrait" | "landscape" {
  return columnCount > 6 ? "landscape" : "portrait";
}
