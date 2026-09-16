import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Hourglass, Percent, Users } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  COMMISSION_SOURCE_TYPES,
  COMMISSION_STATUSES,
  lienSource,
  type CommissionSourceType,
  type CommissionStatus,
} from "@/modules/commissions/domain/commission";
import {
  getCommissionStats,
  listCommissionRules,
  listCommissions,
} from "@/modules/commissions/infrastructure/commission-queries";
import {
  COMMISSION_SOURCE_LABELS,
  COMMISSION_STATUS_LABELS,
  CommissionStatusBadge,
} from "@/modules/commissions/presentation/commission-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatMoney, formatNumber, formatPercent } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Commissions",
};

/**
 * Commissions sur ventes (module 6).
 *
 * Les regles de calcul en vigueur sont affichees au-dessus de la liste : un
 * montant de commission n'est verifiable que si l'on connait le taux qui l'a
 * produit.
 */
export default async function CommissionsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    source?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.COMMISSIONS_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = COMMISSION_STATUSES.includes(searchParams.statut as CommissionStatus)
    ? (searchParams.statut as CommissionStatus)
    : undefined;
  const source = COMMISSION_SOURCE_TYPES.includes(searchParams.source as CommissionSourceType)
    ? (searchParams.source as CommissionSourceType)
    : undefined;

  const [page, stats, regles] = await Promise.all([
    listCommissions(
      { search: searchParams.recherche?.trim() || undefined, status: statut, sourceType: source },
      pagination,
    ),
    getCommissionStats(),
    listCommissionRules(),
  ]);

  return (
    <>
      <PageHeader
        title="Commissions — synthèse"
        description="Commissions générées par les ventes, les inscriptions et les prestations."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Commissions", href: "/commissions" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="En attente"
          value={formatMoney(stats.montantEnAttente)}
          hint="À valider"
          icon={<Hourglass />}
          tone={stats.montantEnAttente > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Validées"
          value={formatMoney(stats.montantValide)}
          hint="À intégrer en paie"
          icon={<CheckCircle2 />}
          tone="info"
        />
        <StatCard
          label="Intégrées en paie"
          value={formatMoney(stats.montantIntegre)}
          hint="Déjà versées avec les salaires"
          icon={<Percent />}
          tone="success"
        />
        <StatCard
          label="Bénéficiaires"
          value={formatNumber(stats.beneficiaires)}
          hint={`${formatNumber(stats.total)} commissions enregistrées`}
          icon={<Users />}
          tone="primary"
        />
      </div>

      {regles.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Règles de calcul en vigueur"
            description="Le taux appliqué automatiquement selon l'origine de la vente"
            icon={<Percent className="size-4.5" />}
          />
          <CardBody>
            <ul className="flex flex-wrap gap-2">
              {regles.map((regle) => (
                <li
                  key={regle.id}
                  className="flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2"
                >
                  <span className="text-sm font-medium text-surface-700">{regle.name}</span>
                  <Badge tone={regle.isActive ? "success" : "neutral"}>
                    {regle.fixedAmount !== null
                      ? formatMoney(regle.fixedAmount)
                      : formatPercent(regle.rate)}
                  </Badge>
                  <span className="text-xs text-surface-400">
                    {COMMISSION_SOURCE_LABELS[regle.sourceType]}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <ListFilters
          basePath="/commissions"
          searchPlaceholder="Nom, matricule ou référence de la source"
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: COMMISSION_STATUSES.map((status) => ({
                value: status,
                label: COMMISSION_STATUS_LABELS[status],
              })),
            },
            {
              name: "source",
              label: "Origine",
              placeholder: "Toutes les origines",
              options: COMMISSION_SOURCE_TYPES.map((sourceType) => ({
                value: sourceType,
                label: COMMISSION_SOURCE_LABELS[sourceType],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Percent />}
            title="Aucune commission"
            description={
              searchParams.recherche || statut || source
                ? "Aucun résultat ne correspond à ces critères."
                : "Les commissions sont générées automatiquement à chaque vente."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Bénéficiaire</TH>
                <TH>Origine</TH>
                <TH align="right">Base</TH>
                <TH align="right">Taux</TH>
                <TH align="right">Commission</TH>
                <TH>Règle</TH>
                <TH>Date</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((commission) => (
                  <TR key={commission.id}>
                    <TD>
                      <Link
                        href={`/employes/${commission.employeeId}`}
                        className="group block min-w-0"
                      >
                        <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                          {commission.employeeName}
                        </span>
                        <span className="block truncate font-mono text-xs text-surface-400">
                          {commission.matricule}
                        </span>
                      </Link>
                    </TD>
                    <TD>
                      <Link
                        href={lienSource(commission.sourceType, commission.sourceId)}
                        className="text-sm text-primary-700 hover:underline"
                      >
                        {COMMISSION_SOURCE_LABELS[commission.sourceType]}
                      </Link>
                    </TD>
                    <TD align="right">{formatMoney(commission.baseAmount)}</TD>
                    <TD align="right">{formatPercent(commission.rate)}</TD>
                    <TD align="right" className="font-semibold text-primary-900">
                      {formatMoney(commission.amount)}
                    </TD>
                    <TD className="text-xs text-surface-500">{commission.ruleName ?? "Manuelle"}</TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateShort(commission.createdAt)}
                    </TD>
                    <TD>
                      <CommissionStatusBadge status={commission.status} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/commissions"
              searchParams={{
                recherche: searchParams.recherche,
                statut: searchParams.statut,
                source: searchParams.source,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
