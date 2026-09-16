import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  Briefcase,
  GraduationCap,
  PieChart,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import {
  getRapportCommercial,
  getRapportFinancier,
  getRapportFormation,
  getRapportRh,
  getTopFormations,
  getTopVendeurs,
  type LigneClassement,
} from "@/modules/reports/infrastructure/report-queries";
import {
  getRepartitionDepenses,
  getRepartitionRecettes,
  getSerieMensuelle,
} from "@/modules/dashboard/infrastructure/stats-queries";
import { parseMois } from "@/shared/domain/periode";
import {
  formatMoney,
  formatNumber,
  formatPeriod,
} from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DonutChart, RAMPE_BLEUE, TrendChart } from "@/shared/ui/charts";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";

export const metadata: Metadata = {
  title: "Rapports",
};

/** Classement (meilleurs vendeurs, formations les plus demandees). */
function Classement({
  lignes,
  uniteQuantite,
  vide,
}: {
  lignes: LigneClassement[];
  uniteQuantite: string;
  vide: string;
}) {
  if (lignes.length === 0) {
    return <p className="text-sm text-surface-500">{vide}</p>;
  }

  const maximum = Math.max(...lignes.map((ligne) => ligne.valeur), 1);

  return (
    <ol className="space-y-4">
      {lignes.map((ligne, index) => (
        <li key={ligne.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium text-surface-700">
              <span className="mr-2 text-xs text-surface-400">{index + 1}.</span>
              {ligne.libelle}
              {ligne.detail ? (
                <span className="ml-2 text-xs font-normal text-surface-400">{ligne.detail}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-primary-900">
              {formatMoney(ligne.valeur)}
            </span>
          </div>
          {/*
            Une seule teinte, assombrie selon le rang. Un degrade le long de la
            barre ferait varier la couleur a l'interieur d'une meme valeur, ce
            qui suggere une progression qui n'existe pas.
          */}
          <div className="h-2 overflow-hidden rounded-full bg-surface-100">
            <div
              className="h-full rounded-r-[4px]"
              style={{
                width: `${Math.max((ligne.valeur / maximum) * 100, 1.5)}%`,
                backgroundColor: RAMPE_BLEUE[Math.min(RAMPE_BLEUE.length - 1, 5 - Math.min(index, 4))],
              }}
            />
          </div>
          <p className="mt-1 text-xs text-surface-400">
            {formatNumber(ligne.quantite)} {uniteQuantite}
            {ligne.quantite > 1 ? "s" : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Rapports de pilotage (module 14).
 *
 * Toutes les mesures partagent les memes bornes de periode : c'est ce qui rend
 * les chiffres comparables entre eux. Les sections que l'utilisateur n'a pas le
 * droit de voir ne sont pas rendues — le rapport s'adapte au lecteur.
 */
export default async function RapportsPage(props: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const searchParams = await props.searchParams;

  const mois = parseMois(searchParams.mois);

  const [
    rh,
    commercial,
    financier,
    formation,
    topVendeurs,
    topFormations,
    serie,
    origineRecettes,
    repartitionDepenses,
  ] = await Promise.all([
    getRapportRh(mois.debut, mois.fin),
    getRapportCommercial(mois.debut, mois.fin),
    getRapportFinancier(mois.debut, mois.fin),
    getRapportFormation(mois.debut, mois.fin),
    getTopVendeurs(mois.debut, mois.fin),
    getTopFormations(mois.debut, mois.fin),
    // Les graphiques d'evolution ignorent volontairement le filtre de periode :
    // une tendance se lit sur douze mois, pas sur le mois selectionne.
    getSerieMensuelle(12),
    getRepartitionRecettes(mois.debut, mois.fin),
    getRepartitionDepenses(mois.debut, mois.fin),
  ]);

  const voitRh = can(user, PERMISSIONS.EMPLOYEES_READ);
  const voitFinances = can(user, [PERMISSIONS.CASH_READ, PERMISSIONS.ACCOUNTING_READ]);
  const voitCommercial = can(user, PERMISSIONS.SALES_READ);
  const chiffreAffaires =
    commercial.caDocuments + commercial.caFormations + commercial.caPrestations;

  return (
    <>
      <PageHeader
        title="Rapports"
        description={`Synthèse de l'activité — ${formatPeriod(mois.annee, mois.mois)}.`}
        breadcrumbs={[{ label: "Accueil", href: "/tableau-de-bord" }, { label: "Rapports" }]}
      />

      <Card className="mb-6">
        <ListFilters basePath="/rapports" fields={[{ name: "mois", label: "Période", type: "month" }]} />
        <CardBody>
          <p className="text-sm text-surface-500">
            Toutes les mesures ci-dessous portent sur la période sélectionnée, à l&apos;exception du
            solde de caisse et de l&apos;effectif, qui sont des situations à ce jour.
          </p>
        </CardBody>
      </Card>

      {/* --- Synthese generale ------------------------------------------- */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires"
          value={formatMoney(chiffreAffaires)}
          hint="Documents, formations et prestations"
          icon={<TrendingUp />}
          tone="success"
        />
        {voitFinances ? (
          <>
            <StatCard
              label="Charges"
              value={formatMoney(financier.depenses)}
              hint="Dépenses de la période"
              icon={<TrendingDown />}
              tone="danger"
            />
            <StatCard
              label="Résultat"
              value={formatMoney(Math.abs(financier.resultat))}
              hint={financier.resultat >= 0 ? "Bénéfice" : "Perte"}
              icon={<PieChart />}
              tone={financier.resultat >= 0 ? "success" : "danger"}
            />
            <StatCard
              label="Solde de caisse"
              value={formatMoney(financier.soldeCaisse)}
              hint="Situation à ce jour"
              icon={<Wallet />}
              tone="primary"
              href="/caisse"
            />
          </>
        ) : null}
      </div>

      {/* --- Analyse graphique --------------------------------------------- */}
      {voitFinances ? (
        <>
          <Card className="mb-6">
            <CardHeader
              title="Évolution des recettes et des dépenses"
              description="Douze derniers mois — indépendant du filtre de période"
              icon={<TrendingUp className="size-4.5" />}
            />
            <CardBody>
              <TrendChart
                points={serie.map((point) => ({
                  label: point.court,
                  labelLong: point.long,
                  values: [point.recettes, point.depenses],
                }))}
                series={["Recettes", "Dépenses"]}
                messageVide="Aucun mouvement sur les douze derniers mois"
              />
            </CardBody>
          </Card>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Origine des recettes"
                description={`Encaissements — ${formatPeriod(mois.annee, mois.mois)}`}
                icon={<PieChart className="size-4.5" />}
              />
              <CardBody>
                <DonutChart
                  data={origineRecettes}
                  formatValue={formatMoney}
                  titreCentre="encaissé"
                  messageVide="Aucun encaissement sur la période"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Répartition des dépenses"
                description={`Charges — ${formatPeriod(mois.annee, mois.mois)}`}
                icon={<TrendingDown className="size-4.5" />}
              />
              <CardBody>
                <DonutChart
                  data={repartitionDepenses}
                  formatValue={formatMoney}
                  titreCentre="de charges"
                  messageVide="Aucune dépense sur la période"
                />
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}

      {/* --- Ressources humaines ------------------------------------------ */}
      {voitRh ? (
        <Card className="mb-6">
          <CardHeader
            title="Ressources humaines"
            description="Effectif, mouvements et absences"
            icon={<Users className="size-4.5" />}
            action={
              <Link href="/employes" className="text-sm font-medium text-primary-700 hover:underline">
                Voir les employés
              </Link>
            }
          />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Mesure libelle="Effectif actif" valeur={formatNumber(rh.effectifActif)} />
              <Mesure
                libelle="Embauches de la période"
                valeur={formatNumber(rh.embauchesDeLaPeriode)}
              />
              <Mesure libelle="Départs de la période" valeur={formatNumber(rh.departsDeLaPeriode)} />
              <Mesure libelle="Masse salariale mensuelle" valeur={formatMoney(rh.masseSalariale)} />
              <Mesure
                libelle="Jours de congé accordés"
                valeur={formatNumber(rh.congesApprouves)}
              />
              <Mesure
                libelle="Taux de présence"
                valeur={rh.tauxPresence === null ? "—" : `${rh.tauxPresence} %`}
                precision={rh.tauxPresence === null ? "Aucun pointage sur la période" : undefined}
              />
            </dl>
          </CardBody>
        </Card>
      ) : null}

      {/* --- Activite commerciale ----------------------------------------- */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Activité commerciale"
            description="Chiffre d'affaires par canal"
            icon={<ShoppingCart className="size-4.5" />}
          />
          <CardBody>
            <dl className="space-y-4">
              <Canal
                libelle="Ventes de documents"
                quantite={commercial.ventesDocuments}
                montant={commercial.caDocuments}
                unite="vente"
              />
              <Canal
                libelle="Inscriptions aux formations"
                quantite={commercial.inscriptions}
                montant={commercial.caFormations}
                unite="inscription"
              />
              <Canal
                libelle="Prestations de services"
                quantite={commercial.prestations}
                montant={commercial.caPrestations}
                unite="commande"
              />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Formation"
            description="Sessions, apprenants et résultats"
            icon={<GraduationCap className="size-4.5" />}
          />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Mesure
                libelle="Sessions actives"
                valeur={formatNumber(formation.sessionsEnCours)}
              />
              <Mesure
                libelle="Apprenants en cours"
                valeur={formatNumber(formation.apprenantsActifs)}
              />
              <Mesure
                libelle="Certificats délivrés"
                valeur={formatNumber(formation.certificatsDelivres)}
              />
              <Mesure
                libelle="Moyenne générale"
                valeur={
                  formation.moyenneGenerale === null
                    ? "—"
                    : `${formation.moyenneGenerale.toLocaleString("fr-FR")} / 20`
                }
                precision={formation.moyenneGenerale === null ? "Aucune note saisie" : undefined}
              />
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* --- Classements --------------------------------------------------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {voitCommercial ? (
          <Card>
            <CardHeader
              title="Meilleurs vendeurs"
              description="Ventes de documents sur la période"
              icon={<Trophy className="size-4.5" />}
            />
            <CardBody>
              <Classement
                lignes={topVendeurs}
                uniteQuantite="vente"
                vide="Aucune vente enregistrée sur la période."
              />
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Formations les plus demandées"
            description="Inscriptions sur la période"
            icon={<Award className="size-4.5" />}
          />
          <CardBody>
            <Classement
              lignes={topFormations}
              uniteQuantite="inscription"
              vide="Aucune inscription enregistrée sur la période."
            />
          </CardBody>
        </Card>
      </div>

      {chiffreAffaires === 0 && rh.embauchesDeLaPeriode === 0 ? (
        <EmptyState
          icon={<PieChart />}
          title="Période sans activité"
          description="Aucun mouvement n'a été enregistré sur la période sélectionnée."
        />
      ) : null}
    </>
  );
}

/** Mesure simple d'un rapport : un libelle, une valeur. */
function Mesure({
  libelle,
  valeur,
  precision,
}: {
  libelle: string;
  valeur: string;
  precision?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-surface-500">{libelle}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-primary-900">{valeur}</dd>
      {precision ? <p className="text-xs text-surface-400">{precision}</p> : null}
    </div>
  );
}

/** Ligne « canal de vente » : le volume et le montant vont ensemble. */
function Canal({
  libelle,
  quantite,
  montant,
  unite,
}: {
  libelle: string;
  quantite: number;
  montant: number;
  unite: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-surface-100 pb-3 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
          <Briefcase className="size-4" />
        </span>
        <div className="min-w-0">
          <dt className="truncate text-sm text-surface-700">{libelle}</dt>
          <dd className="text-xs text-surface-400">
            {formatNumber(quantite)} {unite}
            {quantite > 1 ? "s" : ""}
          </dd>
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-primary-900">
        {formatMoney(montant)}
      </span>
    </div>
  );
}
