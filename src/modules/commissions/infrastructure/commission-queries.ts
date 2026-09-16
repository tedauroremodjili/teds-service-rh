import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { CommissionSourceType, CommissionStatus } from "../domain/commission";

/** Lectures du module 6 — commissions et regles de calcul. */

export interface CommissionRow {
  id: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  sourceType: CommissionSourceType;
  sourceId: string;
  baseAmount: number;
  rate: number;
  amount: number;
  status: CommissionStatus;
  ruleName: string | null;
  createdAt: Date;
}

export interface CommissionFilters {
  search?: string;
  status?: CommissionStatus;
  sourceType?: CommissionSourceType;
}

export interface CommissionStats {
  total: number;
  montantEnAttente: number;
  montantValide: number;
  montantIntegre: number;
  beneficiaires: number;
}

export interface CommissionRuleRow {
  id: string;
  name: string;
  sourceType: CommissionSourceType;
  rate: number;
  fixedAmount: number | null;
  isActive: boolean;
  priority: number;
}

function whereCommission(filters: CommissionFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.sourceType ? { sourceType: filters.sourceType } : {}),
    ...(recherche
      ? {
          OR: [
            { sourceId: { contains: recherche } },
            { employee: { firstName: { contains: recherche } } },
            { employee: { lastName: { contains: recherche } } },
            { employee: { matricule: { contains: recherche } } },
          ],
        }
      : {}),
  };
}

export async function listCommissions(
  filters: CommissionFilters,
  pagination: PaginationParams,
): Promise<Page<CommissionRow>> {
  const where = whereCommission(filters);

  const [commissions, total] = await Promise.all([
    prisma.commission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        baseAmount: true,
        rate: true,
        amount: true,
        status: true,
        createdAt: true,
        rule: { select: { name: true } },
        employee: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    }),
    prisma.commission.count({ where }),
  ]);

  const items: CommissionRow[] = commissions.map((commission) => ({
    id: commission.id,
    employeeId: commission.employee.id,
    employeeName: `${commission.employee.lastName} ${commission.employee.firstName}`,
    matricule: commission.employee.matricule,
    sourceType: commission.sourceType as CommissionSourceType,
    sourceId: commission.sourceId,
    baseAmount: Number(commission.baseAmount),
    rate: Number(commission.rate),
    amount: Number(commission.amount),
    status: commission.status as CommissionStatus,
    ruleName: commission.rule?.name ?? null,
    createdAt: commission.createdAt,
  }));

  return buildPage(items, total, pagination);
}

export async function getCommissionStats(): Promise<CommissionStats> {
  const [total, enAttente, validees, integrees, beneficiaires] = await Promise.all([
    prisma.commission.count(),
    prisma.commission.aggregate({ where: { status: "EN_ATTENTE" }, _sum: { amount: true } }),
    prisma.commission.aggregate({ where: { status: "VALIDEE" }, _sum: { amount: true } }),
    prisma.commission.aggregate({ where: { status: "INTEGREE_PAIE" }, _sum: { amount: true } }),
    prisma.commission.groupBy({
      by: ["employeeId"],
      where: { status: { not: "ANNULEE" } },
    }),
  ]);

  return {
    total,
    montantEnAttente: Number(enAttente._sum.amount ?? 0),
    montantValide: Number(validees._sum.amount ?? 0),
    montantIntegre: Number(integrees._sum.amount ?? 0),
    beneficiaires: beneficiaires.length,
  };
}

/**
 * Regles de calcul en vigueur.
 *
 * Elles sont affichees a cote des commissions : c'est ce qui rend le montant
 * verifiable — « 20 % sur les documents » explique la ligne, un chiffre seul non.
 */
export async function listCommissionRules(): Promise<CommissionRuleRow[]> {
  const regles = await prisma.commissionRule.findMany({
    orderBy: [{ isActive: "desc" }, { priority: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sourceType: true,
      rate: true,
      fixedAmount: true,
      isActive: true,
      priority: true,
    },
  });

  return regles.map((regle) => ({
    id: regle.id,
    name: regle.name,
    sourceType: regle.sourceType as CommissionSourceType,
    rate: Number(regle.rate),
    fixedAmount: regle.fixedAmount === null ? null : Number(regle.fixedAmount),
    isActive: regle.isActive,
    priority: regle.priority,
  }));
}
