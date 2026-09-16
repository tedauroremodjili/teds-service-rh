import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, CircleDollarSign, FileText, Wrench } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  SERVICE_CATEGORIES,
  SERVICE_ORDER_STATUSES,
  resteDuPrestation,
  type ServiceCategory,
  type ServiceOrderStatus,
} from "@/modules/services/domain/service";
import {
  getServiceOrderStats,
  listServiceCatalog,
  listServiceOrders,
} from "@/modules/services/infrastructure/service-queries";
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_ORDER_STATUS_LABELS,
  ServiceOrderStatusBadge,
} from "@/modules/services/presentation/service-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatMoney, formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Prestations",
};

/**
 * Commandes de prestations de services (module 10).
 * Le catalogue des prestations proposees est rappele au-dessus des commandes.
 */
export default async function PrestationsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    categorie?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.SALES_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = SERVICE_ORDER_STATUSES.includes(searchParams.statut as ServiceOrderStatus)
    ? (searchParams.statut as ServiceOrderStatus)
    : undefined;
  const categorie = SERVICE_CATEGORIES.includes(searchParams.categorie as ServiceCategory)
    ? (searchParams.categorie as ServiceCategory)
    : undefined;

  const [page, stats, catalogue] = await Promise.all([
    listServiceOrders(
      { search: searchParams.recherche?.trim() || undefined, status: statut, category: categorie },
      pagination,
    ),
    getServiceOrderStats(),
    listServiceCatalog(),
  ]);

  return (
    <>
      <PageHeader
        title="Prestations — synthèse"
        description="Commandes de services : développement, maintenance, graphisme."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Prestations", href: "/prestations" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Commandes en cours"
          value={formatNumber(stats.enCours)}
          hint="Confirmées ou en production"
          icon={<Wrench />}
          tone="primary"
        />
        <StatCard
          label="Devis en attente"
          value={formatNumber(stats.devis)}
          hint="Pas encore confirmés par le client"
          icon={<FileText />}
          tone="info"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={formatMoney(stats.chiffreAffairesDuMois)}
          hint="Commandes du mois, hors devis"
          icon={<Briefcase />}
          tone="success"
        />
        <StatCard
          label="Reste dû"
          value={formatMoney(stats.resteDu)}
          hint={`${formatNumber(stats.prestationsActives)} prestations au catalogue`}
          icon={<CircleDollarSign />}
          tone={stats.resteDu > 0 ? "danger" : "success"}
        />
      </div>

      {catalogue.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title="Catalogue des prestations"
            description="Services proposés et prix indicatifs"
            icon={<Briefcase className="size-4.5" />}
          />
          <CardBody>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {catalogue.map((prestation) => (
                <li
                  key={prestation.id}
                  className="rounded-lg border border-surface-200 px-4 py-3"
                >
                  <p className="truncate text-sm font-medium text-surface-800">
                    {prestation.name}
                  </p>
                  <p className="truncate text-xs text-surface-500">
                    {SERVICE_CATEGORY_LABELS[prestation.category]}
                  </p>
                  <p className="mt-1.5 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-primary-900">
                      {formatMoney(prestation.basePrice)}
                    </span>
                    <span className="text-xs text-surface-400">
                      {formatNumber(prestation.commandes)} commande
                      {prestation.commandes > 1 ? "s" : ""}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <ListFilters
          basePath="/prestations"
          searchPlaceholder="Référence, client ou prestation"
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: SERVICE_ORDER_STATUSES.map((status) => ({
                value: status,
                label: SERVICE_ORDER_STATUS_LABELS[status],
              })),
            },
            {
              name: "categorie",
              label: "Catégorie",
              placeholder: "Toutes les catégories",
              options: SERVICE_CATEGORIES.map((category) => ({
                value: category,
                label: SERVICE_CATEGORY_LABELS[category],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Briefcase />}
            title="Aucune commande de prestation"
            description={
              searchParams.recherche || statut || categorie
                ? "Aucun résultat ne correspond à ces critères."
                : "Les devis et commandes de services apparaîtront ici."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Référence</TH>
                <TH>Prestation</TH>
                <TH>Client</TH>
                <TH>Responsable</TH>
                <TH align="right">Montant</TH>
                <TH align="right">Reste</TH>
                <TH>Commandée</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((commande) => {
                  const reste = resteDuPrestation(
                    commande.amount,
                    commande.paidAmount,
                    commande.status,
                  );

                  return (
                    <TR key={commande.id}>
                      <TD className="font-mono text-xs text-surface-500">{commande.reference}</TD>
                      <TD>
                        <span className="block truncate font-medium text-surface-800">
                          {commande.serviceName}
                        </span>
                        <span className="block truncate text-xs text-surface-400">
                          {SERVICE_CATEGORY_LABELS[commande.category]}
                        </span>
                      </TD>
                      <TD>{commande.customerName}</TD>
                      <TD>
                        <Link
                          href={`/employes/${commande.sellerId}`}
                          className="text-sm text-primary-700 hover:underline"
                        >
                          {commande.sellerName}
                        </Link>
                      </TD>
                      <TD align="right" className="font-medium">
                        {formatMoney(commande.amount)}
                      </TD>
                      <TD align="right">
                        {reste > 0 ? (
                          <span className="font-semibold text-danger-700">
                            {formatMoney(reste)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        {formatDateShort(commande.orderedAt)}
                      </TD>
                      <TD>
                        <ServiceOrderStatusBadge status={commande.status} />
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
              basePath="/prestations"
              searchParams={{
                recherche: searchParams.recherche,
                statut: searchParams.statut,
                categorie: searchParams.categorie,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
