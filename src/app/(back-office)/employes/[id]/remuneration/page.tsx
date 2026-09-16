import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Banknote, Calculator, Scale, Wallet } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { getDecompteEmploye } from "@/modules/remuneration/application/remuneration-use-cases";
import { ACTIVITE_LABELS } from "@/modules/remuneration/domain/rule";
import { listerCibles } from "@/modules/remuneration/infrastructure/prisma-remuneration-repository";
import { RuleForm } from "@/modules/remuneration/presentation/rule-form";
import { RuleList } from "@/modules/remuneration/presentation/rule-list";
import { parseMois } from "@/shared/domain/periode";
import { formatDateShort, formatMoney, formatNumber, formatPeriod } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Rémunération",
};

/**
 * Barème et décompte de rémunération d'un employé (modules 5 et 6).
 *
 * Le décompte est RECALCULÉ à chaque affichage à partir des encaissements du
 * mois. Rien n'est figé tant que la paie n'est pas validée : corriger une règle
 * corrige immédiatement le montant, sans reprise manuelle.
 */
export default async function RemunerationEmployePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mois?: string; formation?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PAYROLL_READ);
  const { id } = await props.params;
  const { mois: moisDemande, formation } = await props.searchParams;

  const mois = parseMois(moisDemande);

  const [resultat, cibles] = await Promise.all([
    getDecompteEmploye(id, mois.debut, mois.fin),
    listerCibles(),
  ]);

  if (!resultat.ok) {
    notFound();
  }

  const decompte = resultat.value;
  const modifiable = can(user, PERMISSIONS.PAYROLL_CALCULATE);

  // Index des noms de cibles, pour que le barème affiche « Anglais enfants »
  // plutôt qu'un identifiant.
  const cibleParId: Record<string, string> = {};
  for (const formation of cibles.formations) cibleParId[formation.id] = formation.title;
  for (const categorie of cibles.categoriesFormation) cibleParId[categorie.id] = categorie.name;
  for (const document of cibles.documents) cibleParId[document.id] = document.name;
  for (const prestation of cibles.prestations) cibleParId[prestation.id] = prestation.name;

  return (
    <>
      <PageHeader
        title={`Rémunération — ${decompte.employe.nom}`}
        description={`${decompte.employe.poste ?? "Poste non défini"} · matricule ${decompte.employe.matricule}`}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Employés", href: "/employes" },
          { label: decompte.employe.nom, href: `/employes/${id}` },
          { label: "Rémunération" },
        ]}
      />

      <Card className="mb-6">
        <ListFilters
          basePath={`/employes/${id}/remuneration`}
          fields={[{ name: "mois", label: "Période", type: "month" }]}
        />
      </Card>

      {/* --- Ce qui sera versé -------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Salaire de base"
          value={formatMoney(decompte.employe.salaireDeBase)}
          hint="Socle mensuel fixe"
          icon={<Banknote />}
          tone="primary"
        />
        <StatCard
          label="Rémunération d'activité"
          value={formatMoney(decompte.total)}
          hint={`${formatNumber(decompte.lignes.length)} opération${decompte.lignes.length > 1 ? "s" : ""} — ${formatPeriod(mois.annee, mois.mois)}`}
          icon={<Calculator />}
          tone="accent"
        />
        <StatCard
          label="Salaire total à verser"
          value={formatMoney(decompte.salaireTotal)}
          hint="Base + activité"
          icon={<Wallet />}
          tone="success"
        />
      </div>

      {/* --- Répartition par activité -------------------------------------- */}
      {decompte.parActivite.length > 0 ? (
        <Card className="mt-6">
          <CardHeader
            title="Répartition par activité"
            description={`Ce qui a généré la rémunération de ${formatPeriod(mois.annee, mois.mois)}`}
          />
          <CardBody>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {decompte.parActivite.map((ligne) => (
                <li
                  key={ligne.activity}
                  className="rounded-lg border border-surface-200 px-4 py-3"
                >
                  <p className="text-xs text-surface-500">{ACTIVITE_LABELS[ligne.activity]}</p>
                  <p className="mt-1 text-lg font-bold text-primary-900">
                    {formatMoney(ligne.montant)}
                  </p>
                  <p className="text-xs text-surface-400">
                    {formatNumber(ligne.operations)} opération
                    {ligne.operations > 1 ? "s" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {/* --- Barème --------------------------------------------------------- */}
      <Card className="mt-6">
        <CardHeader
          title="Barème de rémunération"
          description="Ce que touche cet employé, activité par activité"
          icon={<Scale className="size-4.5" />}
        />
        <RuleList
          employeeId={id}
          regles={decompte.regles}
          cibleParId={cibleParId}
          modifiable={modifiable}
        />

        {modifiable ? (
          <div id="ajouter-regle" className="scroll-mt-20">
            <CardBody className="border-t border-surface-200 bg-surface-50">
              <h3 className="mb-4 text-sm font-semibold text-primary-900">
                Ajouter une règle
              </h3>
              <RuleForm employeeId={id} cibles={cibles} initialCible={formation} />
            </CardBody>
          </div>
        ) : null}
      </Card>

      {/* --- Décompte détaillé ---------------------------------------------- */}
      <Card className="mt-6">
        <CardHeader
          title="Détail du décompte"
          description={`Chaque encaissement de ${formatPeriod(mois.annee, mois.mois)} ayant ouvert droit à rémunération`}
          icon={<Calculator className="size-4.5" />}
        />

        {decompte.lignes.length === 0 ? (
          <EmptyState
            icon={<Calculator />}
            title="Aucune opération sur la période"
            description="Soit aucun encaissement ne correspond au barème, soit le barème est vide."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TH>Date</TH>
                <TH>Opération</TH>
                <TH>Activité</TH>
                <TH>Règle appliquée</TH>
                <TH align="right">Calcul</TH>
                <TH align="right">Montant</TH>
              </THead>
              <TBody>
                {decompte.lignes.map((ligne) => (
                  <TR key={`${ligne.operationId}-${ligne.regleId}`}>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateShort(ligne.date)}
                    </TD>
                    <TD>
                      <span className="block truncate font-medium text-surface-800">
                        {ligne.libelle}
                      </span>
                      <span className="font-mono text-[0.7rem] text-surface-400">
                        {ligne.reference}
                      </span>
                    </TD>
                    <TD className="text-xs">{ACTIVITE_LABELS[ligne.activity]}</TD>
                    <TD className="text-xs text-surface-500">{ligne.regleLabel}</TD>
                    <TD align="right" className="whitespace-nowrap text-xs text-surface-500">
                      {ligne.detail}
                    </TD>
                    <TD align="right" className="font-semibold">
                      {formatMoney(ligne.montant)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="flex items-center justify-between gap-4 border-t border-surface-200 px-5 py-3">
              <span className="text-sm font-medium text-surface-600">
                Total de la rémunération d&apos;activité
              </span>
              <span className="text-lg font-bold text-primary-900">
                {formatMoney(decompte.total)}
              </span>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
