import type { Metadata } from "next";
import { AlertTriangle, FileText, PackageCheck, ShoppingBag } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  DOCUMENT_CATEGORIES,
  PRODUCT_STATUSES,
  stockEnAlerte,
  type DocumentCategory,
  type ProductStatus,
} from "@/modules/documents/domain/document-product";
import {
  getDocumentProductStats,
  listDocumentProducts,
} from "@/modules/documents/infrastructure/product-queries";
import {
  DOCUMENT_CATEGORY_LABELS,
  PRODUCT_STATUS_LABELS,
  ProductStatusBadge,
} from "@/modules/documents/presentation/product-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatMoney, formatNumber, formatPercent } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Documents",
};

/**
 * Catalogue des documents administratifs vendus au guichet (module 7).
 * C'est le referentiel des prix : les ventes s'appuient dessus.
 */
export default async function DocumentsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    categorie?: string;
    statut?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.SALES_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const categorie = DOCUMENT_CATEGORIES.includes(searchParams.categorie as DocumentCategory)
    ? (searchParams.categorie as DocumentCategory)
    : undefined;
  const statut = PRODUCT_STATUSES.includes(searchParams.statut as ProductStatus)
    ? (searchParams.statut as ProductStatus)
    : undefined;

  const [page, stats] = await Promise.all([
    listDocumentProducts(
      { search: searchParams.recherche?.trim() || undefined, category: categorie, status: statut },
      pagination,
    ),
    getDocumentProductStats(),
  ]);

  return (
    <>
      <PageHeader
        title="Documents — synthèse"
        description="Catalogue des documents administratifs et de leurs tarifs."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Documents", href: "/documents" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articles au catalogue"
          value={formatNumber(stats.articles)}
          hint="Documents et supports"
          icon={<FileText />}
          tone="primary"
        />
        <StatCard
          label="Disponibles"
          value={formatNumber(stats.disponibles)}
          hint="Vendables immédiatement"
          icon={<PackageCheck />}
          tone="success"
        />
        <StatCard
          label="En rupture"
          value={formatNumber(stats.ruptures)}
          hint="À réapprovisionner"
          icon={<AlertTriangle />}
          tone={stats.ruptures > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Documents vendus"
          value={formatNumber(stats.totalVendus)}
          hint="Total imprimé et facturé, toutes ventes confirmées"
          icon={<ShoppingBag />}
          tone="accent"
        />
      </div>

      <Card>
        <ListFilters
          basePath="/documents"
          searchPlaceholder="Code, nom ou description"
          selects={[
            {
              name: "categorie",
              label: "Catégorie",
              placeholder: "Toutes les catégories",
              options: DOCUMENT_CATEGORIES.map((category) => ({
                value: category,
                label: DOCUMENT_CATEGORY_LABELS[category],
              })),
            },
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: PRODUCT_STATUSES.map((status) => ({
                value: status,
                label: PRODUCT_STATUS_LABELS[status],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="Aucun document au catalogue"
            description={
              searchParams.recherche || categorie || statut
                ? "Aucun résultat ne correspond à ces critères."
                : "Le catalogue définit les documents vendables et leurs tarifs."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Code</TH>
                <TH>Document</TH>
                <TH>Catégorie</TH>
                <TH align="right">Prix</TH>
                <TH align="right">Stock</TH>
                <TH align="right">Commission</TH>
                <TH align="right">Vendus</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((produit) => {
                  const alerte = stockEnAlerte(produit.stock, produit.alertStock);

                  return (
                    <TR key={produit.id}>
                      <TD className="font-mono text-xs text-surface-500">{produit.code}</TD>
                      <TD className="font-medium text-surface-800">{produit.name}</TD>
                      <TD>
                        <Badge tone="neutral">
                          {DOCUMENT_CATEGORY_LABELS[produit.category]}
                        </Badge>
                      </TD>
                      <TD align="right" className="font-medium">
                        {formatMoney(produit.price)}
                      </TD>
                      <TD align="right">
                        {produit.stock === null ? (
                          <span className="text-xs text-surface-400">À la demande</span>
                        ) : (
                          <span className={alerte ? "font-semibold text-danger-700" : undefined}>
                            {formatNumber(produit.stock)}
                          </span>
                        )}
                      </TD>
                      <TD align="right">
                        {produit.commissionRate === null
                          ? <span className="text-xs text-surface-400">Règle globale</span>
                          : formatPercent(produit.commissionRate)}
                      </TD>
                      <TD align="right">{formatNumber(produit.ventes)}</TD>
                      <TD>
                        <ProductStatusBadge status={produit.status} />
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
              basePath="/documents"
              searchParams={{
                recherche: searchParams.recherche,
                categorie: searchParams.categorie,
                statut: searchParams.statut,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
