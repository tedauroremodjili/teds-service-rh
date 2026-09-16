import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { ExpenseCategory } from "../domain/accounting";

/** Lectures du module 12 — journal comptable, produits et charges. */

export interface AccountingEntryRow {
  id: string;
  entryDate: Date;
  accountCode: string;
  accountName: string;
  label: string;
  debit: number;
  credit: number;
  sourceType: string | null;
}

export interface AccountingFilters {
  search?: string;
  accountCode?: string;
  debut?: Date;
  /** Borne haute EXCLUSIVE. */
  fin?: Date;
}

export interface AccountingStats {
  recettes: number;
  depenses: number;
  totalDebit: number;
  totalCredit: number;
  ecritures: number;
}

export interface LigneCategorie {
  cle: string;
  montant: number;
}

function whereEntry(filters: AccountingFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.accountCode ? { accountCode: filters.accountCode } : {}),
    ...(filters.debut && filters.fin ? { entryDate: { gte: filters.debut, lt: filters.fin } } : {}),
    ...(recherche
      ? {
          OR: [
            { label: { contains: recherche } },
            { accountName: { contains: recherche } },
            { accountCode: { contains: recherche } },
          ],
        }
      : {}),
  };
}

export async function listAccountingEntries(
  filters: AccountingFilters,
  pagination: PaginationParams,
): Promise<Page<AccountingEntryRow>> {
  const where = whereEntry(filters);

  const [ecritures, total] = await Promise.all([
    prisma.accountingEntry.findMany({
      where,
      orderBy: [{ entryDate: "desc" }, { accountCode: "asc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        entryDate: true,
        accountCode: true,
        accountName: true,
        label: true,
        debit: true,
        credit: true,
        sourceType: true,
      },
    }),
    prisma.accountingEntry.count({ where }),
  ]);

  const items: AccountingEntryRow[] = ecritures.map((ecriture) => ({
    id: ecriture.id,
    entryDate: ecriture.entryDate,
    accountCode: ecriture.accountCode,
    accountName: ecriture.accountName,
    label: ecriture.label,
    debit: Number(ecriture.debit),
    credit: Number(ecriture.credit),
    sourceType: ecriture.sourceType,
  }));

  return buildPage(items, total, pagination);
}

/** Produits, charges et totaux du journal, sur la periode consultee. */
export async function getAccountingStats(debut: Date, fin: Date): Promise<AccountingStats> {
  const periode = { gte: debut, lt: fin };

  const [recettes, depenses, journal, ecritures] = await Promise.all([
    prisma.revenue.aggregate({ where: { occurredAt: periode }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { occurredAt: periode }, _sum: { amount: true } }),
    prisma.accountingEntry.aggregate({
      where: { entryDate: periode },
      _sum: { debit: true, credit: true },
    }),
    prisma.accountingEntry.count({ where: { entryDate: periode } }),
  ]);

  return {
    recettes: Number(recettes._sum.amount ?? 0),
    depenses: Number(depenses._sum.amount ?? 0),
    totalDebit: Number(journal._sum.debit ?? 0),
    totalCredit: Number(journal._sum.credit ?? 0),
    ecritures,
  };
}

/** Repartition des charges par categorie, sur la periode consultee. */
export async function getDepensesParCategorie(debut: Date, fin: Date): Promise<LigneCategorie[]> {
  const lignes = await prisma.expense.groupBy({
    by: ["category"],
    where: { occurredAt: { gte: debut, lt: fin } },
    _sum: { amount: true },
  });

  return lignes
    .map((ligne) => ({
      cle: ligne.category as ExpenseCategory,
      montant: Number(ligne._sum.amount ?? 0),
    }))
    .filter((ligne) => ligne.montant > 0)
    .sort((a, b) => b.montant - a.montant);
}

/** Repartition des produits par origine, sur la periode consultee. */
export async function getRecettesParSource(debut: Date, fin: Date): Promise<LigneCategorie[]> {
  const lignes = await prisma.revenue.groupBy({
    by: ["source"],
    where: { occurredAt: { gte: debut, lt: fin } },
    _sum: { amount: true },
  });

  return lignes
    .map((ligne) => ({ cle: ligne.source, montant: Number(ligne._sum.amount ?? 0) }))
    .filter((ligne) => ligne.montant > 0)
    .sort((a, b) => b.montant - a.montant);
}

/** Comptes mouvementes, pour le filtre du journal. */
export async function getComptesOptions(): Promise<{ value: string; label: string }[]> {
  const comptes = await prisma.accountingEntry.groupBy({
    by: ["accountCode", "accountName"],
    orderBy: { accountCode: "asc" },
  });

  return comptes.map((compte) => ({
    value: compte.accountCode,
    label: `${compte.accountCode} — ${compte.accountName}`,
  }));
}
