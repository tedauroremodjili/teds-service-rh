import type { Metadata } from "next";
import { AlertTriangle, Boxes, PackageX, Wallet } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  INVENTORY_CATEGORIES,
  niveauStock,
  type InventoryCategory,
} from "@/modules/inventory/domain/inventory";
import {
  getInventoryStats,
  listInventoryItems,
  listRecentMovements,
} from "@/modules/inventory/infrastructure/inventory-queries";
import {
  INVENTORY_CATEGORY_LABELS,
  STOCK_MOVEMENT_TYPE_LABELS,
  StockLevelBadge,
} from "@/modules/inventory/presentation/inventory-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatMoney, formatNumber } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Stock",
};

/**
 * Etat du stock et derniers mouvements (module 13).
 * Le filtre « en alerte » est la vue de travail du gestionnaire : c'est la
 * liste de ce qu'il faut commander.
 */
export default async function StockPage(props: {
  searchParams: Promise<{
    recherche?: string;
    categorie?: string;
    alerte?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const categorie = INVENTORY_CATEGORIES.includes(searchParams.categorie as InventoryCategory)
    ? (searchParams.categorie as InventoryCategory)
    : undefined;
  const alerteSeulement = searchParams.alerte === "oui";

  const [page, stats, mouvements] = await Promise.all([
    listInventoryItems(
      {
        search: searchParams.recherche?.trim() || undefined,
        category: categorie,
        alerteSeulement,
      },
      pagination,
    ),
    getInventoryStats(),
    listRecentMovements(),
  ]);

  return (
    <>
      <PageHeader
        title="Stock — synthèse"
        description="Fournitures, supports et matériel : quantités et valeur."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Stock", href: "/stock" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Articles suivis"
          value={formatNumber(stats.articles)}
          hint="Références en stock"
          icon={<Boxes />}
          tone="primary"
        />
        <StatCard
          label="En rupture"
          value={formatNumber(stats.ruptures)}
          hint="Quantité épuisée"
          icon={<PackageX />}
          tone={stats.ruptures > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Sous le seuil"
          value={formatNumber(stats.alertes)}
          hint="À réapprovisionner"
          icon={<AlertTriangle />}
          tone={stats.alertes > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Valeur du stock"
          value={formatMoney(stats.valeurTotale)}
          hint="Au coût unitaire"
          icon={<Wallet />}
          tone="accent"
        />
      </div>

      <Card className="mb-6">
        <ListFilters
          basePath="/stock"
          searchPlaceholder="Code, nom ou emplacement"
          selects={[
            {
              name: "categorie",
              label: "Catégorie",
              placeholder: "Toutes les catégories",
              options: INVENTORY_CATEGORIES.map((category) => ({
                value: category,
                label: INVENTORY_CATEGORY_LABELS[category],
              })),
            },
            {
              name: "alerte",
              label: "Niveau",
              placeholder: "Tous les niveaux",
              options: [{ value: "oui", label: "Sous le seuil d'alerte" }],
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Boxes />}
            title="Aucun article"
            description={
              searchParams.recherche || categorie || alerteSeulement
                ? "Aucun résultat ne correspond à ces critères."
                : "Les fournitures et supports suivis en stock apparaîtront ici."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Code</TH>
                <TH>Article</TH>
                <TH>Catégorie</TH>
                <TH>Emplacement</TH>
                <TH align="right">Quantité</TH>
                <TH align="right">Seuil</TH>
                <TH align="right">Valeur</TH>
                <TH>Niveau</TH>
              </THead>
              <TBody>
                {page.items.map((article) => (
                  <TR key={article.id}>
                    <TD className="font-mono text-xs text-surface-500">{article.code}</TD>
                    <TD>
                      <span className="block truncate font-medium text-surface-800">
                        {article.name}
                      </span>
                      {article.dernierMouvement ? (
                        <span className="block text-xs text-surface-400">
                          Dernier mouvement : {formatDateShort(article.dernierMouvement)}
                        </span>
                      ) : null}
                    </TD>
                    <TD>
                      <Badge tone="neutral">
                        {INVENTORY_CATEGORY_LABELS[article.category]}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-surface-500">{article.location ?? "—"}</TD>
                    <TD align="right" className="font-semibold">
                      {formatNumber(article.quantity)}{" "}
                      <span className="text-xs font-normal text-surface-400">{article.unit}</span>
                    </TD>
                    <TD align="right" className="text-xs text-surface-500">
                      {formatNumber(article.alertQuantity)}
                    </TD>
                    <TD align="right">{formatMoney(article.valeur)}</TD>
                    <TD>
                      <StockLevelBadge
                        niveau={niveauStock(article.quantity, article.alertQuantity)}
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
              basePath="/stock"
              searchParams={{
                recherche: searchParams.recherche,
                categorie: searchParams.categorie,
                alerte: searchParams.alerte,
              }}
            />
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Derniers mouvements"
          description="Entrées, sorties et corrections d'inventaire"
          icon={<Boxes className="size-4.5" />}
        />
        {mouvements.length === 0 ? (
          <EmptyState
            icon={<Boxes />}
            title="Aucun mouvement enregistré"
            description="Les entrées et sorties de stock seront tracées ici."
          />
        ) : (
          <Table>
            <THead>
              <TH>Date</TH>
              <TH>Article</TH>
              <TH>Type</TH>
              <TH align="right">Quantité</TH>
              <TH align="right">Stock après</TH>
              <TH>Motif</TH>
            </THead>
            <TBody>
              {mouvements.map((mouvement) => (
                <TR key={mouvement.id}>
                  <TD className="whitespace-nowrap text-xs">
                    {formatDateShort(mouvement.occurredAt)}
                  </TD>
                  <TD>
                    <span className="block truncate font-medium text-surface-800">
                      {mouvement.itemName}
                    </span>
                    <span className="block font-mono text-xs text-surface-400">
                      {mouvement.itemCode}
                    </span>
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        mouvement.type === "ENTREE"
                          ? "success"
                          : mouvement.type === "PERTE"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {STOCK_MOVEMENT_TYPE_LABELS[mouvement.type]}
                    </Badge>
                  </TD>
                  <TD align="right">{formatNumber(mouvement.quantity)}</TD>
                  <TD align="right">{formatNumber(mouvement.quantityAfter)}</TD>
                  <TD className="text-xs text-surface-500">{mouvement.label ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
