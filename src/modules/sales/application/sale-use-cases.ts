import { DomainError } from "@/shared/domain/errors";
import { fail, type Result } from "@/shared/domain/result";

import { SALE_STATUSES } from "../domain/sale";
import type { CreateSaleInput, SaleRepository } from "../domain/sale-repository";

/**
 * Validation d'en-tete, avant d'aller relire les produits et ecrire en base.
 * Le panier lui-meme est deja valide a ce stade (`parseSaleLines`, appele par
 * la Server Action) : cette fonction ne revalide que ce qui est propre a la
 * vente, pas aux lignes.
 */
export async function createSale(
  repository: SaleRepository,
  input: CreateSaleInput,
): Promise<Result<{ id: string; reference: string }>> {
  if (!SALE_STATUSES.includes(input.status)) {
    return fail(DomainError.validation("Statut de vente invalide.", "status"));
  }

  if (Number.isNaN(input.soldAt.getTime())) {
    return fail(DomainError.validation("Indiquez une date de vente valide.", "soldAt"));
  }

  if (input.discount < 0 || input.taxAmount < 0 || input.paidAmount < 0) {
    return fail(DomainError.validation("Les montants ne peuvent pas être négatifs.", "discount"));
  }

  // Une vente designe toujours quelqu'un : un apprenant enregistre, ou au
  // moins un nom pour le client de passage — jamais une vente anonyme.
  if (!input.studentId && !input.customerName?.trim()) {
    return fail(
      DomainError.validation(
        "Choisissez un apprenant ou indiquez le nom du client.",
        "customerName",
      ),
    );
  }

  return repository.create(input);
}
