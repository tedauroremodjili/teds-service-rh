import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

import { isPermission, type PermissionOverride } from "../domain/permissions";

/**
 * Lecture des permissions attribuees a un utilisateur precis.
 *
 * Deux appelants s'en servent, et il est important qu'ils lisent la MEME chose :
 * la connexion (pour remplir le cookie de session) et le DAL (pour recharger
 * les droits reels a chaque action sensible). D'ou ce fichier unique.
 */

/**
 * Une attribution temporaire cesse d'exister le jour de son echeance.
 * `expiresAt: null` = permanente.
 */
export function activeOverridesFilter(now: Date = new Date()) {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

interface OverrideRow {
  granted: boolean;
  permission: { code: string };
}

/**
 * Convertit les lignes de la base en ecarts du domaine.
 *
 * Les codes inconnus sont ignores : une permission peut avoir ete supprimee du
 * catalogue alors que la ligne subsiste en base. Mieux vaut l'ignorer que de
 * laisser une chaine arbitraire circuler dans la session.
 */
export function toPermissionOverrides(rows: readonly OverrideRow[]): PermissionOverride[] {
  return rows
    .filter((row) => isPermission(row.permission.code))
    .map((row) => ({
      permission: row.permission.code as PermissionOverride["permission"],
      granted: row.granted,
    }));
}

/** Selection Prisma commune, pour ne pas la reecrire a deux endroits. */
export const OVERRIDES_SELECT = {
  granted: true,
  permission: { select: { code: true } },
} as const;

/**
 * Selection Prisma du socle d'un role.
 * Les droits d'un role vivent en base (`role_permissions`) : la matrice du code
 * n'est plus que la valeur d'installation, appliquee par `prisma db seed`.
 */
export const ROLE_SELECT = {
  name: true,
  permissions: { select: { permission: { select: { code: true } } } },
} as const;

export function toRolePermissions(
  rows: ReadonlyArray<{ permission: { code: string } }>,
): string[] {
  return rows.map((row) => row.permission.code).filter(isPermission);
}

export async function loadPermissionOverrides(userId: string): Promise<PermissionOverride[]> {
  const rows = await prisma.userPermission.findMany({
    where: { userId, ...activeOverridesFilter() },
    select: OVERRIDES_SELECT,
  });

  return toPermissionOverrides(rows);
}
