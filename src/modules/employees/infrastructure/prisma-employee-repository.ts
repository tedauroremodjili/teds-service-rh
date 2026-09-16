import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { DomainError } from "@/shared/domain/errors";
import { buildPage, toSkip, type PaginationParams } from "@/shared/domain/pagination";
import { fail, ok, type Result } from "@/shared/domain/result";

import type { Employee, EmployeeStatus } from "../domain/employee";
import type {
  EmployeeDetail,
  EmployeeFilters,
  EmployeeListItem,
  EmployeeRepository,
} from "../domain/employee-repository";

/** Colonnes chargees pour les listes : on ne remonte que ce qui est affiche. */
const LIST_SELECT = {
  id: true,
  matricule: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  photoUrl: true,
  status: true,
  hireDate: true,
  baseSalary: true,
  commissionRate: true,
  department: { select: { name: true } },
  position: { select: { title: true } },
} as const;

function toListItem(row: {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  status: string;
  hireDate: Date;
  baseSalary: unknown;
  commissionRate: unknown;
  department: { name: string } | null;
  position: { title: string } | null;
}): EmployeeListItem {
  return {
    id: row.id,
    matricule: row.matricule,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photoUrl,
    status: row.status as EmployeeStatus,
    hireDate: row.hireDate,
    // Prisma renvoie les Decimal sous forme d'objet : on les ramene a un nombre
    // avant de franchir la frontiere serveur/client, qui n'accepte que des
    // valeurs serialisables.
    baseSalary: Number(row.baseSalary),
    commissionRate: Number(row.commissionRate),
    departmentName: row.department?.name ?? null,
    positionTitle: row.position?.title ?? null,
  };
}

/** Champs uniques du modele, avec le message a afficher en cas de collision. */
const CHAMPS_UNIQUES: Record<string, { field: string; message: string }> = {
  matricule: {
    field: "matricule",
    message: "Ce matricule est déjà attribué à un autre employé.",
  },
  email: {
    field: "email",
    message: "Cette adresse email est déjà utilisée par un autre employé.",
  },
};

/**
 * Traduit une violation de contrainte d'unicite PostgreSQL (code P2002) en
 * erreur du domaine. Sans cela, l'utilisateur verrait une trace Prisma.
 *
 * Ce cas survient malgre la verification prealable : entre le `count` et
 * l'`insert`, une autre session a pu inserer la meme valeur. La base est
 * l'arbitre final ; le code doit savoir lire son verdict.
 */
function toConflictError(error: unknown): DomainError | null {
  if (typeof error !== "object" || error === null) return null;
  if ((error as { code?: string }).code !== "P2002") return null;

  const champs = (error as { meta?: { target?: unknown } }).meta?.target;
  const premier = Array.isArray(champs) ? String(champs[0]) : undefined;
  const connu = premier ? CHAMPS_UNIQUES[premier] : undefined;

  if (connu) {
    return DomainError.conflict(connu.message, connu.field);
  }

  // Contrainte inconnue : message generique, mais toujours pas de trace technique.
  return DomainError.conflict(
    "Une fiche employé comporte déjà cette valeur. Vérifiez le matricule et l'adresse email.",
  );
}

export const prismaEmployeeRepository: EmployeeRepository = {
  async list(filters: EmployeeFilters, pagination: PaginationParams) {
    const where = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.search
        ? {
            OR: [
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
              { matricule: { contains: filters.search } },
              { email: { contains: filters.search } },
              { phone: { contains: filters.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: toSkip(pagination),
        take: pagination.pageSize,
      }),
      prisma.employee.count({ where }),
    ]);

    return buildPage(rows.map(toListItem), total, pagination);
  },

  async findById(id: string): Promise<EmployeeDetail | null> {
    const row = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...LIST_SELECT,
        gender: true,
        birthDate: true,
        birthPlace: true,
        nationality: true,
        maritalStatus: true,
        address: true,
        departmentId: true,
        positionId: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!row) return null;

    return {
      ...toListItem(row),
      gender: row.gender,
      birthDate: row.birthDate,
      birthPlace: row.birthPlace,
      nationality: row.nationality,
      maritalStatus: row.maritalStatus,
      address: row.address,
      departmentId: row.departmentId,
      positionId: row.positionId,
      hasUserAccount: row.userId !== null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  // Les fiches archivees sont incluses : la contrainte d'unicite SQL, elle,
  // ne fait pas la difference. Verifier sur le meme perimetre evite qu'une
  // saisie acceptee par l'application soit rejetee par la base.
  async existsByMatricule(matricule: string, exceptId?: string) {
    const count = await prisma.employee.count({
      where: { matricule, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  },

  async existsByEmail(email: string, exceptId?: string) {
    const count = await prisma.employee.count({
      where: { email, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    return count > 0;
  },

  async lastMatricule() {
    const row = await prisma.employee.findFirst({
      orderBy: { matricule: "desc" },
      select: { matricule: true },
    });
    return row?.matricule ?? null;
  },

  async save(employee: Employee): Promise<Result<string>> {
    try {
      const created = await prisma.employee.create({
        data: employee.toPersistence(),
        select: { id: true },
      });
      return ok(created.id);
    } catch (error) {
      const conflit = toConflictError(error);
      if (conflit) return fail(conflit);
      throw error;
    }
  },

  async update(id: string, employee: Employee): Promise<Result<void>> {
    try {
      await prisma.employee.update({
        where: { id },
        data: employee.toPersistence(),
      });
      return ok(undefined);
    } catch (error) {
      const conflit = toConflictError(error);
      if (conflit) return fail(conflit);
      throw error;
    }
  },

  async softDelete(id: string) {
    // Suppression logique : les fiches de paie, ventes et commissions passees
    // referencent cet employe. Les effacer reellement trouerait l'historique
    // comptable.
    await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: "DEMISSIONNE" },
    });
  },
};
