import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import {
  prismaErrorCode,
  uniqueConstraintFields,
} from "@/infrastructure/database/prisma-errors";
import type { PermissionOverride, RoleName } from "@/modules/auth/domain/permissions";
import {
  activeOverridesFilter,
  OVERRIDES_SELECT,
  ROLE_SELECT,
  toPermissionOverrides,
  toRolePermissions,
} from "@/modules/auth/infrastructure/permission-overrides";
import { DomainError } from "@/shared/domain/errors";
import { buildPage, toSkip, type PaginationParams } from "@/shared/domain/pagination";
import { fail, ok, type Result } from "@/shared/domain/result";

import type { UserStatus } from "../domain/user-account";
import type {
  NewUserAccount,
  UserDetail,
  UserFilters,
  UserListItem,
  UserRepository,
} from "../domain/user-repository";

/**
 * Implementation PostgreSQL du port UserRepository.
 * Seul fichier du module a connaitre Prisma.
 */

const LIST_SELECT = {
  id: true,
  email: true,
  status: true,
  lastLoginAt: true,
  role: { select: { name: true } },
  employee: { select: { id: true, firstName: true, lastName: true, matricule: true } },
  permissions: {
    where: activeOverridesFilter(),
    select: { granted: true },
  },
} as const;

interface ListRow {
  id: string;
  email: string;
  status: string;
  lastLoginAt: Date | null;
  role: { name: string };
  employee: { id: string; firstName: string; lastName: string; matricule: string } | null;
  permissions: { granted: boolean }[];
}

function toListItem(row: ListRow): UserListItem {
  return {
    id: row.id,
    email: row.email,
    displayName: row.employee
      ? `${row.employee.firstName} ${row.employee.lastName}`
      : row.email,
    role: row.role.name as RoleName,
    status: row.status as UserStatus,
    employeeId: row.employee?.id ?? null,
    matricule: row.employee?.matricule ?? null,
    lastLoginAt: row.lastLoginAt,
    grantedCount: row.permissions.filter((permission) => permission.granted).length,
    revokedCount: row.permissions.filter((permission) => !permission.granted).length,
  };
}

export const prismaUserRepository: UserRepository = {
  async list(filters: UserFilters, pagination: PaginationParams) {
    const where = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.role ? { role: { name: filters.role } } : {}),
      // « Comptes personnalises » : ceux qui portent au moins un ecart actif.
      ...(filters.onlyCustomized
        ? { permissions: { some: activeOverridesFilter() } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search } },
              {
                employee: {
                  is: {
                    OR: [
                      { firstName: { contains: filters.search } },
                      { lastName: { contains: filters.search } },
                      { matricule: { contains: filters.search } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ email: "asc" }],
        skip: toSkip(pagination),
        take: pagination.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return buildPage(rows.map(toListItem), total, pagination);
  },

  async findById(id: string): Promise<UserDetail | null> {
    const row = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...LIST_SELECT,
        mustChangePassword: true,
        twoFactorEnabled: true,
        lockedUntil: true,
        createdAt: true,
        // Le socle du role, pour que la fiche montre d'ou vient chaque droit.
        role: { select: ROLE_SELECT },
        // La liste complete, cette fois : la fiche affiche le detail des
        // droits attribues, la liste ne comptait que leur nombre.
        permissions: {
          where: activeOverridesFilter(),
          select: { ...OVERRIDES_SELECT },
        },
      },
    });

    if (!row) return null;

    const overrides = toPermissionOverrides(row.permissions);

    return {
      ...toListItem({
        ...row,
        permissions: row.permissions.map((permission) => ({ granted: permission.granted })),
      }),
      rolePermissions: toRolePermissions(row.role.permissions),
      overrides,
      mustChangePassword: row.mustChangePassword,
      twoFactorEnabled: row.twoFactorEnabled,
      lockedUntil: row.lockedUntil,
      createdAt: row.createdAt,
    };
  },

  async create(account: NewUserAccount): Promise<Result<string>> {
    const role = await prisma.role.findUnique({
      where: { name: account.role },
      select: { id: true },
    });

    if (!role) {
      return fail(DomainError.notFound("Ce rôle n'existe pas."));
    }

    try {
      const user = await prisma.user.create({
        data: {
          email: account.email,
          passwordHash: account.passwordHash,
          roleId: role.id,
          status: "ACTIF",
          mustChangePassword: account.mustChangePassword,
          ...(account.employeeId
            ? { employee: { connect: { id: account.employeeId } } }
            : {}),
        },
        select: { id: true },
      });

      return ok(user.id);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        const champs = uniqueConstraintFields(error).join(",");

        return fail(
          champs.includes("email")
            ? DomainError.conflict("Cette adresse email a déjà un compte.", "email")
            : DomainError.conflict("Cet employé a déjà un compte.", "employeeId"),
        );
      }

      console.error("[users] création de compte impossible", error);
      return fail(
        DomainError.businessRule(
          "La création du compte a échoué. Réessayez dans un instant.",
          "ECRITURE_IMPOSSIBLE",
        ),
      );
    }
  },

  async updateAccount(
    id: string,
    account: { email: string; employeeId: string | null; mustChangePassword: boolean },
  ): Promise<Result<void>> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          email: account.email,
          mustChangePassword: account.mustChangePassword,
          // La relation est portee par Employee : on la (re)branche ou on la
          // detache explicitement, sinon un compte garderait son ancien
          // rattachement apres avoir ete relie a quelqu'un d'autre.
          employee: account.employeeId
            ? { connect: { id: account.employeeId } }
            : { disconnect: true },
        },
      });

      return ok(undefined);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        const champs = uniqueConstraintFields(error).join(",");
        return fail(
          champs.includes("email")
            ? DomainError.conflict("Cette adresse email a déjà un compte.", "email")
            : DomainError.conflict("Cet employé a déjà un compte.", "employeeId"),
        );
      }

      if (prismaErrorCode(error) === "P2025") {
        return fail(DomainError.notFound("Ce compte n'existe pas."));
      }

      console.error("[users] modification impossible", error);
      return fail(
        DomainError.businessRule("La modification a échoué.", "ECRITURE_IMPOSSIBLE"),
      );
    }
  },

  async replacePassword(id: string, passwordHash: string): Promise<Result<void>> {
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        // Un mot de passe reinitialise remet le compte en etat de se connecter :
        // garder le verrouillage ou le compteur d'echecs n'aurait aucun sens.
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return ok(undefined);
  },

  async archive(id: string): Promise<Result<void>> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIF" },
    });

    return ok(undefined);
  },

  async employeesWithoutAccount() {
    const employes = await prisma.employee.findMany({
      where: { deletedAt: null, userId: null, status: "ACTIF" },
      select: { id: true, firstName: true, lastName: true, matricule: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return employes.map((employe) => ({
      id: employe.id,
      label: `${employe.lastName} ${employe.firstName} (${employe.matricule})`,
    }));
  },

  /**
   * Remplacement transactionnel : on efface les ecarts existants puis on ecrit
   * les nouveaux. Entre les deux, le compte n'a plus que les droits de son
   * role — d'ou la transaction, qui rend l'etat intermediaire invisible aux
   * autres requetes.
   */
  async replaceOverrides(
    userId: string,
    overrides: readonly PermissionOverride[],
    grantedById: string | null,
  ): Promise<Result<void>> {
    const codes = overrides.map((override) => override.permission);

    const permissions = codes.length
      ? await prisma.permission.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        })
      : [];

    const idParCode = new Map(permissions.map((permission) => [permission.code, permission.id]));
    const manquantes = codes.filter((code) => !idParCode.has(code));

    if (manquantes.length > 0) {
      // Le catalogue du code et la table `permissions` ont divergé : il manque
      // un `prisma db seed`. Le dire clairement plutot que d'ecrire a moitie.
      return fail(
        DomainError.businessRule(
          `Ces permissions ne sont pas enregistrées en base : ${manquantes.join(", ")}. Relancez l'initialisation des permissions.`,
          "CATALOGUE_DESYNCHRONISE",
        ),
      );
    }

    try {
      await prisma.$transaction([
        prisma.userPermission.deleteMany({ where: { userId } }),
        ...(overrides.length
          ? [
              prisma.userPermission.createMany({
                data: overrides.map((override) => ({
                  userId,
                  permissionId: idParCode.get(override.permission)!,
                  granted: override.granted,
                  grantedById,
                })),
              }),
            ]
          : []),
      ]);

      return ok(undefined);
    } catch (error) {
      console.error("[users] écriture des permissions impossible", error);
      return fail(
        DomainError.businessRule(
          "L'enregistrement des droits a échoué. Réessayez dans un instant.",
          "ECRITURE_IMPOSSIBLE",
        ),
      );
    }
  },

  async changeRole(userId: string, role: RoleName): Promise<Result<void>> {
    const roleRow = await prisma.role.findUnique({ where: { name: role }, select: { id: true } });

    if (!roleRow) {
      return fail(DomainError.notFound("Ce rôle n'existe pas."));
    }

    await prisma.user.update({ where: { id: userId }, data: { roleId: roleRow.id } });
    return ok(undefined);
  },

  async setStatus(userId: string, status: UserStatus): Promise<Result<void>> {
    await prisma.user.update({ where: { id: userId }, data: { status } });
    return ok(undefined);
  },
};
