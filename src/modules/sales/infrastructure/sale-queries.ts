import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { SaleStatus } from "../domain/sale";

/** Lectures du module 7 — ventes de documents. */

export interface SaleRow {
  id: string;
  reference: string;
  /** Absent : TED'S SERVICE vend au prix fixe du document, sans vendeur attitré. */
  sellerId: string | null;
  sellerName: string | null;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  status: SaleStatus;
  soldAt: Date;
  articles: number;
}

export interface SaleFilters {
  search?: string;
  status?: SaleStatus;
}

export interface SaleStats {
  ventesDuMois: number;
  chiffreAffairesDuMois: number;
  encaisseDuMois: number;
  resteDu: number;
}

function debutDuMois(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function whereSale(filters: SaleFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(recherche
      ? {
          OR: [
            { reference: { contains: recherche } },
            { customerName: { contains: recherche } },
            { customerPhone: { contains: recherche } },
            { student: { lastName: { contains: recherche } } },
            { student: { firstName: { contains: recherche } } },
            { seller: { is: { lastName: { contains: recherche } } } },
          ],
        }
      : {}),
  };
}

export async function listSales(
  filters: SaleFilters,
  pagination: PaginationParams,
): Promise<Page<SaleRow>> {
  const where = whereSale(filters);

  const [ventes, total] = await Promise.all([
    prisma.documentSale.findMany({
      where,
      orderBy: { soldAt: "desc" },
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        reference: true,
        customerName: true,
        totalAmount: true,
        paidAmount: true,
        discount: true,
        status: true,
        soldAt: true,
        seller: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.documentSale.count({ where }),
  ]);

  const items: SaleRow[] = ventes.map((vente) => ({
    id: vente.id,
    reference: vente.reference,
    sellerId: vente.seller?.id ?? null,
    sellerName: vente.seller ? `${vente.seller.lastName} ${vente.seller.firstName}` : null,
    // Le client est soit un apprenant enregistre, soit un client de passage.
    customerName: vente.student
      ? `${vente.student.lastName} ${vente.student.firstName}`
      : (vente.customerName ?? "Client de passage"),
    totalAmount: Number(vente.totalAmount),
    paidAmount: Number(vente.paidAmount),
    discount: Number(vente.discount),
    status: vente.status as SaleStatus,
    soldAt: vente.soldAt,
    articles: vente._count.lines,
  }));

  return buildPage(items, total, pagination);
}

export async function getSaleStats(): Promise<SaleStats> {
  const debutMois = debutDuMois();
  const nonAnnulees = { status: { not: "ANNULEE" as const } };

  const [duMois, impayees] = await Promise.all([
    prisma.documentSale.aggregate({
      where: { soldAt: { gte: debutMois }, ...nonAnnulees },
      _sum: { totalAmount: true, paidAmount: true },
      _count: { _all: true },
    }),
    prisma.documentSale.aggregate({
      where: { status: { in: ["CONFIRMEE", "PARTIELLEMENT_PAYEE"] } },
      _sum: { totalAmount: true, paidAmount: true },
    }),
  ]);

  return {
    ventesDuMois: duMois._count._all,
    chiffreAffairesDuMois: Number(duMois._sum.totalAmount ?? 0),
    encaisseDuMois: Number(duMois._sum.paidAmount ?? 0),
    resteDu: Math.max(
      0,
      Number(impayees._sum.totalAmount ?? 0) - Number(impayees._sum.paidAmount ?? 0),
    ),
  };
}
