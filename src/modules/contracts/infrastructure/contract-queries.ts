import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import { PREAVIS_EXPIRATION_JOURS, type ContractStatus, type ContractType } from "../domain/contract";

/**
 * Lectures du module 3 — contrats.
 *
 * Comme pour le tableau de bord, une liste de consultation lit directement la
 * base et projette vers une structure d'affichage : reconstruire les agregats du
 * domaine pour n'afficher qu'un tableau serait couteux et sans objet. Les
 * ECRITURES, elles, passeront par le domaine.
 *
 * Les `Decimal` de Prisma sont convertis en `number` ICI, avant la frontiere
 * serveur/client : un Decimal n'est pas serialisable.
 */

export interface ContractRow {
  id: string;
  reference: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  type: ContractType;
  status: ContractStatus;
  startDate: Date;
  endDate: Date | null;
  baseSalary: number;
  signedAt: Date | null;
}

export interface ContractFilters {
  search?: string;
  status?: ContractStatus;
  type?: ContractType;
}

export interface ContractStats {
  total: number;
  actifs: number;
  expirantBientot: number;
  brouillons: number;
  masseSalarialeActive: number;
}

function dansNJours(jours: number, reference = new Date()): Date {
  return new Date(reference.getTime() + jours * 24 * 60 * 60 * 1000);
}

function whereFrom(filters: ContractFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.type ? { type: filters.type } : {}),
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

export async function listContracts(
  filters: ContractFilters,
  pagination: PaginationParams,
): Promise<Page<ContractRow>> {
  const where = whereFrom(filters);

  const [contrats, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { reference: "desc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        reference: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        baseSalary: true,
        signedAt: true,
        employee: {
          select: { id: true, firstName: true, lastName: true, matricule: true },
        },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  const items: ContractRow[] = contrats.map((contrat) => ({
    id: contrat.id,
    reference: contrat.reference,
    employeeId: contrat.employee.id,
    employeeName: `${contrat.employee.lastName} ${contrat.employee.firstName}`,
    matricule: contrat.employee.matricule,
    type: contrat.type as ContractType,
    status: contrat.status as ContractStatus,
    startDate: contrat.startDate,
    endDate: contrat.endDate,
    baseSalary: Number(contrat.baseSalary),
    signedAt: contrat.signedAt,
  }));

  return buildPage(items, total, pagination);
}

export async function getContractStats(): Promise<ContractStats> {
  const maintenant = new Date();

  const [total, actifs, expirantBientot, brouillons, masse] = await Promise.all([
    prisma.contract.count(),
    prisma.contract.count({ where: { status: "ACTIF" } }),
    prisma.contract.count({
      where: {
        status: "ACTIF",
        endDate: { gte: maintenant, lte: dansNJours(PREAVIS_EXPIRATION_JOURS, maintenant) },
      },
    }),
    prisma.contract.count({ where: { status: "BROUILLON" } }),
    prisma.contract.aggregate({ where: { status: "ACTIF" }, _sum: { baseSalary: true } }),
  ]);

  return {
    total,
    actifs,
    expirantBientot,
    brouillons,
    masseSalarialeActive: Number(masse._sum.baseSalary ?? 0),
  };
}
