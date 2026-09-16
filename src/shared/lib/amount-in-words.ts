/**
 * Montant ecrit en toutes lettres, en francais.
 *
 * Une piece comptable qui circule sur papier porte la somme deux fois : en
 * chiffres et en lettres. C'est la mention qui fait foi en cas de litige, parce
 * qu'un chiffre se surcharge et qu'une lettre non. Un recu, une facture
 * acquittee et un bulletin de paie la portent donc tous.
 *
 * Fonction PURE : ni Prisma, ni React. Elle sert cote serveur comme cote client.
 *
 * Orthographe retenue : francais de reference (« soixante-dix »,
 * « quatre-vingt-dix ») et accord de « vingt » et « cent ».
 *
 * L'accord est la seule subtilite du fichier. Ces deux mots prennent un « s »
 * quand ils sont multiplies ET qu'aucun chiffre ne les suit :
 *
 *   deux cents          quatre-vingts         (rien ne suit : accord)
 *   deux cent trois     quatre-vingt-un       (un chiffre suit : invariable)
 *   trois cent mille    quatre-vingt mille    (« mille » est invariable, donc
 *                                              il compte comme un suivant)
 *   deux cents millions quatre-vingts millions (« million » est un nom : accord)
 *
 * D'ou le parametre `final` porte par les fonctions internes : il dit si le
 * groupe termine le nombre. Sans lui, on ecrit « trois cents mille », qui est
 * une faute sur toutes les pieces comptables produites par l'application.
 */

const UNITES = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];

const DIZAINES = [
  "",
  "",
  "vingt",
  "trente",
  "quarante",
  "cinquante",
  "soixante",
  "soixante",
  "quatre-vingt",
  "quatre-vingt",
];

/** 0 a 99. `final` : rien ne suit dans le nombre (cf. l'accord de « vingt »). */
function sousCent(n: number, final: boolean): string {
  if (n < 20) return UNITES[n];

  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  // 70 et 90 se construisent sur 60 et 80, avec un reste de 10 a 19 :
  // « soixante-dix », « soixante et onze », « quatre-vingt-dix-sept ».
  if (dizaine === 7 || dizaine === 9) {
    const base = dizaine === 7 ? "soixante" : "quatre-vingt";
    const reste = UNITES[10 + unite];
    // La liaison « et » ne vaut que pour 71 : on dit « quatre-vingt-onze ».
    return dizaine === 7 && unite === 1 ? `${base} et ${reste}` : `${base}-${reste}`;
  }

  // « quatre-vingts », mais « quatre-vingt mille ».
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";

  const base = DIZAINES[dizaine];
  if (unite === 0) return base;
  // « vingt et un », mais « quatre-vingt-un ».
  if (unite === 1 && dizaine !== 8) return `${base} et un`;
  return `${base}-${UNITES[unite]}`;
}

/** 0 a 999. `final` : rien ne suit dans le nombre (cf. l'accord de « cent »). */
function sousMille(n: number, final: boolean): string {
  const centaines = Math.floor(n / 100);
  const reste = n % 100;

  if (centaines === 0) return sousCent(reste, final);

  // « cent » et non « un cent » ; « deux cents » mais « deux cent trois ».
  const tete = centaines === 1 ? "cent" : `${UNITES[centaines]} cent`;
  if (reste === 0) return final && centaines > 1 ? `${tete}s` : tete;

  // Un reste suit : « cent » redevient invariable, quel que soit le contexte.
  return `${tete} ${sousCent(reste, final)}`;
}

const ECHELLES = [
  { valeur: 1_000_000_000, singulier: "milliard", pluriel: "milliards" },
  { valeur: 1_000_000, singulier: "million", pluriel: "millions" },
] as const;

/**
 * Nombre entier en toutes lettres. Les decimales sont ignorees : le franc CFA
 * n'a pas de subdivision en circulation, et tous les montants de l'application
 * sont arrondis a l'unite avant affichage.
 */
export function nombreEnLettres(valeur: number): string {
  if (!Number.isFinite(valeur)) return "";

  let reste = Math.abs(Math.round(valeur));
  if (reste === 0) return "zéro";

  const morceaux: string[] = [];

  for (const echelle of ECHELLES) {
    const quotient = Math.floor(reste / echelle.valeur);
    reste %= echelle.valeur;
    if (quotient === 0) continue;
    // « million » et « milliard » sont des noms : « deux cents millions ».
    morceaux.push(
      `${sousMille(quotient, true)} ${quotient === 1 ? echelle.singulier : echelle.pluriel}`,
    );
  }

  const milliers = Math.floor(reste / 1000);
  reste %= 1000;

  // « mille » est invariable, ne se fait jamais preceder de « un », et bloque
  // l'accord de ce qui le precede : « trois cent mille », « quatre-vingt mille ».
  if (milliers > 0) {
    morceaux.push(milliers === 1 ? "mille" : `${sousMille(milliers, false)} mille`);
  }
  if (reste > 0) morceaux.push(sousMille(reste, true));

  return morceaux.join(" ");
}

/** Devise par defaut de l'application, dans ses deux nombres. */
const DEVISE = { singulier: "franc CFA", pluriel: "francs CFA" };

/**
 * « Trois cent mille francs CFA » — la mention portee sur les pieces.
 *
 * La devise s'accorde : « un franc CFA », « zéro franc CFA », mais « deux
 * francs CFA ». La premiere lettre est capitalisee, la formule ouvrant une
 * phrase sur la piece.
 */
export function montantEnLettres(
  montant: number,
  devise: { singulier: string; pluriel: string } = DEVISE,
): string {
  if (!Number.isFinite(montant)) return "—";

  const entier = Math.round(Math.abs(montant));
  const unite = entier < 2 ? devise.singulier : devise.pluriel;

  const lettres = `${nombreEnLettres(entier)} ${unite}`;
  const phrase = montant < 0 ? `moins ${lettres}` : lettres;

  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}
