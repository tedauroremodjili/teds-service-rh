import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UserPlus } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { isWildcardRole, PERMISSIONS, type RoleName } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { listRoles } from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import { listUsers } from "@/modules/users/application/user-use-cases";
import { isUserStatus } from "@/modules/users/domain/user-account";
import { prismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";
import { ArchiveUserRowButton } from "@/modules/users/presentation/archive-user-row-button";
import { UserFilters } from "@/modules/users/presentation/user-filters";
import { RoleBadge, UserStatusBadge } from "@/modules/users/presentation/user-status-badge";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateTime } from "@/shared/lib/format";
import { LinkButton } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { RowActions } from "@/shared/ui/row-actions";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Utilisateurs",
};

/**
 * Liste des comptes (module 1).
 *
 * La colonne « Droits propres » est le coeur de l'ecran : elle montre d'un coup
 * d'oeil quels comptes s'ecartent de leur role, dans un sens ou dans l'autre.
 */
export default async function UtilisateursPage(props: {
  searchParams: Promise<{
    recherche?: string;
    role?: string;
    statut?: string;
    personnalises?: string;
    page?: string;
  }>;
}) {
  const user = await requirePermission(PERMISSIONS.USERS_READ);
  const searchParams = await props.searchParams;

  const canManageUsers = can(user, PERMISSIONS.USERS_MANAGE);
  const pagination = parsePagination(searchParams.page);

  // Les roles existants sont lus en base : ils ne sont plus figes dans le code
  // depuis qu'ils se creent depuis /roles.
  const roles = await listRoles(prismaRoleRepository);
  const role = roles.some((existant) => existant.name === searchParams.role)
    ? (searchParams.role as RoleName)
    : undefined;

  const page = await listUsers(
    prismaUserRepository,
    {
      search: searchParams.recherche?.trim() || undefined,
      role,
      status:
        searchParams.statut && isUserStatus(searchParams.statut)
          ? searchParams.statut
          : undefined,
      onlyCustomized: searchParams.personnalises === "1",
    },
    pagination,
  );

  return (
    <>
      <PageHeader
        title="Utilisateurs et droits"
        description="Chaque compte reçoit le socle de son rôle, puis les permissions qu'on lui attribue individuellement."
        breadcrumbs={[{ label: "Accueil", href: "/tableau-de-bord" }, { label: "Utilisateurs" }]}
        actions={
          <>
            <LinkButton href="/roles" variant="outline">
              <ShieldCheck className="size-4" />
              Rôles
            </LinkButton>
            {can(user, PERMISSIONS.USERS_MANAGE) ? (
              <LinkButton href="/utilisateurs/nouveau">
                <UserPlus className="size-4" />
                Nouveau compte
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Card>
        <UserFilters roles={roles} />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck />}
            title="Aucun compte trouvé"
            description="Aucun compte ne correspond à ces critères. Modifiez ou réinitialisez les filtres."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Utilisateur</TH>
                <TH>Rôle</TH>
                <TH>Droits propres</TH>
                <TH>Dernière connexion</TH>
                <TH>Statut</TH>
                <TH className="no-print" />
              </THead>
              <TBody>
                {page.items.map((compte) => {
                  const estSoiMeme = compte.id === user.id;
                  // Le joker (super administrateur) ne s'archive pas depuis
                  // un compte qui ne le detient pas lui-meme — meme regle que
                  // la Server Action, pour ne jamais proposer un geste voue a
                  // l'echec.
                  const archivable =
                    canManageUsers &&
                    !estSoiMeme &&
                    (!isWildcardRole(compte.role) || isWildcardRole(user.role));

                  return (
                  <TR key={compte.id}>
                    <TD>
                      <Link href={`/utilisateurs/${compte.id}`} className="group block min-w-0">
                        <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                          {compte.displayName}
                        </span>
                        <span className="block truncate text-xs text-surface-500">
                          {compte.email}
                          {compte.matricule ? ` · ${compte.matricule}` : ""}
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      <RoleBadge role={compte.role} />
                    </TD>
                    <TD>
                      {compte.grantedCount === 0 && compte.revokedCount === 0 ? (
                        <span className="text-xs text-surface-400">Rôle seul</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5 text-xs">
                          {compte.grantedCount > 0 ? (
                            <span className="rounded-full bg-success-50 px-2 py-0.5 font-medium text-success-700">
                              +{compte.grantedCount}
                            </span>
                          ) : null}
                          {compte.revokedCount > 0 ? (
                            <span className="rounded-full bg-danger-50 px-2 py-0.5 font-medium text-danger-700">
                              −{compte.revokedCount}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-surface-500">
                      {compte.lastLoginAt ? formatDateTime(compte.lastLoginAt) : "Jamais"}
                    </TD>
                    <TD>
                      <UserStatusBadge status={compte.status} />
                    </TD>
                    <TD align="right" className="no-print">
                      <div className="flex items-center justify-end gap-1">
                        <RowActions
                          actions={[
                            { href: `/utilisateurs/${compte.id}`, label: "Ouvrir la fiche", icon: "voir" },
                            ...(canManageUsers
                              ? ([
                                  {
                                    href: `/utilisateurs/${compte.id}/modifier`,
                                    label: "Modifier",
                                    icon: "modifier",
                                  },
                                ] as const)
                              : []),
                          ]}
                        />
                        {archivable ? (
                          <ArchiveUserRowButton userId={compte.id} label={compte.displayName} />
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                  );
                })}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/utilisateurs"
              searchParams={{
                recherche: searchParams.recherche,
                role: searchParams.role,
                statut: searchParams.statut,
                personnalises: searchParams.personnalises,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
