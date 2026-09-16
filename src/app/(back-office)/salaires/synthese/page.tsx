import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, FileCheck2, Receipt, Wallet } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  PAYROLL_STATUSES,
  parsePeriode,
  versChampMois,
  type PayrollStatus,
} from "@/modules/payroll/domain/payroll";
import {
  getPayrollStats,
  listPayrolls,
} from "@/modules/payroll/infrastructure/payroll-queries";
import {
  PAYROLL_STATUS_LABELS,
  PayrollStatusBadge,
} from "@/modules/payroll/presentation/payroll-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatMoney, formatNumber, formatPeriod } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Salaires",
};

/**
 * Bulletins de paie (module 5).
 *
 * La liste est ancree sur une PERIODE (?periode=2026-08) : une paie se lit par
 * mois, et les indicateurs affiches (masse brute, reste a payer) ne veulent rien
 * dire hors d'un mois donne.
 */
export default async function SalairesPage(props: {
  searchParams: Promise<{
    periode?: string;
    recherche?: string;
    statut?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.PAYROLL_READ);
  const searchParams = await props.searchParams;

  const periode = parsePeriode(searchParams.periode);
  const pagination = parsePagination(searchParams.page);
  const statut = PAYROLL_STATUSES.includes(searchParams.statut as PayrollStatus)
    ? (searchParams.statut as PayrollStatus)
    : undefined;

  const [page, stats] = await Promise.all([
    listPayrolls(
      { periode, search: searchParams.recherche?.trim() || undefined, status: statut },
      pagination,
    ),
    getPayrollStats(periode),
  ]);

  return (
    <>
      <PageHeader
        title="Salaires — synthèse"
        description={`Bulletins de paie — ${formatPeriod(periode.year, periode.month)}.`}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Salaires", href: "/salaires" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bulletins"
          value={formatNumber(stats.bulletins)}
          hint={`${formatNumber(stats.enAttenteValidation)} en attente de validation`}
          icon={<Receipt />}
          tone="primary"
        />
        <StatCard
          label="Masse brute"
          value={formatMoney(stats.masseBrute)}
          hint="Bulletins non annulés"
          icon={<Banknote />}
          tone="info"
        />
        <StatCard
          label="Masse nette"
          value={formatMoney(stats.masseNette)}
          hint="Après cotisations et retenues"
          icon={<Wallet />}
          tone="accent"
        />
        <StatCard
          label="Reste à payer"
          value={formatMoney(stats.aPayer)}
          hint="Bulletins validés non réglés"
          icon={<FileCheck2 />}
          tone={stats.aPayer > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <ListFilters
          basePath="/salaires"
          searchPlaceholder="Référence, nom ou matricule"
          fields={[{ name: "periode", label: "Période", type: "month" }]}
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: PAYROLL_STATUSES.map((status) => ({
                value: status,
                label: PAYROLL_STATUS_LABELS[status],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Receipt />}
            title="Aucun bulletin pour cette période"
            description={`La paie de ${formatPeriod(periode.year, periode.month)} n'a pas encore été calculée.`}
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Référence</TH>
                <TH>Employé</TH>
                <TH align="right">Salaire de base</TH>
                <TH align="right">Primes</TH>
                <TH align="right">Commissions</TH>
                <TH align="right">Retenues</TH>
                <TH align="right">Net à payer</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((bulletin) => (
                  <TR key={bulletin.id}>
                    <TD className="font-mono text-xs text-surface-500">{bulletin.reference}</TD>
                    <TD>
                      <Link
                        href={`/employes/${bulletin.employeeId}`}
                        className="group block min-w-0"
                      >
                        <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                          {bulletin.employeeName}
                        </span>
                        <span className="block truncate font-mono text-xs text-surface-400">
                          {bulletin.matricule}
                        </span>
                      </Link>
                    </TD>
                    <TD align="right">{formatMoney(bulletin.baseSalary)}</TD>
                    <TD align="right">
                      {bulletin.totalBonuses > 0 ? formatMoney(bulletin.totalBonuses) : "—"}
                    </TD>
                    <TD align="right">
                      {bulletin.totalCommissions > 0
                        ? formatMoney(bulletin.totalCommissions)
                        : "—"}
                    </TD>
                    <TD align="right" className="text-danger-700">
                      {bulletin.totalDeductions > 0
                        ? `- ${formatMoney(bulletin.totalDeductions)}`
                        : "—"}
                    </TD>
                    <TD align="right" className="font-semibold text-primary-900">
                      {formatMoney(bulletin.netSalary)}
                    </TD>
                    <TD>
                      <PayrollStatusBadge status={bulletin.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/salaires"
              searchParams={{
                periode: versChampMois(periode),
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
