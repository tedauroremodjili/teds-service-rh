import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import type { TrainingLevel, TrainingStatus } from "../domain/training";

/** Lectures des modules 8 et 9 — sessions de formation et certificats. */

/* -------------------------------------------------------------------------- */
/* Formations                                                                  */
/* -------------------------------------------------------------------------- */

export interface TrainingRow {
  id: string;
  code: string;
  title: string;
  categoryName: string | null;
  level: TrainingLevel;
  durationHours: number;
  price: number;
  maxStudents: number | null;
  inscrits: number;
  startDate: Date | null;
  endDate: Date | null;
  status: TrainingStatus;
  trainerId: string | null;
  trainerName: string | null;
}

export interface TrainingFilters {
  search?: string;
  status?: TrainingStatus;
  level?: TrainingLevel;
}

export interface TrainingStats {
  sessions: number;
  enCours: number;
  ouvertes: number;
  inscriptionsActives: number;
  chiffreAffairesInscriptions: number;
}

function whereTraining(filters: TrainingFilters) {
  const recherche = filters.search?.trim();

  return {
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.level ? { level: filters.level } : {}),
    ...(recherche
      ? {
          OR: [
            { code: { contains: recherche } },
            { title: { contains: recherche } },
            { description: { contains: recherche } },
          ],
        }
      : {}),
  };
}

export async function listTrainings(
  filters: TrainingFilters,
  pagination: PaginationParams,
): Promise<Page<TrainingRow>> {
  const where = whereTraining(filters);

  const [formations, total] = await Promise.all([
    prisma.training.findMany({
      where,
      orderBy: [{ startDate: "desc" }, { title: "asc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        code: true,
        title: true,
        level: true,
        durationHours: true,
        price: true,
        maxStudents: true,
        startDate: true,
        endDate: true,
        status: true,
        category: { select: { name: true } },
        trainer: { select: { id: true, firstName: true, lastName: true } },
        _count: {
          select: {
            // Les inscriptions annulees ne prennent pas de place : elles ne
            // doivent pas compter dans le remplissage de la session.
            registrations: { where: { status: { notIn: ["ANNULE", "ABANDONNE"] } } },
          },
        },
      },
    }),
    prisma.training.count({ where }),
  ]);

  const items: TrainingRow[] = formations.map((formation) => ({
    id: formation.id,
    code: formation.code,
    title: formation.title,
    categoryName: formation.category?.name ?? null,
    level: formation.level as TrainingLevel,
    durationHours: formation.durationHours,
    price: Number(formation.price),
    maxStudents: formation.maxStudents,
    inscrits: formation._count.registrations,
    startDate: formation.startDate,
    endDate: formation.endDate,
    status: formation.status as TrainingStatus,
    trainerId: formation.trainer?.id ?? null,
    trainerName: formation.trainer
      ? `${formation.trainer.lastName} ${formation.trainer.firstName}`
      : null,
  }));

  return buildPage(items, total, pagination);
}

export async function getTrainingStats(): Promise<TrainingStats> {
  const [sessions, enCours, ouvertes, inscriptionsActives, chiffre] = await Promise.all([
    prisma.training.count({ where: { deletedAt: null } }),
    prisma.training.count({ where: { deletedAt: null, status: "EN_COURS" } }),
    prisma.training.count({ where: { deletedAt: null, status: "OUVERTE" } }),
    prisma.studentRegistration.count({
      where: { status: { in: ["INSCRIT", "REINSCRIT", "EN_COURS"] } },
    }),
    prisma.studentRegistration.aggregate({
      where: { status: { notIn: ["ANNULE"] } },
      _sum: { agreedAmount: true, paidAmount: true },
    }),
  ]);

  return {
    sessions,
    enCours,
    ouvertes,
    inscriptionsActives,
    chiffreAffairesInscriptions: Number(chiffre._sum.agreedAmount ?? 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Certificats                                                                 */
/* -------------------------------------------------------------------------- */

export interface CertificateRow {
  id: string;
  reference: string;
  studentId: string;
  studentName: string;
  studentMatricule: string;
  trainingTitle: string;
  mention: string | null;
  issuedAt: Date;
  verificationCode: string;
  finalGrade: number | null;
}

export interface CertificateFilters {
  search?: string;
  trainingId?: string;
}

export interface CertificateStats {
  total: number;
  duMois: number;
  formationsCertifiantes: number;
  enAttente: number;
}

function debutDuMois(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function whereCertificate(filters: CertificateFilters) {
  const recherche = filters.search?.trim();

  return {
    ...(filters.trainingId ? { trainingId: filters.trainingId } : {}),
    ...(recherche
      ? {
          OR: [
            { reference: { contains: recherche } },
            { verificationCode: { contains: recherche } },
            { student: { firstName: { contains: recherche } } },
            { student: { lastName: { contains: recherche } } },
            { student: { matricule: { contains: recherche } } },
            { training: { title: { contains: recherche } } },
          ],
        }
      : {}),
  };
}

export async function listCertificates(
  filters: CertificateFilters,
  pagination: PaginationParams,
): Promise<Page<CertificateRow>> {
  const where = whereCertificate(filters);

  const [certificats, total] = await Promise.all([
    prisma.certificate.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        reference: true,
        mention: true,
        issuedAt: true,
        verificationCode: true,
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        training: { select: { title: true } },
        registration: { select: { finalGrade: true } },
      },
    }),
    prisma.certificate.count({ where }),
  ]);

  const items: CertificateRow[] = certificats.map((certificat) => ({
    id: certificat.id,
    reference: certificat.reference,
    studentId: certificat.student.id,
    studentName: `${certificat.student.lastName} ${certificat.student.firstName}`,
    studentMatricule: certificat.student.matricule,
    trainingTitle: certificat.training.title,
    mention: certificat.mention,
    issuedAt: certificat.issuedAt,
    verificationCode: certificat.verificationCode,
    finalGrade:
      certificat.registration?.finalGrade === null ||
      certificat.registration?.finalGrade === undefined
        ? null
        : Number(certificat.registration.finalGrade),
  }));

  return buildPage(items, total, pagination);
}

export async function getCertificateStats(): Promise<CertificateStats> {
  const [total, duMois, formationsCertifiantes, enAttente] = await Promise.all([
    prisma.certificate.count(),
    prisma.certificate.count({ where: { issuedAt: { gte: debutDuMois() } } }),
    prisma.certificate.groupBy({ by: ["trainingId"] }),
    // Une formation terminee sans certificat delivre : c'est ce qui reste a faire.
    prisma.studentRegistration.count({
      where: { status: "TERMINE", certificate: null },
    }),
  ]);

  return {
    total,
    duMois,
    formationsCertifiantes: formationsCertifiantes.length,
    enAttente,
  };
}

/** Sessions proposees dans le filtre des certificats. */
export async function getTrainingOptions(): Promise<{ value: string; label: string }[]> {
  const formations = await prisma.training.findMany({
    where: { deletedAt: null },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return formations.map((formation) => ({ value: formation.id, label: formation.title }));
}
