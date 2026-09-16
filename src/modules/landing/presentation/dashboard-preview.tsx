import {
  Banknote,
  FileText,
  GraduationCap,
  PieChart,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { DonutChart, TrendChart } from "@/shared/ui/charts";
import { Container, Section } from "@/shared/ui/section";
import { StatCard } from "@/shared/ui/stat-card";

import { APERCU } from "../domain/content";

/**
 * Aperçu du tableau de bord.
 *
 * Ce bloc n'est pas une image : il utilise les composants EXACTS de
 * l'application — `StatCard`, `TrendChart`, `DonutChart` — avec des chiffres
 * fictifs. Trois consequences :
 *
 *  1. le visiteur voit litteralement le produit, pas une interpretation ;
 *  2. rien ne se perime : faire evoluer le tableau de bord met a jour cet
 *     apercu du meme geste ;
 *  3. le rendu reste net a toute resolution et lisible par un lecteur d'ecran,
 *     ce qu'une capture d'ecran ne permet pas.
 *
 * Les donnees sont declarees dans le domaine de la vitrine : cette page est
 * PUBLIQUE et ne doit jamais interroger la base.
 */
export function DashboardPreview() {
  const resultat = APERCU.recettes - APERCU.depenses;

  return (
    <Section fond="gris" className="py-14 sm:py-20">
      <Container>
        <div className="reveal rounded-2xl border border-surface-200 bg-white p-3 shadow-card transition-shadow duration-300 hover:shadow-card-hover sm:p-6 lg:p-8">
          {/* --- Indicateurs ---------------------------------------------- */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Effectif actif"
              value={formatNumber(APERCU.effectif)}
              hint="sur 27 fiches"
              icon={<Users />}
              tone="primary"
            />
            <StatCard
              label="Recettes du mois"
              value={formatMoney(APERCU.recettes)}
              hint="vs mois précédent"
              icon={<TrendingUp />}
              tone="success"
              trend={14.2}
              sparkline={APERCU.serie.map((point) => point.recettes)}
            />
            <StatCard
              label="Bénéfice du mois"
              value={formatMoney(resultat)}
              hint={`${formatMoney(APERCU.depenses)} de dépenses`}
              icon={<Wallet />}
              tone="success"
              sparkline={APERCU.serie.map((point) => point.recettes - point.depenses)}
            />
            <StatCard
              label="Apprenants actifs"
              value={formatNumber(APERCU.apprenants)}
              hint="12 formations en cours"
              icon={<GraduationCap />}
              tone="accent"
            />
          </div>

          {/* --- Évolution ------------------------------------------------- */}
          <Card className="mt-6">
            <CardHeader
              title="Recettes et dépenses"
              description="Douze derniers mois — survolez pour lire le détail d'un mois"
              icon={<TrendingUp className="size-4.5" />}
            />
            <CardBody>
              <TrendChart
                points={APERCU.serie.map((point) => ({
                  label: point.mois,
                  labelLong: point.mois,
                  values: [point.recettes, point.depenses],
                }))}
                series={["Recettes", "Dépenses"]}
                format="montant"
              />
            </CardBody>
          </Card>

          {/* --- Répartitions ---------------------------------------------- */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Origine des recettes"
                description="Encaissements du mois en cours"
                icon={<PieChart className="size-4.5" />}
              />
              <CardBody>
                <DonutChart
                  data={APERCU.origines.map((ligne) => ({ ...ligne }))}
                  formatValue={formatMoney}
                  titreCentre="encaissé ce mois"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Répartition des effectifs"
                description="Employés actifs par département"
                icon={<Users className="size-4.5" />}
              />
              <CardBody>
                <DonutChart
                  data={APERCU.effectifs.map((ligne) => ({ ...ligne }))}
                  formatValue={(valeur) => formatNumber(valeur)}
                  titreCentre="employés actifs"
                />
              </CardBody>
            </Card>
          </div>

          {/* --- Compléments ------------------------------------------------ */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Ventes du mois"
              value={formatNumber(APERCU.ventes)}
              hint="Documents et prestations"
              icon={<ShoppingCart />}
              tone="primary"
            />
            <StatCard
              label="Documents vendus"
              value={formatNumber(APERCU.documentsVendus)}
              hint="Sur les douze derniers mois"
              icon={<FileText />}
              tone="accent"
            />
            <StatCard
              label="Salaires du mois"
              value={formatMoney(APERCU.salaires)}
              hint="Base et rémunérations d'activité"
              icon={<Banknote />}
              tone="info"
            />
            <StatCard
              label="Dépenses du mois"
              value={formatMoney(APERCU.depenses)}
              hint="Toutes catégories"
              icon={<TrendingDown />}
              tone="danger"
            />
          </div>
        </div>
      </Container>
    </Section>
  );
}
