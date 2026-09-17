import type { Result } from "@/shared/domain/result";

import type { SaleLineDraft, SaleStatus } from "./sale";

/** Donnees necessaires a la creation d'une vente, panier deja valide. */
export interface CreateSaleInput {
  studentId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  discount: number;
  taxAmount: number;
  paidAmount: number;
  status: SaleStatus;
  soldAt: Date;
  lines: SaleLineDraft[];
}

export interface SaleRepository {
  /**
   * Ecrit la vente et ses lignes en une seule operation atomique. Les prix ne
   * sont jamais ceux transmis par le formulaire : l'implementation relit les
   * produits au moment de l'ecriture, pour figer un prix a jour et detecter un
   * document retire du catalogue entre l'ouverture du formulaire et l'envoi.
   */
  create(input: CreateSaleInput): Promise<Result<{ id: string; reference: string }>>;
}
