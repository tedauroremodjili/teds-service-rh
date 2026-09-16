import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import { valeurStock, type InventoryCategory, type StockMovementType } from "../domain/inventory";

/** Lectures du module 13 — articles et mouvements de stock. */

export interface InventoryItemRow {
  id: string;
  code: string;
  name: string;
  category: InventoryCategory;
  unit: string;
  quantity: number;
  alertQuantity: number;
  unitCost: number;
  valeur: number;
  location: string | null;
  dernierMouvement: Date | null;
}

export interface InventoryFilters {
  search?: string;
  category?: InventoryCategory;
  /** Ne garder que les articles au niveau de leur seuil d'alerte. */
  alerteSeulement?: boolean;
}

export interface InventoryStats {
  articles: number;
  ruptures: number;
  alertes: number;
  valeurTotale: number;
}

export interface StockMovementRow {
  id: string;
  itemName: string;
  itemCode: string;
  type: StockMovementType;
  quantity: number;
  quantityAfter: number;
  label: string | null;
  occurredAt: Date;
}

function whereItem(filters: InventoryFilters) {
  const recherche = filters.search?.trim();

  return {
    deletedAt: null,
    ...(filters.category ? { category: filters.category } : {}),
    // Comparaison de deux colonnes de la meme table : Prisma l'exprime par une
    // reference de champ, ce qui garde le filtre en SQL — donc pagination et
    // total justes.
    ...(filters.alerteSeulement
      ? { quantity: { lte: prisma.inventoryItem.fields.alertQuantity } }
      : {}),
    ...(recherche
      ? {
          OR: [
            { code: { contains: recherche } },
            { name: { contains: recherche } },
            { location: { contains: recherche } },
          ],
        }
      : {}),
  };
}

export async function listInventoryItems(
  filters: InventoryFilters,
  pagination: PaginationParams,
): Promise<Page<InventoryItemRow>> {
  const where = whereItem(filters);

  const [articles, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        unit: true,
        quantity: true,
        alertQuantity: true,
        unitCost: true,
        location: true,
        movements: {
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: { occurredAt: true },
        },
      },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  const items: InventoryItemRow[] = articles.map((article) => ({
    id: article.id,
    code: article.code,
    name: article.name,
    category: article.category as InventoryCategory,
    unit: article.unit,
    quantity: article.quantity,
    alertQuantity: article.alertQuantity,
    unitCost: Number(article.unitCost),
    valeur: valeurStock(article.quantity, Number(article.unitCost)),
    location: article.location,
    dernierMouvement: article.movements[0]?.occurredAt ?? null,
  }));

  return buildPage(items, total, pagination);
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const articles = await prisma.inventoryItem.findMany({
    where: { deletedAt: null },
    select: { quantity: true, alertQuantity: true, unitCost: true },
  });

  return {
    articles: articles.length,
    ruptures: articles.filter((article) => article.quantity <= 0).length,
    alertes: articles.filter(
      (article) => article.quantity > 0 && article.quantity <= article.alertQuantity,
    ).length,
    valeurTotale: articles.reduce(
      (total, article) => total + valeurStock(article.quantity, Number(article.unitCost)),
      0,
    ),
  };
}

/** Derniers mouvements, affiches sous la liste des articles. */
export async function listRecentMovements(limit = 8): Promise<StockMovementRow[]> {
  const mouvements = await prisma.stockMovement.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      quantity: true,
      quantityAfter: true,
      label: true,
      occurredAt: true,
      item: { select: { name: true, code: true } },
    },
  });

  return mouvements.map((mouvement) => ({
    id: mouvement.id,
    itemName: mouvement.item.name,
    itemCode: mouvement.item.code,
    type: mouvement.type as StockMovementType,
    quantity: mouvement.quantity,
    quantityAfter: mouvement.quantityAfter,
    label: mouvement.label,
    occurredAt: mouvement.occurredAt,
  }));
}
