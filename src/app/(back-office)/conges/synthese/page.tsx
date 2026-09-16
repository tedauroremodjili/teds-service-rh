import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarDays, CalendarX, Hourglass } from "lucide-react";

import {
  LEAVE_STATUSES,
  LEAVE_TYPES,
  type LeaveStatus,
  type LeaveType,
} from "@/modules/attendance/domain/attendance";
import {
  getLeaveStats,
  listLeaves,
} from "@/modules/attendance/infrastructure/attendance-queries";
import {
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  LeaveStatusBadge,
} from "@/modules/attendance/presentation/attendance-badges";
import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatNumber } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Congés",
};

/**
 * Demandes de conge (module 4).
 *
 * Les demandes en attente sont remontees en tete de liste par la requete : ce
 * sont les seules qui appellent une decision.
 */
export default async function CongesPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    type?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.LEAVES_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = LEAVE_STATUSES.includes(searchParams.statut as LeaveStatus)
    ? (searchParams.statut as LeaveStatus)
    : undefined;
  const type = LEAVE_TYPES.includes(searchParams.type as LeaveType)
    ? (searchParams.type as LeaveType)
    : undefined;

  const [page, stats] = await Promise.all([
    listLeaves(
      { search: searchParams.recherche?.trim() || undefined, status: statut, type },
      pagination,
    ),
    getLeaveStats(),
  ]);

  return (
    <>
      <PageHeader
        title="Congés — synthèse"
        description="Demandes d'absence, validations et jours consommés."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Congés", href: "/conges" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En attente"
          value={formatNumber(stats.enAttente)}
          hint="Demandes à traiter"
          icon={<Hourglass />}
          tone={stats.enAttente > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Absents aujourd'hui"
          value={formatNumber(stats.enCours)}
          hint="Congés approuvés en cours"
          icon={<CalendarDays />}
          tone="info"
        />
        <StatCard
          label="Jours accordés"
          value={formatNumber(stats.joursApprouvesAnnee)}
          hint="Depuis le 1er janvier"
          icon={<CalendarCheck />}
          tone="primary"
        />
        <StatCard
          label="Demandes refusées"
          value={formatNumber(stats.refuses)}
          hint={`${formatNumber(stats.approuves)} approuvées au total`}
          icon={<CalendarX />}
          tone="accent"
        />
      </div>

      <Card>
        <ListFilters
          basePath="/conges"
          searchPlaceholder="Nom ou matricule"
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: LEAVE_STATUSES.map((status) => ({
                value: status,
                label: LEAVE_STATUS_LABELS[status],
              })),
            },
            {
              name: "type",
              label: "Type",
              placeholder: "Tous les types",
              options: LEAVE_TYPES.map((leaveType) => ({
                value: leaveType,
                label: LEAVE_TYPE_LABELS[leaveType],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title="Aucune demande de congé"
            description={
              searchParams.recherche || statut || type
                ? "Aucun résultat ne correspond à ces critères."
                : "Les demandes d'absence du personnel apparaîtront ici."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Employé</TH>
                <TH>Type</TH>
                <TH>Du</TH>
                <TH>Au</TH>
                <TH align="right">Jours</TH>
                <TH>Motif</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((conge) => (
                  <TR key={conge.id}>
                    <TD>
                      <Link href={`/employes/${conge.employeeId}`} className="group block min-w-0">
                        <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                          {conge.employeeName}
                        </span>
                        <span className="block truncate font-mono text-xs text-surface-400">
                          {conge.matricule}
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone="neutral">{LEAVE_TYPE_LABELS[conge.type]}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateShort(conge.startDate)}
                    </TD>
                    <TD className="whitespace-nowrap text-xs">{formatDateShort(conge.endDate)}</TD>
                    <TD align="right" className="font-medium">
                      {formatNumber(conge.daysCount)}
                    </TD>
                    <TD className="max-w-64">
                      <span className="block truncate text-xs text-surface-500">
                        {conge.reason ?? "—"}
                      </span>
                    </TD>
                    <TD>
                      <LeaveStatusBadge status={conge.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/conges"
              searchParams={{
                recherche: searchParams.recherche,
                statut: searchParams.statut,
                type: searchParams.type,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
