import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { ServiceCategory, ServiceOrderStatus } from "../domain/service";

/** Lectures du module 10 — commandes de prestations et catalogue. */

export interface ServiceOrderRow {
  id: string;
  reference: string;
  serviceName: string;
  category: ServiceCategory;
  sellerId: string;
  sellerName: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  status: ServiceOrderStatus;
  orderedAt: Date;
  deliveredAt: Date | null;
}

export interface ServiceOrderFilters {
  search?: string;
  status?: ServiceOrderStatus;
  category?: ServiceCategory;
}

export interface ServiceOrderStats {
  enCours: number;
  devis: number;
  chiffreAffairesDuMois: number;
  resteDu: number;
  prestationsActives: number;
}

function debutDuMois(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function whereOrder(filters: ServiceOrderFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { service: { category: filters.category } } : {}),
    ...(recherche
      ? {
          OR: [
            { reference: { contains: recherche } },
            { customerName: { contains: recherche } },
            { customerPhone: { contains: recherche } },
            { description: { contains: recherche } },
            { service: { name: { contains: recherche } } },
          ],
        }
      : {}),
  };
}

export async function listServiceOrders(
  filters: ServiceOrderFilters,
  pagination: PaginationParams,
): Promise<Page<ServiceOrderRow>> {
  const where = whereOrder(filters);

  const [commandes, total] = await Promise.all([
    prisma.serviceOrder.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        reference: true,
        customerName: true,
        amount: true,
        paidAmount: true,
        status: true,
        orderedAt: true,
        deliveredAt: true,
        service: { select: { name: true, category: true } },
        seller: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.serviceOrder.count({ where }),
  ]);

  const items: ServiceOrderRow[] = commandes.map((commande) => ({
    id: commande.id,
    reference: commande.reference,
    serviceName: commande.service.name,
    category: commande.service.category as ServiceCategory,
    sellerId: commande.seller.id,
    sellerName: `${commande.seller.lastName} ${commande.seller.firstName}`,
    customerName: commande.customerName,
    amount: Number(commande.amount),
    paidAmount: Number(commande.paidAmount),
    status: commande.status as ServiceOrderStatus,
    orderedAt: commande.orderedAt,
    deliveredAt: commande.deliveredAt,
  }));

  return buildPage(items, total, pagination);
}

export async function getServiceOrderStats(): Promise<ServiceOrderStats> {
  const debutMois = debutDuMois();

  const [enCours, devis, duMois, impayees, prestationsActives] = await Promise.all([
    prisma.serviceOrder.count({ where: { status: { in: ["CONFIRMEE", "EN_COURS"] } } }),
    prisma.serviceOrder.count({ where: { status: "DEVIS" } }),
    prisma.serviceOrder.aggregate({
      where: { orderedAt: { gte: debutMois }, status: { notIn: ["ANNULEE", "DEVIS"] } },
      _sum: { amount: true },
    }),
    prisma.serviceOrder.aggregate({
      where: { status: { in: ["CONFIRMEE", "EN_COURS", "LIVREE", "FACTUREE"] } },
      _sum: { amount: true, paidAmount: true },
    }),
    prisma.service.count({ where: { deletedAt: null, isActive: true } }),
  ]);

  return {
    enCours,
    devis,
    chiffreAffairesDuMois: Number(duMois._sum.amount ?? 0),
    resteDu: Math.max(
      0,
      Number(impayees._sum.amount ?? 0) - Number(impayees._sum.paidAmount ?? 0),
    ),
    prestationsActives,
  };
}

export interface ServiceCatalogRow {
  id: string;
  name: string;
  category: ServiceCategory;
  basePrice: number;
  commandes: number;
}

/** Catalogue des prestations proposees, affiche en tete de page. */
export async function listServiceCatalog(limit = 12): Promise<ServiceCatalogRow[]> {
  const prestations = await prisma.service.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      category: true,
      basePrice: true,
      _count: { select: { orders: true } },
    },
  });

  return prestations.map((prestation) => ({
    id: prestation.id,
    name: prestation.name,
    category: prestation.category as ServiceCategory,
    basePrice: Number(prestation.basePrice),
    commandes: prestation._count.orders,
  }));
}
