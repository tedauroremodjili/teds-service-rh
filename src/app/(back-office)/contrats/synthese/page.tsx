import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Banknote, FileSignature, FileStack } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  expireBientot,
  joursAvantEcheance,
  type ContractStatus,
  type ContractType,
} from "@/modules/contracts/domain/contract";
import {
  getContractStats,
  listContracts,
} from "@/modules/contracts/infrastructure/contract-queries";
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_TYPE_LABELS,
  ContractStatusBadge,
} from "@/modules/contracts/presentation/contract-badges";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatMoney, formatNumber } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Contrats",
};

/**
 * Liste des contrats de travail (module 3).
 *
 * Vue de consultation : elle expose l'echeance de chaque contrat, car c'est la
 * seule information qui demande une action — un CDD qui arrive a terme sans
 * renouvellement devient un contrat de fait, avec les consequences juridiques
 * que cela implique.
 */
export default async function ContratsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    type?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.CONTRACTS_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = CONTRACT_STATUSES.includes(searchParams.statut as ContractStatus)
    ? (searchParams.statut as ContractStatus)
    : undefined;
  const type = CONTRACT_TYPES.includes(searchParams.type as ContractType)
    ? (searchParams.type as ContractType)
    : undefined;

  const [page, stats] = await Promise.all([
    listContracts(
      { search: searchParams.recherche?.trim() || undefined, status: statut, type },
      pagination,
    ),
    getContractStats(),
  ]);

  return (
    <>
      <PageHeader
        title="Contrats — synthèse"
        description="Contrats de travail du personnel, échéances et renouvellements."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Contrats", href: "/contrats" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Contrats actifs"
          value={formatNumber(stats.actifs)}
          hint={`${formatNumber(stats.total)} contrats enregistrés`}
          icon={<FileSignature />}
          tone="primary"
        />
        <StatCard
          label="Échéances sous 30 jours"
          value={formatNumber(stats.expirantBientot)}
          hint="À renouveler ou à clôturer"
          icon={<AlertTriangle />}
          tone={stats.expirantBientot > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Brouillons"
          value={formatNumber(stats.brouillons)}
          hint="En attente de signature"
          icon={<FileStack />}
          tone="info"
        />
        <StatCard
          label="Masse contractuelle"
          value={formatMoney(stats.masseSalarialeActive)}
          hint="Salaires des contrats actifs"
          icon={<Banknote />}
          tone="accent"
        />
      </div>

      <Card>
        <ListFilters
          basePath="/contrats"
          searchPlaceholder="Référence, nom ou matricule"
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: CONTRACT_STATUSES.map((status) => ({
                value: status,
                label: CONTRACT_STATUS_LABELS[status],
              })),
            },
            {
              name: "type",
              label: "Type",
              placeholder: "Tous les types",
              options: CONTRACT_TYPES.map((contractType) => ({
                value: contractType,
                label: CONTRACT_TYPE_LABELS[contractType],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<FileSignature />}
            title="Aucun contrat trouvé"
            description={
              searchParams.recherche || statut || type
                ? "Aucun résultat ne correspond à ces critères."
                : "Les contrats de travail apparaîtront ici dès leur enregistrement."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Référence</TH>
                <TH>Employé</TH>
                <TH>Type</TH>
                <TH>Début</TH>
                <TH>Échéance</TH>
                <TH align="right">Salaire</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((contrat) => {
                  const jours = joursAvantEcheance(contrat.endDate);
                  const urgent = expireBientot(contrat.endDate, contrat.status);

                  return (
                    <TR key={contrat.id}>
                      <TD className="font-mono text-xs text-surface-500">{contrat.reference}</TD>
                      <TD>
                        <Link
                          href={`/employes/${contrat.employeeId}`}
                          className="group min-w-0 block"
                        >
                          <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                            {contrat.employeeName}
                          </span>
                          <span className="block truncate font-mono text-xs text-surface-400">
                            {contrat.matricule}
                          </span>
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone="neutral">{CONTRACT_TYPE_LABELS[contrat.type]}</Badge>
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        {formatDateShort(contrat.startDate)}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        {contrat.endDate ? (
                          <span className={urgent ? "font-semibold text-danger-700" : undefined}>
                            {formatDateShort(contrat.endDate)}
                            {urgent && jours !== null ? (
                              <span className="block text-[0.7rem] font-normal">
                                dans {jours} jour{jours > 1 ? "s" : ""}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-surface-400">Durée indéterminée</span>
                        )}
                      </TD>
                      <TD align="right" className="font-medium">
                        {formatMoney(contrat.baseSalary)}
                      </TD>
                      <TD>
                        <ContractStatusBadge status={contrat.status} />
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
              basePath="/contrats"
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
