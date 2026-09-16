import { Lock, Timer } from "lucide-react";

/**
 * Contenu de la page vitrine qui reste code : le plan du site (URLs, titres,
 * descriptions de page) et la maquette fictive de l'aperçu.
 *
 * Le reste — modules du produit, arguments, étapes du parcours, FAQ — vit en
 * base (module 18, écrans `/modules-vitrine`, `/arguments-vitrine`,
 * `/etapes-vitrine`, `/faq` du back-office) : c'est un contenu que TED'S
 * SERVICE modifie lui-même, pas une description du produit qui suit le code.
 * Voir `infrastructure/module-queries.ts` et `infrastructure/faq-queries.ts`.
 *
 * Fichier de domaine au sens strict : il ne connait ni React, ni Prisma, ni la
 * base.
 */

/* -------------------------------------------------------------------------- */
/* Chiffres de l'aperçu                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Donnees de la maquette du tableau de bord.
 *
 * Elles sont FICTIVES et le restent : la vitrine est publique, elle ne doit
 * jamais lire la base. Mais elles traversent les VRAIS composants du produit —
 * memes tuiles, memes graphiques, memes couleurs — si bien que ce qu'on montre
 * ici est exactement ce que l'utilisateur trouvera apres connexion.
 */
export const APERCU = {
  effectif: 24,
  recettes: 8_450_000,
  depenses: 3_120_000,
  ventes: 187,
  documentsVendus: 342,
  apprenants: 156,
  salaires: 4_680_000,

  /** Douze mois de recettes et de depenses. */
  serie: [
    { mois: "sept.", recettes: 5_200_000, depenses: 2_600_000 },
    { mois: "oct.", recettes: 6_100_000, depenses: 2_800_000 },
    { mois: "nov.", recettes: 5_800_000, depenses: 2_950_000 },
    { mois: "déc.", recettes: 4_900_000, depenses: 3_400_000 },
    { mois: "janv.", recettes: 6_400_000, depenses: 2_700_000 },
    { mois: "févr.", recettes: 6_900_000, depenses: 2_850_000 },
    { mois: "mars", recettes: 7_600_000, depenses: 3_050_000 },
    { mois: "avr.", recettes: 7_100_000, depenses: 2_900_000 },
    { mois: "mai", recettes: 6_800_000, depenses: 3_200_000 },
    { mois: "juin", recettes: 5_900_000, depenses: 2_750_000 },
    { mois: "juil.", recettes: 7_400_000, depenses: 3_000_000 },
    { mois: "août", recettes: 8_450_000, depenses: 3_120_000 },
  ],

  /** Origine des recettes. */
  origines: [
    { label: "Formations", value: 4_620_000 },
    { label: "Documents administratifs", value: 1_890_000 },
    { label: "Prestations", value: 1_640_000 },
    { label: "Autres encaissements", value: 300_000 },
  ],

  /** Effectif par departement. */
  effectifs: [
    { label: "Formation", value: 8 },
    { label: "Commercial", value: 6 },
    { label: "Technique", value: 4 },
    { label: "Administration", value: 3 },
    { label: "Comptabilité", value: 2 },
    { label: "Direction", value: 1 },
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* Les pages de la vitrine                                                     */
/* -------------------------------------------------------------------------- */

export interface PageVitrine {
  href: string;
  /** Intitule court, dans le menu. */
  libelle: string;
  /** Surtitre du bandeau de la page. */
  surtitre: string;
  /** Titre de la page, affiche en grand. */
  titre: string;
  /** Phrase d'accroche sous le titre. */
  description: string;
}

/**
 * Une page par sujet, plutot qu'une longue page a ancres.
 *
 * Chaque sujet a ainsi sa propre URL — partageable, indexable, et retrouvable
 * dans l'historique du navigateur. La navigation cesse d'etre un defilement :
 * on sait ou l'on est, et le bouton « precedent » fait ce qu'on attend de lui.
 *
 * L'ordre de ce tableau est aussi celui du parcours : il alimente le menu, le
 * pied de page et les liens « precedent / suivant » en bas de chaque page.
 */
export const PAGES_VITRINE: readonly PageVitrine[] = [
  {
    href: "/fonctionnalites",
    libelle: "Fonctionnalités",
    surtitre: "Fonctionnalités",
    titre: "Tout ce que gère TED'S SERVICE ERP",
    description:
      "Quatorze modules qui partagent les mêmes données : une vente enregistrée par un commercial alimente sa commission, la caisse et le tableau de bord au même instant.",
  },
  {
    href: "/avantages",
    libelle: "Avantages",
    surtitre: "Avantages",
    titre: "Pourquoi choisir TED'S SERVICE ERP ?",
    description:
      "Un logiciel de gestion se juge à ce qu'il évite de refaire à la main. Voici ce qu'il fait à votre place.",
  },
  {
    href: "/fonctionnement",
    libelle: "Fonctionnement",
    surtitre: "Fonctionnement",
    titre: "Comment ça fonctionne",
    description:
      "Une seule saisie au départ. Tout le reste en découle : la commission, le salaire, la caisse et le rapport.",
  },
  {
    href: "/apercu",
    libelle: "Aperçu",
    surtitre: "Aperçu",
    titre: "Votre activité, en un écran",
    description:
      "Les chiffres ci-dessous sont fictifs, mais l'interface est celle du produit : mêmes tuiles, mêmes graphiques, mêmes couleurs.",
  },
  {
    href: "/questions",
    libelle: "Questions",
    surtitre: "Questions",
    titre: "Questions fréquentes",
    description: "Ce qu'on nous demande avant de commencer.",
  },
] as const;

/** Page precedente et page suivante, pour le parcours en bas d'ecran. */
export function voisinesDe(href: string): {
  precedente: PageVitrine | null;
  suivante: PageVitrine | null;
} {
  const index = PAGES_VITRINE.findIndex((page) => page.href === href);
  if (index === -1) return { precedente: null, suivante: PAGES_VITRINE[0] ?? null };

  return {
    precedente: PAGES_VITRINE[index - 1] ?? null,
    suivante: PAGES_VITRINE[index + 1] ?? null,
  };
}

/** Icone de securite, reutilisee dans le pied de page. */
export const ICONES_PIED = { securite: Lock, rapidite: Timer } as const;
