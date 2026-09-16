import type { Metadata } from "next";
import { BadgeCheck, CircleDollarSign, GraduationCap, Users } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  REGISTRATION_STATUSES,
  type RegistrationStatus,
} from "@/modules/students/domain/student";
import {
  getStudentStats,
  listStudents,
} from "@/modules/students/infrastructure/student-queries";
import {
  REGISTRATION_STATUS_LABELS,
  RegistrationStatusBadge,
} from "@/modules/students/presentation/student-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/avatar";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Apprenants",
};

/**
 * Fichier des apprenants (module 9).
 *
 * Le reste du est cumule sur toutes les inscriptions de l'apprenant : c'est
 * l'information qu'attend le secretariat au moment de le recevoir.
 */
export default async function ApprenantsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.STUDENTS_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = REGISTRATION_STATUSES.includes(searchParams.statut as RegistrationStatus)
    ? (searchParams.statut as RegistrationStatus)
    : undefined;

  const [page, stats] = await Promise.all([
    listStudents(
      { search: searchParams.recherche?.trim() || undefined, status: statut },
      pagination,
    ),
    getStudentStats(),
  ]);

  return (
    <>
      <PageHeader
        title="Apprenants — synthèse"
        description="Fichier des apprenants, inscriptions et soldes."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Apprenants", href: "/apprenants" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Apprenants enregistrés"
          value={formatNumber(stats.total)}
          hint="Fichier complet"
          icon={<Users />}
          tone="primary"
        />
        <StatCard
          label="En formation"
          value={formatNumber(stats.actifs)}
          hint="Inscription en cours"
          icon={<GraduationCap />}
          tone="success"
        />
        <StatCard
          label="Certifiés"
          value={formatNumber(stats.diplomes)}
          hint="Au moins un certificat délivré"
          icon={<BadgeCheck />}
          tone="accent"
        />
        <StatCard
          label="Impayés"
          value={formatMoney(stats.impayes)}
          hint="Sur toutes les inscriptions"
          icon={<CircleDollarSign />}
          tone={stats.impayes > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <ListFilters
          basePath="/apprenants"
          searchPlaceholder="Nom, matricule, téléphone ou email"
          selects={[
            {
              name: "statut",
              label: "Inscription",
              placeholder: "Tous les statuts",
              options: REGISTRATION_STATUSES.map((status) => ({
                value: status,
                label: REGISTRATION_STATUS_LABELS[status],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<GraduationCap />}
            title="Aucun apprenant"
            description={
              searchParams.recherche || statut
                ? "Aucun résultat ne correspond à ces critères."
                : "Les apprenants inscrits aux formations apparaîtront ici."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Apprenant</TH>
                <TH>Contact</TH>
                <TH>Niveau d&apos;études</TH>
                <TH>Formation</TH>
                <TH align="center">Inscriptions</TH>
                <TH align="center">Certificats</TH>
                <TH align="right">Reste dû</TH>
              </THead>
              <TBody>
                {page.items.map((apprenant) => (
                  <TR key={apprenant.id}>
                    <TD>
                      <span className="flex items-center gap-3">
                        <Avatar
                          firstName={apprenant.firstName}
                          lastName={apprenant.lastName}
                          photoUrl={apprenant.photoUrl}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-surface-800">
                            {apprenant.lastName} {apprenant.firstName}
                          </span>
                          <span className="block truncate font-mono text-xs text-surface-400">
                            {apprenant.matricule}
                          </span>
                        </span>
                      </span>
                    </TD>
                    <TD>
                      <span className="block text-sm">{apprenant.phone}</span>
                      <span className="block truncate text-xs text-surface-500">
                        {apprenant.email ?? "—"}
                      </span>
                    </TD>
                    <TD>{apprenant.educationLevel ?? "—"}</TD>
                    <TD className="max-w-56">
                      {apprenant.formationCourante ? (
                        <>
                          <span className="block truncate text-sm">
                            {apprenant.formationCourante}
                          </span>
                          {apprenant.statutCourant ? (
                            <span className="mt-1 block">
                              <RegistrationStatusBadge status={apprenant.statutCourant} />
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-xs text-surface-400">Aucune inscription</span>
                      )}
                    </TD>
                    <TD align="center">{formatNumber(apprenant.inscriptions)}</TD>
                    <TD align="center">{formatNumber(apprenant.certificats)}</TD>
                    <TD align="right">
                      {apprenant.resteDu > 0 ? (
                        <span className="font-semibold text-danger-700">
                          {formatMoney(apprenant.resteDu)}
                        </span>
                      ) : (
                        <span className="text-success-700">Soldé</span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/apprenants"
              searchParams={{
                recherche: searchParams.recherche,
                statut: searchParams.statut,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
