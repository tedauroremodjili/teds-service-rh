/**
 * Vocabulaire du module 7 — vente de documents administratifs.
 * Fichier de DOMAINE : aucune dependance technique.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

export const SALE_STATUSES = [
  "BROUILLON",
  "CONFIRMEE",
  "PAYEE",
  "PARTIELLEMENT_PAYEE",
  "ANNULEE",
] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

/**
 * Reste du sur une vente. Une vente annulee ne doit rien, quel que soit le
 * montant deja encaisse — le remboursement se traite a part.
 */
export function resteAPayer(totalAmount: number, paidAmount: number, status: SaleStatus): number {
  if (status === "ANNULEE") return 0;
  return Math.max(0, totalAmount - paidAmount);
}

/* -------------------------------------------------------------------------- */
/* Panier de vente                                                             */
/* -------------------------------------------------------------------------- */

/** Une vente reste saisissable a la main sans devenir un catalogue entier. */
export const MAX_SALE_LINES = 50;
/** Au-dela, une quantite tapee par erreur (ex. un zero de trop) doit etre refusee. */
export const MAX_LINE_QUANTITY = 999;

/** Une ligne de panier telle que soumise par le formulaire, avant relecture des prix. */
export interface SaleLineDraft {
  productId: string;
  quantity: number;
}

/**
 * Valide le panier envoye par le navigateur dans le champ cache `lines`.
 *
 * Meme logique que `parseBaremeInitial` (module remuneration) : JSON.parse
 * defensif, puis chaque ligne revalidee un a un avec un message qui la
 * designe par son rang. Le prix n'est jamais lu ici — il vient toujours
 * d'une relecture serveur du produit au moment de l'ecriture.
 */
export function parseSaleLines(raw: string | null | undefined): Result<SaleLineDraft[]> {
  const texte = raw?.trim();

  if (!texte) {
    return fail(DomainError.validation("Choisissez au moins un document à vendre.", "lines"));
  }

  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    return fail(
      DomainError.validation("Le panier saisi n'a pas pu être lu. Rechargez la page.", "lines"),
    );
  }

  if (!Array.isArray(brut) || brut.length === 0) {
    return fail(DomainError.validation("Choisissez au moins un document à vendre.", "lines"));
  }

  if (brut.length > MAX_SALE_LINES) {
    return fail(
      DomainError.businessRule(`Le panier est limité à ${MAX_SALE_LINES} lignes.`, "PANIER_TROP_LONG"),
    );
  }

  const lignes: SaleLineDraft[] = [];

  for (const [index, ligne] of brut.entries()) {
    if (typeof ligne !== "object" || ligne === null) {
      return fail(DomainError.validation(`Ligne ${index + 1} : ligne illisible.`, "lines"));
    }

    const { productId, quantity } = ligne as { productId?: unknown; quantity?: unknown };

    if (typeof productId !== "string" || productId.length === 0) {
      return fail(DomainError.validation(`Ligne ${index + 1} : document manquant.`, "lines"));
    }

    const nombreQuantite = Number(quantity);
    if (!Number.isInteger(nombreQuantite) || nombreQuantite < 1) {
      return fail(
        DomainError.validation(`Ligne ${index + 1} : indiquez une quantité d'au moins 1.`, "lines"),
      );
    }
    if (nombreQuantite > MAX_LINE_QUANTITY) {
      return fail(
        DomainError.validation(
          `Ligne ${index + 1} : la quantité ne peut pas dépasser ${MAX_LINE_QUANTITY}.`,
          "lines",
        ),
      );
    }

    lignes.push({ productId, quantity: nombreQuantite });
  }

  // Le meme document choisi deux fois (double clic, deux ajouts successifs)
  // devient une seule ligne : deux lignes distinctes pour un seul document
  // compliqueraient la lecture de la vente sans rien apporter.
  const fusionnees = new Map<string, number>();
  for (const ligne of lignes) {
    fusionnees.set(ligne.productId, (fusionnees.get(ligne.productId) ?? 0) + ligne.quantity);
  }

  return ok(
    Array.from(fusionnees, ([productId, quantity]) => ({ productId, quantity })),
  );
}

/**
 * Stock disponible apres la vente, ou refus si la quantite demandee depasse
 * ce qui reste. Un stock `null` signifie « fabriqué à la demande » — la
 * quantite n'a alors pas de plafond.
 */
export function nextProductStock(
  currentStock: number | null,
  quantity: number,
  productName: string,
): Result<number | null> {
  if (currentStock === null) return ok(null);

  if (quantity > currentStock) {
    return fail(
      DomainError.businessRule(
        `Stock insuffisant pour « ${productName} » : ${currentStock} restant(s).`,
        "STOCK_INSUFFISANT",
      ),
    );
  }

  return ok(currentStock - quantity);
}

/** Arrondi a deux decimales : evite la derive flottante en sommant des lignes. */
function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/** Meme formule que le calcul generique des ventes (`compute: "sale-totals"`). */
export function saleTotals(subtotal: number, discount: number, taxAmount: number): number {
  return arrondi(Math.max(0, subtotal - discount + taxAmount));
}

export { arrondi as arrondiMontant };
