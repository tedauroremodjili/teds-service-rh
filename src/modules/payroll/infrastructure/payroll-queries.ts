import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { PayrollStatus, Periode } from "../domain/payroll";

/**
 * Lectures du module 5 — bulletins de paie.
 * Les `Decimal` sont convertis en `number` ici, avant la frontiere serveur/client.
 */

export interface PayrollRow {
  id: string;
  reference: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  year: number;
  month: number;
  baseSalary: number;
  totalBonuses: number;
  totalCommissions: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: PayrollStatus;
  paidAt: Date | null;
}

export interface PayrollFilters {
  search?: string;
  status?: PayrollStatus;
  periode?: Periode;
}

export interface PayrollStats {
  bulletins: number;
  masseBrute: number;
  masseNette: number;
  aPayer: number;
  enAttenteValidation: number;
}

function wherePayroll(filters: PayrollFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.periode ? { year: filters.periode.year, month: filters.periode.month } : {}),
    ...(recherche
      ? {
          OR: [
            { reference: { contains: recherche } },
            { employee: { firstName: { contains: recherche } } },
            { employee: { lastName: { contains: recherche } } },
            { employee: { matricule: { contains: recherche } } },
          ],
        }
      : {}),
  };
}

export async function listPayrolls(
  filters: PayrollFilters,
  pagination: PaginationParams,
): Promise<Page<PayrollRow>> {
  const where = wherePayroll(filters);

  const [bulletins, total] = await Promise.all([
    prisma.payroll.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }, { employee: { lastName: "asc" } }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        reference: true,
        year: true,
        month: true,
        baseSalary: true,
        totalBonuses: true,
        totalCommissions: true,
        totalDeductions: true,
        grossSalary: true,
        netSalary: true,
        status: true,
        paidAt: true,
        employee: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    }),
    prisma.payroll.count({ where }),
  ]);

  const items: PayrollRow[] = bulletins.map((bulletin) => ({
    id: bulletin.id,
    reference: bulletin.reference,
    employeeId: bulletin.employee.id,
    employeeName: `${bulletin.employee.lastName} ${bulletin.employee.firstName}`,
    matricule: bulletin.employee.matricule,
    year: bulletin.year,
    month: bulletin.month,
    baseSalary: Number(bulletin.baseSalary),
    totalBonuses: Number(bulletin.totalBonuses),
    totalCommissions: Number(bulletin.totalCommissions),
    totalDeductions: Number(bulletin.totalDeductions),
    grossSalary: Number(bulletin.grossSalary),
    netSalary: Number(bulletin.netSalary),
    status: bulletin.status as PayrollStatus,
    paidAt: bulletin.paidAt,
  }));

  return buildPage(items, total, pagination);
}

/** Synthese de la periode consultee. */
export async function getPayrollStats(periode: Periode): Promise<PayrollStats> {
  const where = { year: periode.year, month: periode.month };

  const [totaux, bulletins, aPayer, enAttenteValidation] = await Promise.all([
    prisma.payroll.aggregate({
      where: { ...where, status: { not: "ANNULE" } },
      _sum: { grossSalary: true, netSalary: true },
    }),
    prisma.payroll.count({ where }),
    prisma.payroll.aggregate({
      where: { ...where, status: "VALIDE" },
      _sum: { netSalary: true },
    }),
    prisma.payroll.count({ where: { ...where, status: { in: ["BROUILLON", "CALCULE"] } } }),
  ]);

  return {
    bulletins,
    masseBrute: Number(totaux._sum.grossSalary ?? 0),
    masseNette: Number(totaux._sum.netSalary ?? 0),
    aPayer: Number(aPayer._sum.netSalary ?? 0),
    enAttenteValidation,
  };
}
