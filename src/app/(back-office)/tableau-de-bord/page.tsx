import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  GraduationCap,
  Percent,
  PieChart,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { requireAuth } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import {
  getDashboardStats,
  getDernieresEmbauches,
  getRepartitionParDepartement,
} from "@/modules/dashboard/infrastructure/dashboard-queries";
import {
  getRepartitionRecettes,
  getSerieMensuelle,
  getTopCommissions,
} from "@/modules/dashboard/infrastructure/stats-queries";
import {
  formatDateShort,
  formatMoney,
  formatNumber,
} from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { BarChart, DonutChart, TrendChart } from "@/shared/ui/charts";
import { EmptyState } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default async function TableauDeBordPage() {
  const user = await requireAuth();

  const maintenant = new Date();
  const debutDuMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutDuMoisProchain = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
  const debutDeLAnnee = new Date(maintenant.getFullYear(), maintenant.getMonth() - 11, 1);

  const [stats, repartitionEffectifs, embauches, serie, origineRecettes, topCommissions] =
    await Promise.all([
      getDashboardStats(),
      getRepartitionParDepartement(),
      getDernieresEmbauches(),
      getSerieMensuelle(12),
      getRepartitionRecettes(debutDuMois, debutDuMoisProchain),
      getTopCommissions(debutDeLAnnee, debutDuMoisProchain, 5),
    ]);

  const voitRH = can(user, PERMISSIONS.EMPLOYEES_READ);
  const voitFinances = can(user, [PERMISSIONS.CASH_READ, PERMISSIONS.ACCOUNTING_READ]);
  const voitPaie = can(user, PERMISSIONS.PAYROLL_READ);
  const voitCommissions = can(user, PERMISSIONS.COMMISSIONS_READ);

  const resultatDuMois = stats.recettesDuMois - stats.depensesDuMois;

  // Variation par rapport au mois precedent : c'est la lecture attendue d'une
  // tuile de statistique, bien plus que la valeur brute isolee.
  const moisPrecedent = serie[serie.length - 2];
  const variationRecettes = calculerVariation(
    stats.recettesDuMois,
    moisPrecedent?.recettes ?? 0,
  );
  const variationVentes = calculerVariation(stats.ventesDuMois, moisPrecedent?.ventes ?? 0);

  return (
    <>
      <PageHeader
        title={`Bonjour, ${user.displayName.split(" ")[0]}`}
        description="Voici la situation de TED'S SERVICE aujourd'hui."
      />

      {/* --- Indicateurs cles --------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {voitRH ? (
          <StatCard
            label="Effectif actif"
            value={formatNumber(stats.effectifActif)}
            hint={`sur ${formatNumber(stats.effectifTotal)} fiches`}
            icon={<Users />}
            tone="primary"
            href="/employes"
          />
        ) : null}

        {voitFinances ? (
          <StatCard
            label="Recettes du mois"
            value={formatMoney(stats.recettesDuMois)}
            hint="vs mois précédent"
            icon={<TrendingUp />}
            tone="success"
            trend={variationRecettes}
            sparkline={serie.map((point) => point.recettes)}
            href="/recettes"
          />
        ) : null}

        {voitFinances ? (
          <StatCard
            label={resultatDuMois >= 0 ? "Bénéfice du mois" : "Perte du mois"}
            value={formatMoney(Math.abs(resultatDuMois))}
            hint={`${formatMoney(stats.depensesDuMois)} de dépenses`}
            icon={<Wallet />}
            tone={resultatDuMois >= 0 ? "success" : "danger"}
            sparkline={serie.map((point) => point.recettes - point.depenses)}
            href="/comptabilite"
          />
        ) : (
          <StatCard
            label="Ventes du mois"
            value={formatNumber(stats.ventesDuMois)}
            hint="vs mois précédent"
            icon={<ShoppingCart />}
            tone="accent"
            trend={variationVentes}
            sparkline={serie.map((point) => point.ventes)}
            href="/ventes"
          />
        )}

        <StatCard
          label="Apprenants actifs"
          value={formatNumber(stats.apprenantsActifs)}
          hint={`${formatNumber(stats.formationsEnCours)} formation${stats.formationsEnCours > 1 ? "s" : ""} en cours`}
          icon={<GraduationCap />}
          tone="accent"
          href="/apprenants"
        />
      </div>

      {/* --- Evolution sur douze mois -------------------------------------- */}
      {voitFinances ? (
        <Card className="mt-6">
          <CardHeader
            title="Recettes et dépenses"
            description="Douze derniers mois — survolez pour lire le détail d'un mois"
            icon={<TrendingUp className="size-4.5" />}
            action={
              <Link
                href="/rapports"
                className="text-sm font-medium text-primary-700 hover:underline"
              >
                Rapports détaillés
              </Link>
            }
          />
          <CardBody>
            <TrendChart
              points={serie.map((point) => ({
                label: point.court,
                labelLong: point.long,
                values: [point.recettes, point.depenses],
              }))}
              series={["Recettes", "Dépenses"]}
              messageVide="Aucun mouvement enregistré sur les douze derniers mois"
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* --- Origine des recettes (camembert) --------------------------- */}
        {voitFinances ? (
          <Card>
            <CardHeader
              title="Origine des recettes"
              description="Encaissements du mois en cours"
              icon={<PieChart className="size-4.5" />}
            />
            <CardBody>
              <DonutChart
                data={origineRecettes}
                formatValue={formatMoney}
                titreCentre="encaissé ce mois"
                messageVide="Aucun encaissement ce mois-ci"
              />
            </CardBody>
          </Card>
        ) : null}

        {/* --- Repartition des effectifs (camembert) ---------------------- */}
        {voitRH ? (
          <Card>
            <CardHeader
              title="Répartition des effectifs"
              description="Employés actifs par département"
              icon={<Users className="size-4.5" />}
            />
            <CardBody>
              <DonutChart
                data={repartitionEffectifs.map((ligne) => ({
                  label: ligne.departement,
                  value: ligne.effectif,
                }))}
                formatValue={(valeur) => formatNumber(valeur)}
                titreCentre="employés actifs"
                messageVide="Aucun employé actif enregistré"
              />
            </CardBody>
          </Card>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* --- Classement des agents -------------------------------------- */}
        {voitCommissions ? (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Commissions générées"
              description="Par agent, sur les douze derniers mois"
              icon={<Percent className="size-4.5" />}
            />
            <CardBody>
              <BarChart
                data={topCommissions}
                formatValue={formatMoney}
                intituleValeur="Commissions"
                messageVide="Aucune commission générée sur la période"
              />
            </CardBody>
          </Card>
        ) : null}

        {/* --- Points d'attention ----------------------------------------- */}
        <Card className={voitCommissions ? undefined : "lg:col-span-3"}>
          <CardHeader
            title="Points d'attention"
            description="Ce qui demande une action"
            icon={<AlertTriangle className="size-4.5" />}
          />
          <CardBody className="space-y-3">
            <AlerteLigne
              icone={<CalendarDays className="size-4" />}
              libelle="Contrats expirant sous 30 jours"
              valeur={stats.contratsExpirantBientot}
              ton={stats.contratsExpirantBientot > 0 ? "warning" : "success"}
              href="/contrats"
            />
            <AlerteLigne
              icone={<CalendarDays className="size-4" />}
              libelle="Demandes de congé en attente"
              valeur={stats.congesEnAttente}
              ton={stats.congesEnAttente > 0 ? "info" : "success"}
              href="/conges"
            />
            {voitCommissions ? (
              <AlerteLigne
                icone={<Percent className="size-4" />}
                libelle="Commissions à intégrer en paie"
                valeur={stats.commissionsEnAttente}
                ton={stats.commissionsEnAttente > 0 ? "accent" : "success"}
                estMontant
                href="/commissions"
              />
            ) : null}
            {voitPaie ? (
              <AlerteLigne
                icone={<Banknote className="size-4" />}
                libelle="Masse salariale mensuelle"
                valeur={stats.masseSalarialeMensuelle}
                ton="neutral"
                estMontant
                href="/salaires"
              />
            ) : null}
          </CardBody>
        </Card>
      </div>

      {/* --- Dernieres embauches ------------------------------------------- */}
      {voitRH ? (
        <Card className="mt-6">
          <CardHeader
            title="Dernières embauches"
            description="Les arrivées les plus récentes"
            icon={<UserPlus className="size-4.5" />}
            action={
              <Link
                href="/employes"
                className="text-sm font-medium text-primary-700 hover:underline"
              >
                Voir tout
              </Link>
            }
          />
          {embauches.length === 0 ? (
            <EmptyState
              icon={<UserPlus />}
              title="Aucun employé enregistré"
              description="Commencez par créer les fiches de votre personnel."
            />
          ) : (
            <ul className="divide-y divide-surface-100">
              {embauches.map((employe) => (
                <li key={employe.id}>
                  <Link
                    href={`/employes/${employe.id}`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-primary-50/40"
                  >
                    <Avatar
                      firstName={employe.firstName}
                      lastName={employe.lastName}
                      photoUrl={employe.photoUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-surface-800">
                        {employe.firstName} {employe.lastName}
                      </p>
                      <p className="truncate text-xs text-surface-500">
                        {employe.poste ?? "Poste non défini"}
                        {employe.departement ? ` — ${employe.departement}` : ""}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-xs font-medium text-surface-600">
                        {formatDateShort(employe.hireDate)}
                      </p>
                      <p className="font-mono text-[0.7rem] text-surface-400">
                        {employe.matricule}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

/** Variation en pourcentage. Renvoie undefined si la reference est nulle. */
function calculerVariation(actuel: number, precedent: number): number | undefined {
  if (precedent <= 0) return undefined;
  return ((actuel - precedent) / precedent) * 100;
}


/** Ligne du panneau « Points d'attention ». */
function AlerteLigne({
  icone,
  libelle,
  valeur,
  ton,
  estMontant = false,
  href,
}: {
  icone: React.ReactNode;
  libelle: string;
  valeur: number;
  ton: "success" | "warning" | "danger" | "info" | "accent" | "neutral";
  estMontant?: boolean;
  href?: string;
}) {
  const contenu = (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
          {icone}
        </span>
        <span className="truncate text-sm text-surface-600">{libelle}</span>
      </div>
      <Badge tone={ton}>{estMontant ? formatMoney(valeur) : formatNumber(valeur)}</Badge>
    </div>
  );

  return href ? (
    <Link href={href} className="-mx-2 block rounded-lg px-2 py-1 hover:bg-surface-50">
      {contenu}
    </Link>
  ) : (
    contenu
  );
}
