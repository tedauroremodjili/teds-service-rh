import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Printer, Users } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { listEmployees } from "@/modules/employees/application/employee-use-cases";
import type { EmployeeStatus } from "@/modules/employees/domain/employee";
import { EMPLOYEE_STATUSES } from "@/modules/employees/domain/employee";
import { prismaEmployeeRepository } from "@/modules/employees/infrastructure/prisma-employee-repository";
import { getDepartmentOptions } from "@/modules/employees/infrastructure/reference-queries";
import { EmployeeFilters } from "@/modules/employees/presentation/employee-filters";
import { EmployeeStatusBadge } from "@/modules/employees/presentation/employee-status-badge";
import { listerReglesActivesParEmploye } from "@/modules/remuneration/infrastructure/prisma-remuneration-repository";
import { CommissionSummary } from "@/modules/remuneration/presentation/commission-summary";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatMoney } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/avatar";
import { LinkButton } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";
import { RowActions } from "@/shared/ui/row-actions";
import { Pagination } from "@/shared/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Employés",
};

/**
 * Liste du personnel (module 2).
 *
 * Next.js 16 : `searchParams` est une PROMESSE. C'est un changement de rupture
 * de la version 15/16 — il faut l'attendre avant de lire les filtres.
 */
export default async function EmployesPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    departement?: string;
    page?: string;
  }>;
}) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = EMPLOYEE_STATUSES.includes(searchParams.statut as EmployeeStatus)
    ? (searchParams.statut as EmployeeStatus)
    : undefined;

  const [page, departments] = await Promise.all([
    listEmployees(
      prismaEmployeeRepository,
      {
        search: searchParams.recherche?.trim() || undefined,
        status: statut,
        departmentId: searchParams.departement || undefined,
      },
      pagination,
    ),
    getDepartmentOptions(),
  ]);

  // Bareme par activite de la page affichee : une seule requete groupee,
  // plutot qu'une par ligne, pour que la colonne Commission montre le detail
  // reel (formation, document, prestation) des qu'une regle est posee.
  const reglesParEmploye = await listerReglesActivesParEmploye(
    page.items.map((employe) => employe.id),
  );

  const peutCreer = can(user, PERMISSIONS.EMPLOYEES_CREATE);
  const peutModifier = can(user, PERMISSIONS.EMPLOYEES_UPDATE);

  // L'etat imprime reprend les criteres de l'ecran, mais pas la page courante :
  // on imprime l'effectif filtre en entier, pas les vingt lignes affichees.
  const criteres = new URLSearchParams(
    Object.entries(searchParams).filter(
      (entree): entree is [string, string] =>
        entree[0] !== "page" && typeof entree[1] === "string" && entree[1].length > 0,
    ),
  ).toString();

  return (
    <>
      <PageHeader
        title="Employés"
        description="Gestion du personnel de TED'S SERVICE."
        breadcrumbs={[{ label: "Accueil", href: "/tableau-de-bord" }, { label: "Employés" }]}
        actions={
          <>
            <LinkButton
              href={`/employes/impression${criteres ? `?${criteres}` : ""}`}
              variant="outline"
            >
              <Printer className="size-4" />
              Imprimer
            </LinkButton>
            {peutCreer ? (
              <LinkButton href="/employes/nouveau">
                <Plus className="size-4" />
                Nouvel employé
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Card>
        <EmployeeFilters departments={departments} />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Aucun employé trouvé"
            description={
              searchParams.recherche || statut || searchParams.departement
                ? "Aucun résultat ne correspond à ces critères. Modifiez ou réinitialisez les filtres."
                : "Commencez par créer la fiche de votre premier employé."
            }
            action={
              peutCreer ? (
                <LinkButton href="/employes/nouveau" variant="primary">
                  <Plus className="size-4" />
                  Nouvel employé
                </LinkButton>
              ) : null
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Employé</TH>
                <TH>Matricule</TH>
                <TH>Poste</TH>
                <TH>Département</TH>
                <TH align="right">Salaire de base</TH>
                <TH align="right">Commission</TH>
                <TH>Embauche</TH>
                <TH>Statut</TH>
                <TH align="right" className="no-print">
                  Actions
                </TH>
              </THead>
              <TBody>
                {page.items.map((employe) => (
                  <TR key={employe.id}>
                    <TD>
                      <Link
                        href={`/employes/${employe.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar
                          firstName={employe.firstName}
                          lastName={employe.lastName}
                          photoUrl={employe.photoUrl}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                            {employe.lastName} {employe.firstName}
                          </span>
                          <span className="block truncate text-xs text-surface-500">
                            {employe.email}
                          </span>
                        </span>
                      </Link>
                    </TD>
                    <TD className="font-mono text-xs text-surface-500">{employe.matricule}</TD>
                    <TD>{employe.positionTitle ?? "—"}</TD>
                    <TD>{employe.departmentName ?? "—"}</TD>
                    <TD align="right" className="font-medium">
                      {formatMoney(employe.baseSalary)}
                    </TD>
                    <TD align="right">
                      <CommissionSummary
                        regles={reglesParEmploye.get(employe.id) ?? []}
                        fallbackRate={employe.commissionRate}
                      />
                    </TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateShort(employe.hireDate)}
                    </TD>
                    <TD>
                      <EmployeeStatusBadge status={employe.status} />
                    </TD>

                    {/* Les actions n'ont pas de sens sur le papier. */}
                    <TD align="right" className="no-print">
                      <RowActions
                        actions={[
                          {
                            href: `/employes/${employe.id}`,
                            label: "Ouvrir la fiche",
                            icon: "voir",
                          },
                          ...(peutModifier
                            ? ([
                                {
                                  href: `/employes/${employe.id}/modifier`,
                                  label: "Modifier",
                                  icon: "modifier",
                                },
                              ] as const)
                            : []),
                          {
                            href: `/employes/${employe.id}/impression`,
                            label: "Imprimer la fiche du personnel",
                            icon: "imprimer",
                          },
                        ]}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/employes"
              searchParams={{
                recherche: searchParams.recherche,
                statut: searchParams.statut,
                departement: searchParams.departement,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
