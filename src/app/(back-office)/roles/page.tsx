import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck, Users } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
} from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { listRoles } from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import { Badge } from "@/shared/ui/badge";
import { LinkButton } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Rôles et permissions",
};

/**
 * Les rôles et leur socle de droits (module 1).
 *
 * Le socle vit en base : le modifier ici change les droits de tous les comptes
 * qui portent le rôle. Pour n'ouvrir un accès qu'à une personne, on passe par
 * sa fiche dans /utilisateurs — c'est la distinction que cet écran doit rendre
 * évidente.
 */
export default async function RolesPage() {
  const user = await requirePermission(PERMISSIONS.USERS_READ);

  const roles = await listRoles(prismaRoleRepository);
  const total = ALL_PERMISSIONS.length;
  const peutGerer = can(user, PERMISSIONS.ROLES_MANAGE);

  return (
    <>
      <PageHeader
        title="Rôles et permissions"
        description="Le rôle donne le socle de droits ; il s'applique à tous les comptes qui le portent."
        breadcrumbs={[{ label: "Accueil", href: "/tableau-de-bord" }, { label: "Rôles" }]}
        actions={
          <>
            <LinkButton href="/utilisateurs" variant="outline">
              <Users className="size-4" />
              Utilisateurs
            </LinkButton>
            {peutGerer ? (
              <LinkButton href="/roles/nouveau">
                <Plus className="size-4" />
                Nouveau rôle
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Alert tone="info" className="mb-5">
        Modifier un rôle touche <strong>tous ses titulaires</strong>. Pour n&apos;ouvrir un accès
        qu&apos;à une personne, ouvrez sa fiche dans{" "}
        <Link href="/utilisateurs" className="font-medium underline">
          Utilisateurs
        </Link>{" "}
        et cochez le droit voulu : il s&apos;ajoute à son rôle sans toucher aux autres comptes.
      </Alert>

      <Card>
        <Table>
          <THead>
            <TH>Rôle</TH>
            <TH>Droits du socle</TH>
            <TH align="right">Comptes</TH>
          </THead>
          <TBody>
            {roles.map((role) => {
              const joker = role.name === "SUPER_ADMIN";

              return (
                <TR key={role.name}>
                  <TD>
                    <Link href={`/roles/${role.name}`} className="group block min-w-0">
                      <span className="block font-medium text-surface-800 group-hover:text-primary-700">
                        {role.label}
                      </span>
                      <span className="block text-xs text-surface-500">
                        {role.description ?? ROLE_DESCRIPTIONS[role.name]}
                      </span>
                    </Link>
                  </TD>
                  <TD>
                    {joker ? (
                      <Badge tone="accent">Tous les droits (joker)</Badge>
                    ) : (
                      <span className="text-sm text-surface-600">
                        {role.permissions.length} / {total}
                      </span>
                    )}
                  </TD>
                  <TD align="right" className="whitespace-nowrap">
                    {role.userCount}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="flex items-center gap-2 px-5 py-3 text-xs text-surface-500">
          <ShieldCheck className="size-3.5" />
          {roles.length} rôles — socle chargé depuis la base, modifiable avec la permission
          « Attribuer rôles et permissions ».
        </p>
      </Card>
    </>
  );
}
