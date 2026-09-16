/**
 * Regles qui ont besoin de l'etat precedent.
 *
 * Elles vivent dans le domaine parce que ce sont des regles de gestion, pas des
 * details de stockage : « le solde de caisse suit chaque mouvement », « une
 * sortie de stock ne rend pas la quantite negative ». L'infrastructure se
 * contente de lire la valeur precedente et d'appeler ces fonctions.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

export type CashDirection = "ENTREE" | "SORTIE";

/**
 * Nouveau solde de caisse apres un mouvement.
 * Une sortie superieure au solde est refusee : une caisse physique ne peut pas
 * distribuer un argent qu'elle n'a pas, et un solde negatif fausserait tout le
 * journal qui suit.
 */
export function nextCashBalance(
  previousBalance: number,
  direction: CashDirection,
  amount: number,
): Result<number> {
  if (direction === "ENTREE") {
    return ok(previousBalance + amount);
  }

  if (amount > previousBalance) {
    return fail(
      DomainError.businessRule(
        `Sortie impossible : la caisse ne contient que ${previousBalance.toLocaleString("fr-FR")} FCFA.`,
        "SOLDE_INSUFFISANT",
      ),
    );
  }

  return ok(previousBalance - amount);
}

export type StockMovementType = "ENTREE" | "SORTIE" | "INVENTAIRE" | "PERTE";

/**
 * Quantite en stock apres un mouvement.
 * « INVENTAIRE » n'ajoute rien : il redresse le stock sur la quantite comptee.
 */
export function nextStockQuantity(
  currentQuantity: number,
  type: StockMovementType,
  quantity: number,
): Result<number> {
  if (quantity < 0) {
    return fail(DomainError.validation("La quantité ne peut pas être négative.", "quantity"));
  }

  switch (type) {
    case "ENTREE":
      return ok(currentQuantity + quantity);

    case "INVENTAIRE":
      return ok(quantity);

    case "SORTIE":
    case "PERTE": {
      if (quantity > currentQuantity) {
        return fail(
          DomainError.businessRule(
            `Stock insuffisant : il reste ${currentQuantity} unité(s).`,
            "STOCK_INSUFFISANT",
          ),
        );
      }
      return ok(currentQuantity - quantity);
    }

    default:
      return ok(currentQuantity);
  }
}
