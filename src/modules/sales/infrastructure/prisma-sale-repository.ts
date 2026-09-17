import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok } from "@/shared/domain/result";

import { nextProductStock, saleTotals } from "../domain/sale";
import type { SaleRepository } from "../domain/sale-repository";
import { nextSaleReference } from "./sale-queries";

function arrondi(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

/**
 * Ecrit une vente et ses lignes en une seule transaction.
 *
 * Le prix soumis par le navigateur n'est jamais celui ecrit : les produits
 * sont relus a l'interieur de la transaction, ce qui fige un prix a jour et
 * detecte au meme moment un document retire du catalogue (ou passe en
 * rupture) entre l'ouverture du formulaire et l'envoi — sans cette relecture,
 * une vente pourrait s'enregistrer a un prix perime ou vider un stock deja a
 * zero.
 */
export const prismaSaleRepository: SaleRepository = {
  async create(input) {
    const reference = await nextSaleReference();

    try {
      const created = await prisma.$transaction(async (tx) => {
        const productIds = input.lines.map((ligne) => ligne.productId);

        const produits = await tx.documentProduct.findMany({
          where: { id: { in: productIds }, deletedAt: null },
          select: { id: true, name: true, price: true, costPrice: true, stock: true, status: true },
        });

        const parId = new Map(produits.map((produit) => [produit.id, produit]));

        const lignesEcrites: {
          productId: string;
          quantity: number;
          unitPrice: number;
          lineTotal: number;
          unitCost: number | null;
        }[] = [];
        const stocksAMettreAJour: { id: string; stock: number }[] = [];

        for (const ligne of input.lines) {
          const produit = parId.get(ligne.productId);

          if (!produit || produit.status === "ARCHIVE") {
            throw DomainError.businessRule(
              `Ce document n'est plus disponible à la vente.`,
              "DOCUMENT_INDISPONIBLE",
            );
          }

          const stockRestant = nextProductStock(produit.stock, ligne.quantity, produit.name);
          if (!stockRestant.ok) throw stockRestant.error;

          const unitPrice = Number(produit.price);
          const lineTotal = arrondi(unitPrice * ligne.quantity);
          const unitCost = produit.costPrice === null ? null : Number(produit.costPrice);

          lignesEcrites.push({
            productId: ligne.productId,
            quantity: ligne.quantity,
            unitPrice,
            lineTotal,
            unitCost,
          });

          if (stockRestant.value !== null) {
            stocksAMettreAJour.push({ id: produit.id, stock: stockRestant.value });
          }
        }

        const subtotal = arrondi(lignesEcrites.reduce((total, ligne) => total + ligne.lineTotal, 0));
        const totalAmount = saleTotals(subtotal, input.discount, input.taxAmount);

        const vente = await tx.documentSale.create({
          data: {
            reference,
            studentId: input.studentId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            subtotal,
            discount: input.discount,
            taxAmount: input.taxAmount,
            totalAmount,
            paidAmount: input.paidAmount,
            status: input.status,
            soldAt: input.soldAt,
            lines: { create: lignesEcrites },
          },
          select: { id: true, reference: true },
        });

        for (const { id, stock } of stocksAMettreAJour) {
          await tx.documentProduct.update({ where: { id }, data: { stock } });
        }

        return vente;
      });

      return ok(created);
    } catch (error) {
      if (error instanceof DomainError) return fail(error);

      if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
        return fail(DomainError.conflict("Cette référence de vente existe déjà. Réessayez."));
      }

      console.error("[sales] échec de l'enregistrement de la vente", error);
      return fail(DomainError.businessRule("La vente n'a pas pu être enregistrée."));
    }
  },
};
