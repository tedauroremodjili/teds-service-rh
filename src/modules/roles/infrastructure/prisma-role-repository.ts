import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { prismaErrorCode } from "@/infrastructure/database/prisma-errors";
import { isPermission, type RoleName } from "@/modules/auth/domain/permissions";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import type {
  NewRole,
  RoleOption,
  RoleRepository,
  RoleSummary,
} from "../domain/role-repository";

/** Implementation PostgreSQL du port RoleRepository. */

const SELECT = {
  name: true,
  label: true,
  description: true,
  isSystem: true,
  permissions: { select: { permission: { select: { code: true } } } },
  _count: { select: { users: true } },
} as const;

interface Row {
  name: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  permissions: { permission: { code: string } }[];
  _count: { users: number };
}

function toSummary(row: Row): RoleSummary {
  return {
    name: row.name as RoleName,
    label: row.label,
    description: row.description,
    isSystem: row.isSystem,
    userCount: row._count.users,
    // Un code disparu du catalogue est ignore : la ligne subsiste en base mais
    // ne doit pas circuler comme une permission valide.
    permissions: row.permissions.map((entry) => entry.permission.code).filter(isPermission),
  };
}

export const prismaRoleRepository: RoleRepository = {
  async list(): Promise<RoleSummary[]> {
    const rows = await prisma.role.findMany({
      select: SELECT,
      orderBy: { name: "asc" },
    });

    return rows.map(toSummary);
  },

  async findByName(name: RoleName): Promise<RoleSummary | null> {
    const row = await prisma.role.findUnique({ where: { name }, select: SELECT });
    return row ? toSummary(row) : null;
  },

  async options(): Promise<RoleOption[]> {
    const rows = await prisma.role.findMany({
      select: { name: true, label: true, isSystem: true },
      // Les roles systeme d'abord : ce sont ceux que l'on choisit le plus
      // souvent, et cet ordre reste stable quand des roles sont ajoutes.
      orderBy: [{ isSystem: "desc" }, { label: "asc" }],
    });

    return rows.map((row) => ({
      name: row.name,
      label: row.label,
      isSystem: row.isSystem,
    }));
  },

  async create(role: NewRole): Promise<Result<RoleName>> {
    const permissions = role.permissions.length
      ? await prisma.permission.findMany({
          where: { code: { in: [...role.permissions] } },
          select: { id: true },
        })
      : [];

    try {
      await prisma.role.create({
        data: {
          name: role.name,
          label: role.label,
          description: role.description,
          isSystem: false,
          permissions: {
            createMany: {
              data: permissions.map((permission) => ({ permissionId: permission.id })),
            },
          },
        },
        select: { name: true },
      });

      return ok(role.name);
    } catch (error) {
      if (prismaErrorCode(error) === "P2002") {
        return fail(
          DomainError.conflict("Un rôle porte déjà cet identifiant.", "label"),
        );
      }

      console.error("[roles] création impossible", error);
      return fail(
        DomainError.businessRule(
          "La création du rôle a échoué. Réessayez dans un instant.",
          "ECRITURE_IMPOSSIBLE",
        ),
      );
    }
  },

  async updateInfo(
    name: RoleName,
    info: { label: string; description: string | null },
  ): Promise<Result<void>> {
    try {
      await prisma.role.update({
        where: { name },
        data: { label: info.label, description: info.description },
      });
      return ok(undefined);
    } catch (error) {
      if (prismaErrorCode(error) === "P2025") {
        return fail(DomainError.notFound("Ce rôle n'existe pas."));
      }

      console.error("[roles] modification impossible", error);
      return fail(
        DomainError.businessRule(
          "La modification du rôle a échoué.",
          "ECRITURE_IMPOSSIBLE",
        ),
      );
    }
  },

  async remove(name: RoleName): Promise<Result<void>> {
    try {
      // Les lignes de role_permissions partent en cascade ; les comptes, eux,
      // sont proteges par `onDelete: Restrict` sur la relation — d'ou la
      // verification prealable dans le cas d'usage, qui donne un message clair
      // plutot qu'une erreur de contrainte.
      await prisma.role.delete({ where: { name } });
      return ok(undefined);
    } catch (error) {
      if (prismaErrorCode(error) === "P2025") {
        return fail(DomainError.notFound("Ce rôle n'existe pas."));
      }

      console.error("[roles] suppression impossible", error);
      return fail(
        DomainError.businessRule(
          "Ce rôle ne peut pas être supprimé : des comptes ou des droits y sont encore rattachés.",
          "SUPPRESSION_IMPOSSIBLE",
        ),
      );
    }
  },

  async replacePermissions(
    name: RoleName,
    codes: readonly string[],
    updatedById: string | null,
  ): Promise<Result<void>> {
    const role = await prisma.role.findUnique({ where: { name }, select: { id: true } });
    if (!role) {
      return fail(DomainError.notFound("Ce rôle n'existe pas."));
    }

    const permissions = codes.length
      ? await prisma.permission.findMany({
          where: { code: { in: [...codes] } },
          select: { id: true, code: true },
        })
      : [];

    const manquantes = codes.filter(
      (code) => !permissions.some((permission) => permission.code === code),
    );

    if (manquantes.length > 0) {
      return fail(
        DomainError.businessRule(
          `Ces permissions ne sont pas enregistrées en base : ${manquantes.join(", ")}. Relancez l'initialisation des permissions.`,
          "CATALOGUE_DESYNCHRONISE",
        ),
      );
    }

    try {
      await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
        ...(permissions.length
          ? [
              prisma.rolePermission.createMany({
                data: permissions.map((permission) => ({
                  roleId: role.id,
                  permissionId: permission.id,
                })),
                skipDuplicates: true,
              }),
            ]
          : []),
      ]);

      // `updatedById` n'est pas stocke sur role_permissions : la tracabilite
      // passe par le journal d'audit, qui garde l'auteur et le detail.
      void updatedById;

      return ok(undefined);
    } catch (error) {
      console.error("[roles] écriture du socle impossible", error);
      return fail(
        DomainError.businessRule(
          "L'enregistrement des droits du rôle a échoué. Réessayez dans un instant.",
          "ECRITURE_IMPOSSIBLE",
        ),
      );
    }
  },
};
