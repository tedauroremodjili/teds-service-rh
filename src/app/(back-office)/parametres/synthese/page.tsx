import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Settings, ShieldCheck, Users } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import {
  SETTING_CATEGORY_DESCRIPTIONS,
  SETTING_CATEGORY_LABELS,
  formatValeurParametre,
} from "@/modules/settings/domain/setting";
import {
  getSettingGroups,
  getStructureStats,
  listDepartements,
} from "@/modules/settings/infrastructure/setting-queries";
import { formatDateShort, formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Alert, EmptyState } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Paramètres",
};

/**
 * Parametres de l'entreprise (module 17).
 *
 * Consultation seule pour l'instant : la modification exige
 * `settings.manage` et passera par des Server Actions journalisees, comme
 * toute ecriture du projet.
 */
export default async function ParametresPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_READ);

  const [groupes, structure, departements] = await Promise.all([
    getSettingGroups(),
    getStructureStats(),
    listDepartements(),
  ]);

  const peutModifier = can(user, PERMISSIONS.SETTINGS_MANAGE);

  return (
    <>
      <PageHeader
        title="Paramètres — synthèse"
        description="Configuration de TED'S SERVICE : identité, finances et règles RH."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Paramètres", href: "/parametres" },
          { label: "Synthèse" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Départements"
          value={formatNumber(structure.departements)}
          hint="Structure de l'entreprise"
          icon={<Building2 />}
          tone="primary"
        />
        <StatCard
          label="Postes définis"
          value={formatNumber(structure.postes)}
          hint="Référentiel des fonctions"
          icon={<Settings />}
          tone="info"
        />
        <StatCard
          label="Rôles"
          value={formatNumber(structure.roles)}
          hint="Profils de droits"
          icon={<ShieldCheck />}
          tone="accent"
        />
        <StatCard
          label="Comptes actifs"
          value={formatNumber(structure.comptesActifs)}
          hint="Utilisateurs pouvant se connecter"
          icon={<Users />}
          tone="success"
          href={can(user, PERMISSIONS.USERS_READ) ? "/utilisateurs" : undefined}
        />
      </div>

      {peutModifier ? (
        <Alert tone="info" className="mb-6">
          La modification des paramètres n&apos;est pas encore disponible depuis cette page. Les
          valeurs ci-dessous proviennent de l&apos;initialisation de la base.
        </Alert>
      ) : null}

      {groupes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Settings />}
            title="Aucun paramètre enregistré"
            description="Initialisez la base pour créer les paramètres de l'entreprise."
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {groupes.map((groupe) => (
            <Card key={groupe.category}>
              <CardHeader
                title={SETTING_CATEGORY_LABELS[groupe.category] ?? groupe.category}
                description={SETTING_CATEGORY_DESCRIPTIONS[groupe.category]}
                icon={<Settings className="size-4.5" />}
              />
              <CardBody className="px-0 py-0">
                <dl className="divide-y divide-surface-100">
                  {groupe.settings.map((parametre) => (
                    <div
                      key={parametre.key}
                      className="flex items-baseline justify-between gap-4 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <dt className="truncate text-sm font-medium text-surface-700">
                          {parametre.label}
                        </dt>
                        <dd className="truncate font-mono text-xs text-surface-400">
                          {parametre.key}
                        </dd>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold text-primary-900">
                          {formatValeurParametre(parametre.value)}
                        </span>
                        <span className="block text-[0.7rem] text-surface-400">
                          {formatDateShort(parametre.updatedAt)}
                        </span>
                      </span>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader
          title="Départements et postes"
          description="Structure utilisée par les fiches employés et la paie"
          icon={<Building2 className="size-4.5" />}
          action={
            <Link href="/employes" className="text-sm font-medium text-primary-700 hover:underline">
              Voir les employés
            </Link>
          }
        />
        {departements.length === 0 ? (
          <EmptyState
            icon={<Building2 />}
            title="Aucun département"
            description="Créez au moins un département pour pouvoir affecter le personnel."
          />
        ) : (
          <Table>
            <THead>
              <TH>Code</TH>
              <TH>Département</TH>
              <TH align="right">Postes</TH>
              <TH align="right">Effectif actif</TH>
            </THead>
            <TBody>
              {departements.map((departement) => (
                <TR key={departement.id}>
                  <TD className="font-mono text-xs text-surface-500">{departement.code}</TD>
                  <TD className="font-medium text-surface-800">{departement.name}</TD>
                  <TD align="right">{formatNumber(departement.postes)}</TD>
                  <TD align="right">
                    <Link
                      href={`/employes?departement=${departement.id}`}
                      className="font-medium text-primary-700 hover:underline"
                    >
                      {formatNumber(departement.effectif)}
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
