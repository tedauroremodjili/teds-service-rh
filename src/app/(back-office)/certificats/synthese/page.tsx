import type { Metadata } from "next";
import Link from "next/link";
import { Award, BadgeCheck, Clock, ScrollText } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import {
  getCertificateStats,
  getTrainingOptions,
  listCertificates,
} from "@/modules/trainings/infrastructure/training-queries";
import { parsePagination } from "@/shared/domain/pagination";
import { formatDateShort, formatNumber } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Certificats",
};

/**
 * Certificats delivres (module 9).
 *
 * Le code de verification est affiche : c'est lui qui permettra a un employeur
 * de controler l'authenticite d'un certificat depuis l'exterieur (chapitre 8).
 */
export default async function CertificatsPage(props: {
  searchParams: Promise<{
    recherche?: string;
    formation?: string;
    page?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.TRAININGS_READ);
  const searchParams = await props.searchParams;

  const pagination = parsePagination(searchParams.page);

  const [page, stats, formations] = await Promise.all([
    listCertificates(
      {
        search: searchParams.recherche?.trim() || undefined,
        trainingId: searchParams.formation || undefined,
      },
      pagination,
    ),
    getCertificateStats(),
    getTrainingOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Certificats — synthèse"
        description="Certificats délivrés aux apprenants et codes de vérification."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Certificats", href: "/certificats" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Certificats délivrés"
          value={formatNumber(stats.total)}
          hint="Depuis l'ouverture"
          icon={<BadgeCheck />}
          tone="primary"
        />
        <StatCard
          label="Ce mois-ci"
          value={formatNumber(stats.duMois)}
          hint="Délivrés depuis le 1er du mois"
          icon={<Award />}
          tone="success"
        />
        <StatCard
          label="Formations concernées"
          value={formatNumber(stats.formationsCertifiantes)}
          hint="Sessions ayant produit un certificat"
          icon={<ScrollText />}
          tone="info"
        />
        <StatCard
          label="À délivrer"
          value={formatNumber(stats.enAttente)}
          hint="Formations terminées sans certificat"
          icon={<Clock />}
          tone={stats.enAttente > 0 ? "danger" : "success"}
        />
      </div>

      <Card>
        <ListFilters
          basePath="/certificats"
          searchPlaceholder="Référence, code, apprenant ou formation"
          selects={[
            {
              name: "formation",
              label: "Formation",
              placeholder: "Toutes les formations",
              options: formations,
            },
          ]}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck />}
            title="Aucun certificat délivré"
            description={
              searchParams.recherche || searchParams.formation
                ? "Aucun résultat ne correspond à ces critères."
                : "Les certificats sont délivrés à l'issue des formations terminées."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Référence</TH>
                <TH>Apprenant</TH>
                <TH>Formation</TH>
                <TH align="right">Note finale</TH>
                <TH>Mention</TH>
                <TH>Délivré le</TH>
                <TH>Code de vérification</TH>
              </THead>
              <TBody>
                {page.items.map((certificat) => (
                  <TR key={certificat.id}>
                    <TD className="font-mono text-xs text-surface-500">{certificat.reference}</TD>
                    <TD>
                      <Link
                        href={`/apprenants?recherche=${encodeURIComponent(certificat.studentMatricule)}`}
                        className="group block min-w-0"
                      >
                        <span className="block truncate font-medium text-surface-800 group-hover:text-primary-700">
                          {certificat.studentName}
                        </span>
                        <span className="block truncate font-mono text-xs text-surface-400">
                          {certificat.studentMatricule}
                        </span>
                      </Link>
                    </TD>
                    <TD className="max-w-64">
                      <span className="block truncate">{certificat.trainingTitle}</span>
                    </TD>
                    <TD align="right">
                      {certificat.finalGrade === null
                        ? "—"
                        : `${certificat.finalGrade.toLocaleString("fr-FR")} / 20`}
                    </TD>
                    <TD>
                      {certificat.mention ? (
                        <Badge tone="accent">{certificat.mention}</Badge>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateShort(certificat.issuedAt)}
                    </TD>
                    <TD className="font-mono text-xs text-surface-500">
                      {certificat.verificationCode}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath="/certificats"
              searchParams={{
                recherche: searchParams.recherche,
                formation: searchParams.formation,
              }}
            />
          </>
        )}
      </Card>
    </>
  );
}
