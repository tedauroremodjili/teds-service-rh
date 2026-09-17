/**
 * Moteur de calcul de la remuneration.
 *
 * Fonction PURE : on lui donne des regles et des operations, elle rend des
 * lignes. Aucune date « maintenant », aucun acces reseau, aucun aleatoire — le
 * meme couple d'entrees donne toujours le meme decompte. C'est ce qui permet
 * de verifier le calcul de Tomo sur un exemple ecrit a la main, et de le
 * rejouer a l'identique quand la base a change.
 *
 * Regle d'or : UNE seule regle s'applique a une operation donnee. Sans cela,
 * « 10 % sur toutes les formations » et « 85 % sur l'anglais » se cumuleraient
 * a 95 % sur un cours d'anglais, ce que personne n'a voulu.
 */

import { Money } from "@/shared/domain/money";

import { specificite, type Activite, type RegleRemuneration } from "./rule";

/* -------------------------------------------------------------------------- */
/* Ce sur quoi on calcule                                                      */
/* -------------------------------------------------------------------------- */

/** Une ligne d'article, pour les ventes qui en comportent plusieurs. */
export interface ArticleOperation {
  productId: string;
  category: string;
  quantity: number;
  /** Montant de cette ligne dans l'operation. */
  amount: number;
  /**
   * Cout total de cette ligne (cout unitaire fige a la vente x quantite),
   * pour le mode MARGE. Null si le produit n'avait pas de cout renseigne —
   * la marge de cette ligne compte alors pour zero, plutot que de supposer un
   * cout inconnu.
   */
  costAmount?: number | null;
}

/**
 * Une operation remunerable : concretement, un encaissement confirme.
 *
 * On part du PAIEMENT et non de la vente, parce que c'est ce que dit la regle
 * metier — « 85 % de chaque somme versée ». Un enfant qui paie en trois fois
 * ouvre droit a trois lignes, au fil des versements.
 */
export interface OperationRemuneree {
  id: string;
  reference: string;
  date: Date;
  activity: Activite;
  /** Montant encaisse, assiette d'un pourcentage. */
  amount: number;
  libelle: string;

  /** Vendeur, pour la portee MES_OPERATIONS. */
  sellerId: string | null;

  // --- Elements de ciblage ---
  trainingId?: string | null;
  trainingCategoryId?: string | null;
  serviceId?: string | null;
  serviceCategory?: string | null;
  /** Articles d'une vente de documents. */
  articles?: ArticleOperation[];
}

/* -------------------------------------------------------------------------- */
/* Ce qu'on obtient                                                            */
/* -------------------------------------------------------------------------- */

export interface LigneRemuneration {
  operationId: string;
  reference: string;
  date: Date;
  libelle: string;
  activity: Activite;
  regleId: string;
  regleLabel: string;
  /** Assiette effectivement retenue (peut etre une partie de l'encaissement). */
  base: number;
  /** Quantite retenue, pour un montant fixe par article. */
  quantite: number;
  montant: number;
  /** Formule affichee dans le decompte : « 85 % de 10 000 FCFA ». */
  detail: string;
}

export interface DecompteRemuneration {
  lignes: LigneRemuneration[];
  /** Total par activite, pour la synthese. */
  parActivite: Array<{ activity: Activite; montant: number; operations: number }>;
  total: number;
}

/* -------------------------------------------------------------------------- */
/* Appariement                                                                 */
/* -------------------------------------------------------------------------- */

/** Articles d'une operation vises par une regle. Toute la vente si sans cible. */
function articlesCibles(
  regle: RegleRemuneration,
  operation: OperationRemuneree,
): ArticleOperation[] {
  const articles = operation.articles ?? [];

  if (regle.documentProductId) {
    return articles.filter((article) => article.productId === regle.documentProductId);
  }
  if (regle.documentCategory) {
    return articles.filter((article) => article.category === regle.documentCategory);
  }

  return articles;
}

/** La regle vise-t-elle cette operation ? */
function correspond(regle: RegleRemuneration, operation: OperationRemuneree): boolean {
  if (!regle.isActive) return false;
  if (regle.activity !== operation.activity) return false;

  // Bornes de validite du bareme.
  if (regle.startDate && operation.date.getTime() < regle.startDate.getTime()) return false;
  if (regle.endDate && operation.date.getTime() > regle.endDate.getTime()) return false;

  // Portee : sur ses propres ventes, ou sur toute l'activite ciblee.
  if (regle.portee === "MES_OPERATIONS" && operation.sellerId !== regle.employeeId) {
    return false;
  }

  if (regle.trainingId && operation.trainingId !== regle.trainingId) return false;
  if (regle.trainingCategoryId && operation.trainingCategoryId !== regle.trainingCategoryId) {
    return false;
  }
  if (regle.serviceId && operation.serviceId !== regle.serviceId) return false;
  if (regle.serviceCategory && operation.serviceCategory !== regle.serviceCategory) return false;

  // Une regle ciblant un document exige qu'au moins un article corresponde.
  if (regle.documentProductId || regle.documentCategory) {
    return articlesCibles(regle, operation).length > 0;
  }

  return true;
}

/**
 * Regle retenue pour une operation : la plus specifique, puis la plus
 * prioritaire. Le depart d'egalite final se fait sur l'identifiant, pour que
 * deux executions donnent le meme resultat.
 */
function regleRetenue(
  regles: RegleRemuneration[],
  operation: OperationRemuneree,
): RegleRemuneration | null {
  const candidates = regles.filter((regle) => correspond(regle, operation));
  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    const parSpecificite = specificite(b) - specificite(a);
    if (parSpecificite !== 0) return parSpecificite;

    const parPriorite = b.priority - a.priority;
    if (parPriorite !== 0) return parPriorite;

    return a.id.localeCompare(b.id);
  })[0];
}

/* -------------------------------------------------------------------------- */
/* Calcul                                                                      */
/* -------------------------------------------------------------------------- */

function formaterMontant(valeur: number): string {
  return `${Math.round(valeur).toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;
}

/** Applique une regle a une operation. Renvoie null si le resultat est nul. */
function appliquer(
  regle: RegleRemuneration,
  operation: OperationRemuneree,
): LigneRemuneration | null {
  const articles = articlesCibles(regle, operation);
  const cibleDesArticles = Boolean(regle.documentProductId || regle.documentCategory);

  /**
   * Assiette. Quand la regle vise un produit precis au sein d'une vente qui en
   * comporte plusieurs, seule la part correspondante est remuneree — sinon
   * l'employe toucherait sur des articles que sa regle ne couvre pas.
   */
  const base = cibleDesArticles
    ? articles.reduce((somme, article) => somme + article.amount, 0)
    : operation.amount;

  const quantite = cibleDesArticles
    ? articles.reduce((somme, article) => somme + article.quantity, 0)
    : (operation.articles ?? []).reduce((somme, article) => somme + article.quantity, 0) || 1;

  let montant: number;
  let detail: string;

  if (regle.mode === "POURCENTAGE") {
    const taux = regle.rate ?? 0;
    montant = Money.fromPersistence(base).percentage(taux).amount;
    detail = `${taux.toLocaleString("fr-FR")} % de ${formaterMontant(base)}`;
  } else if (regle.mode === "MARGE") {
    // Le cout n'est connu que par article : un article sans cout renseigne
    // compte pour une marge nulle plutot que pour sa valeur pleine — mieux
    // vaut une commission sous-evaluee et visible qu'une marge inventee.
    const marge = articles.reduce(
      (somme, article) => somme + (article.amount - (article.costAmount ?? article.amount)),
      0,
    );
    const taux = regle.rate ?? 0;
    montant = Money.fromPersistence(marge).percentage(taux).amount;
    detail = `${taux.toLocaleString("fr-FR")} % de la marge (${formaterMontant(marge)})`;
  } else {
    const unitaire = regle.fixedAmount ?? 0;

    if (regle.fixedBasis === "PAR_ARTICLE") {
      montant = unitaire * quantite;
      detail = `${formaterMontant(unitaire)} × ${quantite} article${quantite > 1 ? "s" : ""}`;
    } else {
      montant = unitaire;
      detail = `${formaterMontant(unitaire)} forfaitaire`;
    }
  }

  if (montant <= 0) return null;

  return {
    operationId: operation.id,
    reference: operation.reference,
    date: operation.date,
    libelle: operation.libelle,
    activity: operation.activity,
    regleId: regle.id,
    regleLabel: regle.label,
    base,
    quantite,
    montant,
    detail,
  };
}

/**
 * Decompte de la remuneration d'un employe sur un ensemble d'operations.
 *
 * Les operations sont supposees deja filtrees sur la periode voulue : le
 * decoupage du temps est une affaire de requete, pas de calcul.
 */
export function calculerRemuneration(
  regles: RegleRemuneration[],
  operations: OperationRemuneree[],
): DecompteRemuneration {
  const lignes: LigneRemuneration[] = [];

  for (const operation of operations) {
    const regle = regleRetenue(regles, operation);
    if (!regle) continue;

    const ligne = appliquer(regle, operation);
    if (ligne) lignes.push(ligne);
  }

  // Tri chronologique : un decompte se lit dans l'ordre ou les faits se sont
  // produits, comme un releve.
  lignes.sort((a, b) => a.date.getTime() - b.date.getTime());

  const parActivite = new Map<Activite, { montant: number; operations: number }>();
  for (const ligne of lignes) {
    const cumul = parActivite.get(ligne.activity) ?? { montant: 0, operations: 0 };
    cumul.montant += ligne.montant;
    cumul.operations += 1;
    parActivite.set(ligne.activity, cumul);
  }

  return {
    lignes,
    parActivite: [...parActivite.entries()].map(([activity, cumul]) => ({
      activity,
      ...cumul,
    })),
    total: lignes.reduce((somme, ligne) => somme + ligne.montant, 0),
  };
}

/**
 * Salaire total du mois : le socle fixe plus ce que l'activite a rapporte.
 *
 * Un employe purement commissionne porte un salaire de base a zero ; un
 * comptable n'a aucune regle et ne touche que son socle. La meme formule
 * couvre les deux, sans cas particulier.
 */
export function salaireTotal(salaireDeBase: number, remuneration: number): number {
  return Math.round(salaireDeBase + remuneration);
}
