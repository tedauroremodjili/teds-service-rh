import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

import type {
  AuthRepository,
  AuthenticatableUser,
  LoginAttemptRecord,
} from "../domain/auth-repository";
import type { RoleName } from "../domain/permissions";
import {
  activeOverridesFilter,
  OVERRIDES_SELECT,
  ROLE_SELECT,
  toPermissionOverrides,
  toRolePermissions,
} from "./permission-overrides";

/**
 * Implementation PostgreSQL du port AuthRepository.
 * C'est le seul fichier du module auth qui connaisse Prisma.
 */
export const prismaAuthRepository: AuthRepository = {
  async findByEmail(email: string): Promise<AuthenticatableUser | null> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        mustChangePassword: true,
        role: { select: ROLE_SELECT },
        employee: { select: { id: true, firstName: true, lastName: true } },
        // Droits propres au compte : ils voyagent ensuite dans le cookie de
        // session, deja fusionnes avec ceux du role.
        permissions: {
          where: activeOverridesFilter(),
          select: OVERRIDES_SELECT,
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      status: user.status,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      mustChangePassword: user.mustChangePassword,
      role: user.role.name as RoleName,
      rolePermissions: toRolePermissions(user.role.permissions),
      permissionOverrides: toPermissionOverrides(user.permissions),
      employeeId: user.employee?.id ?? null,
      displayName: user.employee
        ? `${user.employee.firstName} ${user.employee.lastName}`
        : user.email,
    };
  },

  async recordFailedAttempt(userId, attempts, lockedUntil) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  },

  async recordSuccessfulLogin(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },

  async appendLoginHistory(entry: LoginAttemptRecord) {
    await prisma.loginHistory.create({
      data: {
        userId: entry.userId,
        email: entry.email,
        success: entry.success,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        reason: entry.reason,
      },
    });
  },
};
