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
  valeurStock: number;
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
        _count: { select: { saleLines: true } },
      },
    }),
    prisma.documentProduct.count({ where }),
  ]);

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
    ventes: produit._count.saleLines,
  }));

  return buildPage(items, total, pagination);
}

export async function getDocumentProductStats(): Promise<DocumentProductStats> {
  const [articles, disponibles, ruptures, catalogue] = await Promise.all([
    prisma.documentProduct.count({ where: { deletedAt: null } }),
    prisma.documentProduct.count({ where: { deletedAt: null, status: "DISPONIBLE" } }),
    prisma.documentProduct.count({ where: { deletedAt: null, status: "RUPTURE" } }),
    prisma.documentProduct.findMany({
      where: { deletedAt: null, stock: { not: null } },
      select: { price: true, stock: true },
    }),
  ]);

  // La valeur du stock se calcule article par article : il n'y a pas d'agregat
  // SQL pour un produit de deux colonnes.
  const valeurStock = catalogue.reduce(
    (total, produit) => total + Number(produit.price) * (produit.stock ?? 0),
    0,
  );

  return { articles, disponibles, ruptures, valeurStock };
}
