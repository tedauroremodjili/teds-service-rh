import type { Metadata } from "next";
import { Scale, ScrollText, TrendingDown, TrendingUp } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import type { ExpenseCategory, RevenueSource } from "@/modules/accounting/domain/accounting";
import {
  getAccountingStats,
  getComptesOptions,
  getDepensesParCategorie,
  getRecettesParSource,
  listAccountingEntries,
} from "@/modules/accounting/infrastructure/accounting-queries";
import {
  EXPENSE_CATEGORY_LABELS,
  REVENUE_SOURCE_LABELS,
} from "@/modules/accounting/presentation/accounting-labels";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { parsePagination } from "@/shared/domain/pagination";
import { parseMois } from "@/shared/domain/periode";
import { formatDateShort, formatMoney, formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Alert, EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Comptabilité",
};

/** Repartition en barres proportionnelles, reutilisee pour produits et charges. */
function Repartition({
  lignes,
  libelle,
}: {
  lignes: { cle: string; montant: number }[];
  libelle: (cle: string) => string;
}) {
  if (lignes.length === 0) {
    return <p className="text-sm text-surface-500">Aucun mouvement sur la période.</p>;
  }

  const maximum = Math.max(...lignes.map((ligne) => ligne.montant), 1);

  return (
    <ul className="space-y-3">
      {lignes.map((ligne) => (
        <li key={ligne.cle}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-surface-700">{libelle(ligne.cle)}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-primary-900">
              {formatMoney(ligne.montant)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-100">
            <div
              className="h-full rounded-full bg-brand-gradient"
              style={{ width: `${(ligne.montant / maximum) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Journal comptable (module 12).
 *
 * L'equilibre debit/credit est verifie a l'affichage : un journal desequilibre
 * signale une ecriture incomplete, c'est le premier controle du comptable.
 */
export default async function ComptabilitePage(props: {
  searchParams: Promise<{
    mois?: string;
    recherche?: string;
    compte?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.ACCOUNTING_READ);
  const searchParams = await props.searchParams;

  const mois = parseMois(searchParams.mois);
  const pagination = parsePagination(searchParams.page);

  const [page, stats, depenses, recettes, comptes] = await Promise.all([
    listAccountingEntries(
      {
        search: searchParams.recherche?.trim() || undefined,
        accountCode: searchParams.compte || undefined,
        debut: mois.debut,
        fin: mois.fin,
      },
      pagination,
    ),
    getAccountingStats(mois.debut, mois.fin),
    getDepensesParCategorie(mois.debut, mois.fin),
    getRecettesParSource(mois.debut, mois.fin),
    getComptesOptions(),
  ]);

  const resultat = stats.recettes - stats.depenses;
  const ecart = Math.abs(stats.totalDebit - stats.totalCredit);

  return (
    <>
      <PageHeader
        title="Comptabilité — synthèse"
        description="Journal des écritures, produits et charges de la période."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Comptabilité", href: "/comptabilite" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Produits"
          value={formatMoney(stats.recettes)}
          hint="Recettes de la période"
          icon={<TrendingUp />}
          tone="success"
        />
        <StatCard
          label="Charges"
          value={formatMoney(stats.depenses)}
          hint="Dépenses de la période"
          icon={<TrendingDown />}
          tone="danger"
        />
        <StatCard
          label="Résultat"
          value={formatMoney(Math.abs(resultat))}
          hint={resultat >= 0 ? "Bénéfice" : "Perte"}
          icon={<Scale />}
          tone={resultat >= 0 ? "success" : "danger"}
        />
        <StatCard
          label="Écritures"
          value={formatNumber(stats.ecritures)}
          hint={`Débit ${formatMoney(stats.totalDebit)} / Crédit ${formatMoney(stats.totalCredit)}`}
          icon={<ScrollText />}
          tone="primary"
        />
      </div>

      {ecart > 0 ? (
        <Alert tone="warning" title="Journal déséquilibré" className="mb-6">
          Le total des débits et celui des crédits diffèrent de {formatMoney(ecart)} sur la période.
          Une écriture est probablement incomplète.
        </Alert>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Produits par origine"
            description="D'où vient le chiffre d'affaires"
            icon={<TrendingUp className="size-4.5" />}
          />
          <CardBody>
            <Repartition
              lignes={recettes}
              libelle={(cle) => REVENUE_SOURCE_LABELS[cle as RevenueSource] ?? cle}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Charges par catégorie"
            description="Où part la dépense"
            icon={<TrendingDown className="size-4.5" />}
          />
          <CardBody>
            <Repartition
              lignes={depenses}
              libelle={(cle) => EXPENSE_CATEGORY_LABELS[cle as ExpenseCategory] ?? cle}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <ListFilters
          basePath="/comptabilite"
          searchPlaceholder="Libellé, compte ou numéro"
          fields={[{ name: "mois", label: "Mois", type: "month" }]}
          selects={[
            {
              name: "compte",
              label: "Compte",
              placeholder: "Tous les comptes",
              options: comptes,
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<ScrollText />}
            title="Aucune écriture sur la période"
            description="Le journal comptable se remplit automatiquement à partir des ventes, des paiements et des dépenses."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Compte</TH>
                <TH>Libellé</TH>
                <TH>Pièce</TH>
                <TH align="right">Débit</TH>
                <TH align="right">Crédit</TH>
              </THead>
              <TBody>
                {page.items.map((ecriture) => (
                  <TR key={ecriture.id}>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateShort(ecriture.entryDate)}
                    </TD>
                    <TD>
                      <span className="block font-mono text-xs text-surface-500">
                        {ecriture.accountCode}
                      </span>
                      <span className="block truncate text-xs text-surface-400">
                        {ecriture.accountName}
                      </span>
                    </TD>
                    <TD className="font-medium text-surface-800">{ecriture.label}</TD>
                    <TD className="text-xs text-surface-500">{ecriture.sourceType ?? "—"}</TD>
                    <TD align="right">
                      {ecriture.debit > 0 ? formatMoney(ecriture.debit) : "—"}
                    </TD>
                    <TD align="right">
                      {ecriture.credit > 0 ? formatMoney(ecriture.credit) : "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/comptabilite"
              searchParams={{
                mois: mois.champ,
                recherche: searchParams.recherche,
                compte: searchParams.compte,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
