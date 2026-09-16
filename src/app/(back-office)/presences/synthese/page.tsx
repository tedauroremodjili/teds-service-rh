import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Clock, TimerOff, UserCheck, UserX } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import {
  ATTENDANCE_STATUSES,
  formatDuree,
  jourPointage,
  versChampDate,
  type AttendanceStatus,
} from "@/modules/attendance/domain/attendance";
import {
  getAttendanceStats,
  listAttendance,
} from "@/modules/attendance/infrastructure/attendance-queries";
import {
  ATTENDANCE_STATUS_LABELS,
  AttendanceStatusBadge,
} from "@/modules/attendance/presentation/attendance-badges";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDate, formatNumber } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Présences",
};

/** Heure d'un pointage, en heure locale (« 08:12 »). */
function formatHeure(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(value);
}

/**
 * Feuille de pointage du jour (module 4).
 *
 * La liste est ancree sur UNE journee : c'est ainsi qu'on tient une feuille de
 * presence. Le jour se choisit dans l'URL (?jour=2026-08-03), donc une journee
 * passee se partage par lien.
 */
export default async function PresencesPage(props: {
  searchParams: Promise<{
    jour?: string;
    recherche?: string;
    statut?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.ATTENDANCE_READ);
  const searchParams = await props.searchParams;

  const jour = jourPointage(searchParams.jour);
  const pagination = parsePagination(searchParams.page);
  const statut = ATTENDANCE_STATUSES.includes(searchParams.statut as AttendanceStatus)
    ? (searchParams.statut as AttendanceStatus)
    : undefined;

  const [page, stats] = await Promise.all([
    listAttendance(
      { date: jour, search: searchParams.recherche?.trim() || undefined, status: statut },
      pagination,
    ),
    getAttendanceStats(jour),
  ]);

  const nonPointes = Math.max(0, stats.effectifActif - stats.pointages);

  return (
    <>
      <PageHeader
        title="Présences — synthèse"
        description={`Feuille de pointage du ${formatDate(jour)}.`}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Présences", href: "/presences" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Présents"
          value={formatNumber(stats.presents)}
          hint={`sur ${formatNumber(stats.effectifActif)} employés actifs`}
          icon={<UserCheck />}
          tone="success"
        />
        <StatCard
          label="Retards"
          value={formatNumber(stats.retards)}
          hint={
            stats.minutesRetard > 0 ? `${formatDuree(stats.minutesRetard)} cumulées` : "Aucun retard"
          }
          icon={<Clock />}
          tone={stats.retards > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Absences"
          value={formatNumber(stats.absents)}
          hint={`${formatNumber(stats.conges)} en congé ou autorisation`}
          icon={<UserX />}
          tone={stats.absents > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Non pointés"
          value={formatNumber(nonPointes)}
          hint={
            stats.minutesSupplementaires > 0
              ? `${formatDuree(stats.minutesSupplementaires)} supplémentaires`
              : "Aucune saisie manquante"
          }
          icon={<TimerOff />}
          tone={nonPointes > 0 ? "info" : "success"}
        />
      </div>

      <Card>
        <ListFilters
          basePath="/presences"
          searchPlaceholder="Nom ou matricule"
          fields={[{ name: "jour", label: "Journée", type: "date" }]}
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: ATTENDANCE_STATUSES.map((status) => ({
                value: status,
                label: ATTENDANCE_STATUS_LABELS[status],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<CalendarClock />}
            title="Aucun pointage ce jour"
            description={`Aucune présence n'a été enregistrée pour le ${formatDate(jour)}.`}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Employé</TH>
                <TH>Département</TH>
                <TH>Arrivée</TH>
                <TH>Départ</TH>
                <TH align="right">Retard</TH>
                <TH align="right">Heures sup.</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((pointage) => (
                  <TR key={pointage.id}>
                    <TD>
                      <Link
                        href={`/employes/${pointage.employeeId}`}
                        className="group block min-w-0"
                      >
                        <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                          {pointage.employeeName}
                        </span>
                        <span className="block truncate font-mono text-xs text-surface-400">
                          {pointage.matricule}
                        </span>
                      </Link>
                    </TD>
                    <TD>{pointage.departement ?? "—"}</TD>
                    <TD className="tabular-nums">{formatHeure(pointage.checkIn)}</TD>
                    <TD className="tabular-nums">{formatHeure(pointage.checkOut)}</TD>
                    <TD align="right">
                      {pointage.lateMinutes > 0 ? (
                        <span className="font-medium text-danger-700">
                          {formatDuree(pointage.lateMinutes)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD align="right">{formatDuree(pointage.overtimeMinutes)}</TD>
                    <TD>
                      <AttendanceStatusBadge status={pointage.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/presences"
              searchParams={{
                jour: versChampDate(jour),
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
