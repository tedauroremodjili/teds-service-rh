import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { CashDirection, PaymentMethod } from "../domain/cash";

/** Lectures du module 11 — journal de caisse. */

export interface CashTransactionRow {
  id: string;
  reference: string;
  direction: CashDirection;
  amount: number;
  balanceAfter: number;
  label: string;
  category: string | null;
  occurredAt: Date;
  employeeName: string | null;
  paymentMethod: PaymentMethod | null;
}

export interface CashFilters {
  search?: string;
  direction?: CashDirection;
  /** Bornes du mois consulte ; la borne haute est exclusive. */
  debut?: Date;
  fin?: Date;
}

export interface CashStats {
  solde: number;
  entreesDuMois: number;
  sortiesDuMois: number;
  mouvementsDuMois: number;
}

function whereCash(filters: CashFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.direction ? { direction: filters.direction } : {}),
    ...(filters.debut && filters.fin
      ? { occurredAt: { gte: filters.debut, lt: filters.fin } }
      : {}),
    ...(recherche
      ? {
          OR: [
            { reference: { contains: recherche } },
            { label: { contains: recherche } },
            { category: { contains: recherche } },
          ],
        }
      : {}),
  };
}

export async function listCashTransactions(
  filters: CashFilters,
  pagination: PaginationParams,
): Promise<Page<CashTransactionRow>> {
  const where = whereCash(filters);

  const [mouvements, total] = await Promise.all([
    prisma.cashTransaction.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        reference: true,
        direction: true,
        amount: true,
        balanceAfter: true,
        label: true,
        category: true,
        occurredAt: true,
        employee: { select: { firstName: true, lastName: true } },
        payment: { select: { method: true } },
      },
    }),
    prisma.cashTransaction.count({ where }),
  ]);

  const items: CashTransactionRow[] = mouvements.map((mouvement) => ({
    id: mouvement.id,
    reference: mouvement.reference,
    direction: mouvement.direction as CashDirection,
    amount: Number(mouvement.amount),
    balanceAfter: Number(mouvement.balanceAfter),
    label: mouvement.label,
    category: mouvement.category,
    occurredAt: mouvement.occurredAt,
    employeeName: mouvement.employee
      ? `${mouvement.employee.lastName} ${mouvement.employee.firstName}`
      : null,
    paymentMethod: (mouvement.payment?.method as PaymentMethod | undefined) ?? null,
  }));

  return buildPage(items, total, pagination);
}

/**
 * Solde et flux du mois consulte.
 *
 * Le solde est calcule sur TOUS les mouvements, pas seulement ceux du mois : une
 * caisse n'est pas remise a zero le 1er du mois.
 */
export async function getCashStats(debut: Date, fin: Date): Promise<CashStats> {
  const [entreesTotales, sortiesTotales, entreesMois, sortiesMois, mouvementsDuMois] =
    await Promise.all([
      prisma.cashTransaction.aggregate({ where: { direction: "ENTREE" }, _sum: { amount: true } }),
      prisma.cashTransaction.aggregate({ where: { direction: "SORTIE" }, _sum: { amount: true } }),
      prisma.cashTransaction.aggregate({
        where: { direction: "ENTREE", occurredAt: { gte: debut, lt: fin } },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.aggregate({
        where: { direction: "SORTIE", occurredAt: { gte: debut, lt: fin } },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.count({ where: { occurredAt: { gte: debut, lt: fin } } }),
    ]);

  return {
    solde: Number(entreesTotales._sum.amount ?? 0) - Number(sortiesTotales._sum.amount ?? 0),
    entreesDuMois: Number(entreesMois._sum.amount ?? 0),
    sortiesDuMois: Number(sortiesMois._sum.amount ?? 0),
    mouvementsDuMois,
  };
}
