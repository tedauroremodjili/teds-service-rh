import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GraduationCap, PlayCircle, Wallet } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  TRAINING_LEVELS,
  TRAINING_STATUSES,
  placesRestantes,
  tauxRemplissage,
  type TrainingLevel,
  type TrainingStatus,
} from "@/modules/trainings/domain/training";
import {
  getTrainingStats,
  listTrainings,
} from "@/modules/trainings/infrastructure/training-queries";
import {
  TRAINING_LEVEL_LABELS,
  TRAINING_STATUS_LABELS,
  TrainingStatusBadge,
} from "@/modules/trainings/presentation/training-badges";
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
  title: "Formations",
};

/**
 * Sessions de formation (module 8).
 * Le remplissage est l'information decisive : une session ouverte mais vide
 * n'a pas le meme traitement qu'une session complete.
 */
export default async function FormationsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    niveau?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.TRAININGS_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);
  const statut = TRAINING_STATUSES.includes(searchParams.statut as TrainingStatus)
    ? (searchParams.statut as TrainingStatus)
    : undefined;
  const niveau = TRAINING_LEVELS.includes(searchParams.niveau as TrainingLevel)
    ? (searchParams.niveau as TrainingLevel)
    : undefined;

  const [page, stats] = await Promise.all([
    listTrainings(
      { search: searchParams.recherche?.trim() || undefined, status: statut, level: niveau },
      pagination,
    ),
    getTrainingStats(),
  ]);

  return (
    <>
      <PageHeader
        title="Formations — synthèse"
        description="Sessions de formation, formateurs et remplissage."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Formations", href: "/formations" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sessions en cours"
          value={formatNumber(stats.enCours)}
          hint={`${formatNumber(stats.sessions)} sessions au catalogue`}
          icon={<PlayCircle />}
          tone="success"
        />
        <StatCard
          label="Inscriptions ouvertes"
          value={formatNumber(stats.ouvertes)}
          hint="Sessions qui acceptent des apprenants"
          icon={<BookOpen />}
          tone="info"
        />
        <StatCard
          label="Apprenants actifs"
          value={formatNumber(stats.inscriptionsActives)}
          hint="Inscriptions en cours"
          icon={<GraduationCap />}
          tone="primary"
        />
        <StatCard
          label="Chiffre d'affaires"
          value={formatMoney(stats.chiffreAffairesInscriptions)}
          hint="Montants négociés, hors annulations"
          icon={<Wallet />}
          tone="accent"
        />
      </div>

      <Card>
        <ListFilters
          basePath="/formations"
          searchPlaceholder="Code, titre ou description"
          selects={[
            {
              name: "statut",
              label: "Statut",
              placeholder: "Tous les statuts",
              options: TRAINING_STATUSES.map((status) => ({
                value: status,
                label: TRAINING_STATUS_LABELS[status],
              })),
            },
            {
              name: "niveau",
              label: "Niveau",
              placeholder: "Tous les niveaux",
              options: TRAINING_LEVELS.map((level) => ({
                value: level,
                label: TRAINING_LEVEL_LABELS[level],
              })),
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title="Aucune formation"
            description={
              searchParams.recherche || statut || niveau
                ? "Aucun résultat ne correspond à ces critères."
                : "Les sessions de formation apparaîtront ici."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Formation</TH>
                <TH>Niveau</TH>
                <TH>Formateur</TH>
                <TH>Période</TH>
                <TH align="right">Durée</TH>
                <TH align="right">Prix</TH>
                <TH>Remplissage</TH>
                <TH>Statut</TH>
              </THead>
              <TBody>
                {page.items.map((formation) => {
                  const restantes = placesRestantes(formation.maxStudents, formation.inscrits);
                  const taux = tauxRemplissage(formation.maxStudents, formation.inscrits);

                  return (
                    <TR key={formation.id}>
                      <TD>
                        <span className="block truncate font-medium text-surface-800">
                          {formation.title}
                        </span>
                        <span className="block truncate font-mono text-xs text-surface-400">
                          {formation.code}
                          {formation.categoryName ? ` — ${formation.categoryName}` : ""}
                        </span>
                      </TD>
                      <TD>
                        <Badge tone="neutral">{TRAINING_LEVEL_LABELS[formation.level]}</Badge>
                      </TD>
                      <TD>
                        {formation.trainerId ? (
                          <Link
                            href={`/employes/${formation.trainerId}`}
                            className="text-sm text-primary-700 hover:underline"
                          >
                            {formation.trainerName}
                          </Link>
                        ) : (
                          <span className="text-xs text-surface-400">Non assigné</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        {formation.startDate ? formatDateShort(formation.startDate) : "—"}
                        {formation.endDate ? ` → ${formatDateShort(formation.endDate)}` : ""}
                      </TD>
                      <TD align="right">{formatNumber(formation.durationHours)} h</TD>
                      <TD align="right" className="font-medium">
                        {formatMoney(formation.price)}
                      </TD>
                      <TD>
                        <span className="block text-sm text-surface-700">
                          {formatNumber(formation.inscrits)}
                          {formation.maxStudents ? ` / ${formatNumber(formation.maxStudents)}` : ""}
                        </span>
                        {taux !== null ? (
                          <span className="mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-surface-100">
                            <span
                              className="block h-full rounded-full bg-brand-gradient"
                              style={{ width: `${taux}%` }}
                            />
                          </span>
                        ) : null}
                        {restantes !== null ? (
                          <span className="text-[0.7rem] text-surface-400">
                            {restantes === 0
                              ? "Complet"
                              : `${formatNumber(restantes)} place${restantes > 1 ? "s" : ""}`}
                          </span>
                        ) : null}
                      </TD>
                      <TD>
                        <TrainingStatusBadge status={formation.status} />
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
              basePath="/formations"
              searchParams={{
                recherche: searchParams.recherche,
                statut: searchParams.statut,
                niveau: searchParams.niveau,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
