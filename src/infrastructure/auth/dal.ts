import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/infrastructure/database/prisma";
import type { Permission, RoleName } from "@/modules/auth/domain/permissions";
import { hasPermission, resolvePermissions } from "@/modules/auth/domain/permissions";
import { toCurrentUser, type CurrentUser } from "@/modules/auth/domain/session";
import {
  activeOverridesFilter,
  OVERRIDES_SELECT,
  ROLE_SELECT,
  toPermissionOverrides,
  toRolePermissions,
} from "@/modules/auth/infrastructure/permission-overrides";
import { readSessionCookie } from "@/modules/auth/infrastructure/session";

/**
 * Data Access Layer — le point de controle unique de l'autorisation.
 *
 * Regle absolue du projet : toute page, toute Server Action et tout Route
 * Handler commence par appeler une fonction de ce fichier. Ne jamais se reposer
 * uniquement sur proxy.ts : celui-ci effectue une verification optimiste sur le
 * cookie, mais une Server Action est joignable par une requete POST directe, en
 * dehors de toute navigation. Le controle doit donc etre au plus pres des
 * donnees.
 *
 * `cache()` de React memorise le resultat pour la duree d'un rendu : la session
 * est verifiee une seule fois meme si quinze composants la demandent.
 */

/** Session brute, sans redirection. Renvoie null si non connecte. */
export const getSession = cache(async () => {
  return readSessionCookie();
});

/**
 * Utilisateur tel que decrit par le cookie, sans requete en base.
 * Suffisant pour une page publique ou un affichage decoratif ; insuffisant
 * pour decider d'un droit, car le cookie fige l'etat de la connexion.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  return session ? toCurrentUser(session) : null;
});

/**
 * Exige une session valide. Redirige vers la page de connexion sinon.
 * C'est la premiere ligne de toute page du back-office.
 *
 * La verification porte sur la BASE, pas sur le cookie : un compte desactive
 * ou dont on vient de retirer un droit ne doit pas continuer a naviguer
 * jusqu'a l'expiration de sa session. Le cout est d'une requete par rendu,
 * memorisee par `cache()` quel que soit le nombre de composants qui la
 * demandent.
 */
export const requireAuth = cache(async (): Promise<CurrentUser> => {
  const user = await getFreshUser();

  if (!user) {
    redirect("/connexion");
  }

  return user;
});

/**
 * Exige une permission precise. Redirige vers la page « acces refuse » si
 * l'utilisateur est connecte mais n'a pas le droit demande.
 *
 * Les droits compares sont les droits effectifs : role + permissions
 * attribuees individuellement, retraits compris.
 */
export async function requirePermission(
  permission: Permission | Permission[],
): Promise<CurrentUser> {
  const user = await requireAuth();

  if (!hasPermission(user.permissions, permission)) {
    redirect("/acces-refuse");
  }

  return user;
}

/** Exige l'un des roles indiques. */
export async function requireRole(...roles: RoleName[]): Promise<CurrentUser> {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    redirect("/acces-refuse");
  }

  return user;
}

/**
 * Recharge l'utilisateur depuis la base.
 *
 * Le cookie est signe, donc fiable, mais il fige l'etat au moment de la
 * connexion. Si un administrateur change le role d'un utilisateur, lui retire
 * une permission ou desactive son compte, le cookie garde l'ancienne valeur
 * jusqu'a expiration. Toute decision d'autorisation passe donc par ici.
 */
export const getFreshUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findFirst({
    where: { id: session.userId, deletedAt: null, status: "ACTIF" },
    select: {
      id: true,
      email: true,
      role: { select: ROLE_SELECT },
      employee: { select: { id: true, firstName: true, lastName: true } },
      permissions: {
        where: activeOverridesFilter(),
        select: OVERRIDES_SELECT,
      },
    },
  });

  if (!user) return null;

  const role = user.role.name as RoleName;

  return {
    id: user.id,
    email: user.email,
    role,
    permissions: resolvePermissions(
      role,
      toRolePermissions(user.role.permissions),
      toPermissionOverrides(user.permissions),
    ),
    employeeId: user.employee?.id ?? null,
    displayName: user.employee
      ? `${user.employee.firstName} ${user.employee.lastName}`
      : user.email,
  };
});

/**
 * Variante « stricte » de requirePermission, destinee aux Server Actions.
 * Elle leve une erreur au lieu de rediriger, et verifie l'etat reel du compte
 * en base — le cookie ne suffit pas pour autoriser une ecriture.
 */
export async function authorizeAction(
  permission: Permission | Permission[],
): Promise<CurrentUser> {
  const user = await getFreshUser();

  if (!user) {
    throw new Error("NON_AUTHENTIFIE");
  }
  if (!hasPermission(user.permissions, permission)) {
    throw new Error("NON_AUTORISE");
  }

  return user;
}
