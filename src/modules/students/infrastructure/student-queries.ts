import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { buildPage, toSkip, type Page, type PaginationParams } from "@/shared/domain/pagination";

import {
  REGISTRATION_STATUSES_ACTIFS,
  resteDuInscription,
  type RegistrationStatus,
} from "../domain/student";

/** Lectures du module 9 — apprenants. */

export interface StudentRow {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  phone: string;
  email: string | null;
  educationLevel: string | null;
  inscriptions: number;
  certificats: number;
  /** Formation suivie actuellement, ou la derniere en date. */
  formationCourante: string | null;
  statutCourant: RegistrationStatus | null;
  resteDu: number;
}

export interface StudentFilters {
  search?: string;
  status?: RegistrationStatus;
}

export interface StudentStats {
  total: number;
  actifs: number;
  diplomes: number;
  impayes: number;
}

function whereStudent(filters: StudentFilters) {
  const recherche = filters.search?.trim();

  return {
    deletedAt: null,
    ...(filters.status ? { registrations: { some: { status: filters.status } } } : {}),
    ...(recherche
      ? {
          OR: [
            { matricule: { contains: recherche } },
            { firstName: { contains: recherche } },
            { lastName: { contains: recherche } },
            { phone: { contains: recherche } },
            { email: { contains: recherche } },
          ],
        }
      : {}),
  };
}

export async function listStudents(
  filters: StudentFilters,
  pagination: PaginationParams,
): Promise<Page<StudentRow>> {
  const where = whereStudent(filters);

  const [apprenants, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: toSkip(pagination),
      take: pagination.pageSize,
      select: {
        id: true,
        matricule: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        phone: true,
        email: true,
        educationLevel: true,
        _count: { select: { certificates: true } },
        // Toutes les inscriptions de l'apprenant : la page en affiche vingt au
        // plus, le cout reste raisonnable et evite une requete par ligne.
        registrations: {
          orderBy: { registeredAt: "desc" },
          select: {
            status: true,
            agreedAmount: true,
            paidAmount: true,
            registeredAt: true,
            training: { select: { title: true } },
          },
        },
      },
    }),
    prisma.student.count({ where }),
  ]);

  const items: StudentRow[] = apprenants.map((apprenant) => {
    const courante =
      apprenant.registrations.find((inscription) =>
        REGISTRATION_STATUSES_ACTIFS.includes(inscription.status as RegistrationStatus),
      ) ?? apprenant.registrations[0];

    const resteDu = apprenant.registrations.reduce(
      (total, inscription) =>
        total +
        resteDuInscription(
          Number(inscription.agreedAmount),
          Number(inscription.paidAmount),
          inscription.status as RegistrationStatus,
        ),
      0,
    );

    return {
      id: apprenant.id,
      matricule: apprenant.matricule,
      firstName: apprenant.firstName,
      lastName: apprenant.lastName,
      photoUrl: apprenant.photoUrl,
      phone: apprenant.phone,
      email: apprenant.email,
      educationLevel: apprenant.educationLevel,
      inscriptions: apprenant.registrations.length,
      certificats: apprenant._count.certificates,
      formationCourante: courante?.training.title ?? null,
      statutCourant: (courante?.status as RegistrationStatus | undefined) ?? null,
      resteDu,
    };
  });

  return buildPage(items, total, pagination);
}

export async function getStudentStats(): Promise<StudentStats> {
  const [total, actifs, diplomes, impayes] = await Promise.all([
    prisma.student.count({ where: { deletedAt: null } }),
    prisma.student.count({
      where: {
        deletedAt: null,
        registrations: { some: { status: { in: [...REGISTRATION_STATUSES_ACTIFS] } } },
      },
    }),
    prisma.student.count({ where: { deletedAt: null, certificates: { some: {} } } }),
    prisma.studentRegistration.aggregate({
      where: { status: { not: "ANNULE" } },
      _sum: { agreedAmount: true, paidAmount: true },
    }),
  ]);

  return {
    total,
    actifs,
    diplomes,
    impayes: Math.max(
      0,
      Number(impayes._sum.agreedAmount ?? 0) - Number(impayes._sum.paidAmount ?? 0),
    ),
  };
}
