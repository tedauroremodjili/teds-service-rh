import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { AttendanceStatus, LeaveStatus, LeaveType } from "../domain/attendance";

/**
 * Lectures du module 4 — pointages et conges.
 * Projection directe vers des structures d'affichage (voir dashboard-queries).
 */

/* -------------------------------------------------------------------------- */
/* Presences                                                                   */
/* -------------------------------------------------------------------------- */

export interface AttendanceRow {
  id: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  departement: string | null;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: AttendanceStatus;
  lateMinutes: number;
  overtimeMinutes: number;
  notes: string | null;
}

export interface AttendanceFilters {
  /** Jour consulte, normalise a minuit UTC. */
  date: Date;
  search?: string;
  status?: AttendanceStatus;
}

export interface AttendanceStats {
  effectifActif: number;
  pointages: number;
  presents: number;
  retards: number;
  absents: number;
  conges: number;
  minutesRetard: number;
  minutesSupplementaires: number;
}

function whereAttendance(filters: AttendanceFilters) {
  const recherche = filters.search?.trim();

  return {
    date: filters.date,
    ...(filters.status ? { status: filters.status } : {}),
    ...(recherche
      ? {
          employee: {
            OR: [
              { firstName: { contains: recherche } },
              { lastName: { contains: recherche } },
              { matricule: { contains: recherche } },
            ],
          },
        }
      : {}),
  };
}

export async function listAttendance(
  filters: AttendanceFilters,
  pagination: PaginationParams,
): Promise<Page<AttendanceRow>> {
  const where = whereAttendance(filters);

  const [pointages, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      orderBy: [{ employee: { lastName: "asc" } }, { employee: { firstName: "asc" } }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        date: true,
        checkIn: true,
        checkOut: true,
        status: true,
        lateMinutes: true,
        overtimeMinutes: true,
        notes: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricule: true,
            department: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendance.count({ where }),
  ]);

  const items: AttendanceRow[] = pointages.map((pointage) => ({
    id: pointage.id,
    employeeId: pointage.employee.id,
    employeeName: `${pointage.employee.lastName} ${pointage.employee.firstName}`,
    matricule: pointage.employee.matricule,
    departement: pointage.employee.department?.name ?? null,
    date: pointage.date,
    checkIn: pointage.checkIn,
    checkOut: pointage.checkOut,
    status: pointage.status as AttendanceStatus,
    lateMinutes: pointage.lateMinutes,
    overtimeMinutes: pointage.overtimeMinutes,
    notes: pointage.notes,
  }));

  return buildPage(items, total, pagination);
}

/** Synthese du jour consulte : c'est la lecture utile au responsable RH. */
export async function getAttendanceStats(date: Date): Promise<AttendanceStats> {
  const [effectifActif, parStatut, minutes] = await Promise.all([
    prisma.employee.count({ where: { status: "ACTIF", deletedAt: null } }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { date },
      _count: { _all: true },
    }),
    prisma.attendance.aggregate({
      where: { date },
      _sum: { lateMinutes: true, overtimeMinutes: true },
    }),
  ]);

  const compte = (status: AttendanceStatus) =>
    parStatut.find((ligne) => ligne.status === status)?._count._all ?? 0;

  return {
    effectifActif,
    pointages: parStatut.reduce((total, ligne) => total + ligne._count._all, 0),
    presents: compte("PRESENT") + compte("MISSION"),
    retards: compte("RETARD"),
    absents: compte("ABSENT") + compte("ABSENCE_JUSTIFIEE"),
    conges: compte("CONGE") + compte("AUTORISATION"),
    minutesRetard: minutes._sum.lateMinutes ?? 0,
    minutesSupplementaires: minutes._sum.overtimeMinutes ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Conges                                                                      */
/* -------------------------------------------------------------------------- */

export interface LeaveRow {
  id: string;
  employeeId: string;
  employeeName: string;
  matricule: string;
  type: LeaveType;
  status: LeaveStatus;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string | null;
  approvedAt: Date | null;
}

export interface LeaveFilters {
  search?: string;
  status?: LeaveStatus;
  type?: LeaveType;
}

export interface LeaveStats {
  enAttente: number;
  approuves: number;
  refuses: number;
  joursApprouvesAnnee: number;
  enCours: number;
}

function whereLeave(filters: LeaveFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(recherche
      ? {
          employee: {
            OR: [
              { firstName: { contains: recherche } },
              { lastName: { contains: recherche } },
              { matricule: { contains: recherche } },
            ],
          },
        }
      : {}),
  };
}

export async function listLeaves(
  filters: LeaveFilters,
  pagination: PaginationParams,
): Promise<Page<LeaveRow>> {
  const where = whereLeave(filters);

  const [conges, total] = await Promise.all([
    prisma.leave.findMany({
      where,
      // Les demandes en attente d'abord : ce sont les seules qui appellent une
      // decision, elles ne doivent pas se perdre au milieu de l'historique.
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        daysCount: true,
        reason: true,
        approvedAt: true,
        employee: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    }),
    prisma.leave.count({ where }),
  ]);

  const items: LeaveRow[] = conges.map((conge) => ({
    id: conge.id,
    employeeId: conge.employee.id,
    employeeName: `${conge.employee.lastName} ${conge.employee.firstName}`,
    matricule: conge.employee.matricule,
    type: conge.type as LeaveType,
    status: conge.status as LeaveStatus,
    startDate: conge.startDate,
    endDate: conge.endDate,
    daysCount: conge.daysCount,
    reason: conge.reason,
    approvedAt: conge.approvedAt,
  }));

  return buildPage(items, total, pagination);
}

export async function getLeaveStats(): Promise<LeaveStats> {
  const maintenant = new Date();
  const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);

  const [enAttente, approuves, refuses, jours, enCours] = await Promise.all([
    prisma.leave.count({ where: { status: "EN_ATTENTE" } }),
    prisma.leave.count({ where: { status: "APPROUVE" } }),
    prisma.leave.count({ where: { status: "REFUSE" } }),
    prisma.leave.aggregate({
      where: { status: "APPROUVE", startDate: { gte: debutAnnee } },
      _sum: { daysCount: true },
    }),
    prisma.leave.count({
      where: {
        status: "APPROUVE",
        startDate: { lte: maintenant },
        endDate: { gte: maintenant },
      },
    }),
  ]);

  return {
    enAttente,
    approuves,
    refuses,
    joursApprouvesAnnee: jours._sum.daysCount ?? 0,
    enCours,
  };
}
