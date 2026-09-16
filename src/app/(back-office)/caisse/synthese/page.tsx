import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, ListOrdered, Wallet } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { CASH_DIRECTIONS, type CashDirection } from "@/modules/cash/domain/cash";
import {
  getCashStats,
  listCashTransactions,
} from "@/modules/cash/infrastructure/cash-queries";
import {
  CASH_DIRECTION_LABELS,
  CashDirectionBadge,
  PAYMENT_METHOD_LABELS,
} from "@/modules/cash/presentation/cash-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { parseMois } from "@/shared/domain/periode";
import { formatDateTime, formatMoney, formatNumber } from "@/shared/lib/format";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Caisse",
};

/**
 * Journal de caisse (module 11).
 *
 * Chaque ligne porte le solde APRES l'operation : c'est ce qui permet de
 * rapprocher le journal de l'especes reellement en caisse, ligne a ligne.
 */
export default async function CaissePage(props: {
  searchParams: Promise<{
    mois?: string;
    recherche?: string;
    sens?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.CASH_READ);
  const searchParams = await props.searchParams;

  const mois = parseMois(searchParams.mois);
  const pagination = parsePagination(searchParams.page);
  const sens = CASH_DIRECTIONS.includes(searchParams.sens as CashDirection)
    ? (searchParams.sens as CashDirection)
    : undefined;

  const [page, stats] = await Promise.all([
    listCashTransactions(
      {
        search: searchParams.recherche?.trim() || undefined,
        direction: sens,
        debut: mois.debut,
        fin: mois.fin,
      },
      pagination,
    ),
    getCashStats(mois.debut, mois.fin),
  ]);

  const fluxDuMois = stats.entreesDuMois - stats.sortiesDuMois;

  return (
    <>
      <PageHeader
        title="Caisse — synthèse"
        description="Journal des mouvements d'espèces et solde courant."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Caisse", href: "/caisse" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Solde de caisse"
          value={formatMoney(stats.solde)}
          hint="Tous mouvements confondus"
          icon={<Wallet />}
          tone={stats.solde >= 0 ? "primary" : "danger"}
        />
        <StatCard
          label="Entrées du mois"
          value={formatMoney(stats.entreesDuMois)}
          icon={<ArrowDownLeft />}
          tone="success"
        />
        <StatCard
          label="Sorties du mois"
          value={formatMoney(stats.sortiesDuMois)}
          icon={<ArrowUpRight />}
          tone="danger"
        />
        <StatCard
          label="Flux du mois"
          value={formatMoney(Math.abs(fluxDuMois))}
          hint={`${formatNumber(stats.mouvementsDuMois)} mouvements — ${fluxDuMois >= 0 ? "excédent" : "déficit"}`}
          icon={<ListOrdered />}
          tone={fluxDuMois >= 0 ? "success" : "danger"}
        />
      </div>

      <Card>
        <ListFilters
          basePath="/caisse"
          searchPlaceholder="Référence, libellé ou catégorie"
          fields={[{ name: "mois", label: "Mois", type: "month" }]}
          selects={[
            {
              name: "sens",
              label: "Sens",
              placeholder: "Entrées et sorties",
              options: CASH_DIRECTIONS.map((direction) => ({
                value: direction,
                label: CASH_DIRECTION_LABELS[direction],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Wallet />}
            title="Aucun mouvement ce mois-ci"
            description="Les encaissements et décaissements du mois apparaîtront ici."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Référence</TH>
                <TH>Libellé</TH>
                <TH>Catégorie</TH>
                <TH>Sens</TH>
                <TH align="right">Montant</TH>
                <TH align="right">Solde après</TH>
                <TH>Date</TH>
              </THead>
              <TBody>
                {page.items.map((mouvement) => (
                  <TR key={mouvement.id}>
                    <TD className="font-mono text-xs text-surface-500">{mouvement.reference}</TD>
                    <TD>
                      <span className="block truncate font-medium text-surface-800">
                        {mouvement.label}
                      </span>
                      {mouvement.employeeName || mouvement.paymentMethod ? (
                        <span className="block truncate text-xs text-surface-400">
                          {[
                            mouvement.employeeName,
                            mouvement.paymentMethod
                              ? PAYMENT_METHOD_LABELS[mouvement.paymentMethod]
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" — ")}
                        </span>
                      ) : null}
                    </TD>
                    <TD className="text-xs text-surface-500">{mouvement.category ?? "—"}</TD>
                    <TD>
                      <CashDirectionBadge direction={mouvement.direction} />
                    </TD>
                    <TD
                      align="right"
                      className={
                        mouvement.direction === "ENTREE"
                          ? "font-semibold text-success-700"
                          : "font-semibold text-danger-700"
                      }
                    >
                      {mouvement.direction === "ENTREE" ? "+" : "−"} {formatMoney(mouvement.amount)}
                    </TD>
                    <TD align="right">{formatMoney(mouvement.balanceAfter)}</TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateTime(mouvement.occurredAt)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/caisse"
              searchParams={{
                mois: mois.champ,
                recherche: searchParams.recherche,
                sens: searchParams.sens,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
