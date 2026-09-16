import type { Metadata } from "next";
import { CircleDollarSign, HandCoins, ShoppingCart, TrendingUp } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { SALE_STATUSES, resteAPayer, type SaleStatus } from "@/modules/sales/domain/sale";
import { getSaleStats, listSales } from "@/modules/sales/infrastructure/sale-queries";
import { SALE_STATUS_LABELS, SaleStatusBadge } from "@/modules/sales/presentation/sale-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatMoney, formatNumber } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Ventes",
};

/**
 * Ventes de documents administratifs (module 7).
 * Le reste du est calcule par le domaine : une vente annulee ne doit rien.
 */
export default async function VentesPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.SALES_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = SALE_STATUSES.includes(searchParams.statut as SaleStatus)
    ? (searchParams.statut as SaleStatus)
    : undefined;

  const [page, stats] = await Promise.all([
    listSales({ search: searchParams.recherche?.trim() || undefined, status: statut }, pagination),
    getSaleStats(),
  ]);

  return (
    <>
      <PageHeader
        title="Ventes — synthèse"
        description="Documents administratifs vendus au guichet."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Ventes", href: "/ventes" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventes du mois"
          value={formatNumber(stats.ventesDuMois)}
          hint="Hors ventes annulées"
          icon={<ShoppingCart />}
          tone="primary"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={formatMoney(stats.chiffreAffairesDuMois)}
          hint="Facturé ce mois-ci"
          icon={<TrendingUp />}
          tone="success"
        />
        <StatCard
          label="Encaissé"
          value={formatMoney(stats.encaisseDuMois)}
          hint="Réellement perçu ce mois-ci"
          icon={<HandCoins />}
          tone="info"
        />
        <StatCard
          label="Reste dû"
          value={formatMoney(stats.resteDu)}
          hint="Toutes ventes non soldées"
          icon={<CircleDollarSign />}
          tone={stats.resteDu > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <ListFilters
          basePath="/ventes"
          searchPlaceholder="Référence, client ou vendeur"
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: SALE_STATUSES.map((status) => ({
                value: status,
                label: SALE_STATUS_LABELS[status],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart />}
            title="Aucune vente"
            description={
              searchParams.recherche || statut
                ? "Aucun résultat ne correspond à ces critères."
                : "Les ventes de documents apparaîtront ici dès le premier encaissement."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Référence</TH>
                <TH>Client</TH>
                <TH align="center">Articles</TH>
                <TH align="right">Total</TH>
                <TH align="right">Payé</TH>
                <TH align="right">Reste</TH>
                <TH>Date</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((vente) => {
                  const reste = resteAPayer(vente.totalAmount, vente.paidAmount, vente.status);

                  return (
                    <TR key={vente.id}>
                      <TD className="font-mono text-xs text-surface-500">{vente.reference}</TD>
                      <TD className="font-medium text-surface-800">{vente.customerName}</TD>
                      <TD align="center">{formatNumber(vente.articles)}</TD>
                      <TD align="right" className="font-medium">
                        {formatMoney(vente.totalAmount)}
                      </TD>
                      <TD align="right">{formatMoney(vente.paidAmount)}</TD>
                      <TD align="right">
                        {reste > 0 ? (
                          <span className="font-semibold text-danger-700">
                            {formatMoney(reste)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">{formatDateShort(vente.soldAt)}</TD>
                      <TD>
                        <SaleStatusBadge status={vente.status} />
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
              basePath="/ventes"
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
