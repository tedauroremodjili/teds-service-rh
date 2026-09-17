import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { DocumentCategory, ProductStatus } from "../domain/document-product";

/** Lectures du catalogue de documents (module 7). */

export interface DocumentProductRow {
  id: string;
  code: string;
  name: string;
  category: DocumentCategory;
  price: number;
  stock: number | null;
  alertStock: number | null;
  status: ProductStatus;
  commissionRate: number | null;
  ventes: number;
}

export interface DocumentProductFilters {
  search?: string;
  category?: DocumentCategory;
  status?: ProductStatus;
}

export interface DocumentProductStats {
  articles: number;
  disponibles: number;
  ruptures: number;
  totalVendus: number;
}

/**
 * Quantite vendue par document, sales annulees et brouillons exclus.
 *
 * TED'S SERVICE ne tient pas de stock de documents : chaque piece est
 * imprimee a la demande. Ce qui compte donc, ce n'est pas ce qu'il « reste »
 * mais ce qui a ete VENDU — la somme des quantites des lignes de vente, pas
 * le nombre de lignes (une seule ligne peut porter une quantite de 5).
 */
async function quantitesVenduesParProduit(
  productIds: string[],
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();

  const groupes = await prisma.documentSaleLine.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      sale: { status: { notIn: ["BROUILLON", "ANNULEE"] } },
    },
    _sum: { quantity: true },
  });

  return new Map(groupes.map((groupe) => [groupe.productId, groupe._sum.quantity ?? 0]));
}

function whereProduct(filters: DocumentProductFilters) {
  const recherche = filters.search?.trim();

  return {
    // Le catalogue est en suppression logique : un document retire reste lie
    // aux ventes passees, il ne doit pas disparaitre de la comptabilite.
    deletedAt: null,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(recherche
      ? {
          OR: [
            { code: { contains: recherche } },
            { name: { contains: recherche } },
            { description: { contains: recherche } },
          ],
        }
      : {}),
  };
}

export async function listDocumentProducts(
  filters: DocumentProductFilters,
  pagination: PaginationParams,
): Promise<Page<DocumentProductRow>> {
  const where = whereProduct(filters);

  const [produits, total] = await Promise.all([
    prisma.documentProduct.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        alertStock: true,
        status: true,
        commissionRate: true,
      },
    }),
    prisma.documentProduct.count({ where }),
  ]);

  const quantites = await quantitesVenduesParProduit(produits.map((produit) => produit.id));

  const items: DocumentProductRow[] = produits.map((produit) => ({
    id: produit.id,
    code: produit.code,
    name: produit.name,
    category: produit.category as DocumentCategory,
    price: Number(produit.price),
    stock: produit.stock,
    alertStock: produit.alertStock,
    status: produit.status as ProductStatus,
    commissionRate: produit.commissionRate === null ? null : Number(produit.commissionRate),
    ventes: quantites.get(produit.id) ?? 0,
  }));

  return buildPage(items, total, pagination);
}

export interface SellableProductOption {
  id: string;
  code: string;
  name: string;
  category: DocumentCategory;
  price: number;
  /** null = fabrique a la demande, sans limite de quantite. */
  stock: number | null;
}

/** Documents proposables a la vente — catalogue de reference pour le panier. */
export async function getSellableDocumentOptions(): Promise<SellableProductOption[]> {
  const produits = await prisma.documentProduct.findMany({
    where: { deletedAt: null, status: "DISPONIBLE" },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, category: true, price: true, stock: true },
  });

  return produits.map((produit) => ({
    id: produit.id,
    code: produit.code,
    name: produit.name,
    category: produit.category as DocumentCategory,
    price: Number(produit.price),
    stock: produit.stock,
  }));
}

export async function getDocumentProductStats(): Promise<DocumentProductStats> {
  const [articles, disponibles, ruptures, quantiteVendue] = await Promise.all([
    prisma.documentProduct.count({ where: { deletedAt: null } }),
    prisma.documentProduct.count({ where: { deletedAt: null, status: "DISPONIBLE" } }),
    prisma.documentProduct.count({ where: { deletedAt: null, status: "RUPTURE" } }),
    prisma.documentSaleLine.aggregate({
      where: { sale: { status: { notIn: ["BROUILLON", "ANNULEE"] } } },
      _sum: { quantity: true },
    }),
  ]);

  return {
    articles,
    disponibles,
    ruptures,
    totalVendus: quantiteVendue._sum.quantity ?? 0,
  };
}
