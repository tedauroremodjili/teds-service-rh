import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, Calculator, UserCog, Users, Wallet } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { getActiveEmployeeOptions } from "@/modules/employees/infrastructure/reference-queries";
import { getRecapitulatifMensuel } from "@/modules/remuneration/application/remuneration-use-cases";
import { listerCibles } from "@/modules/remuneration/infrastructure/prisma-remuneration-repository";
import { CommissionQuickAccess } from "@/modules/remuneration/presentation/commission-quick-access";
import { parseMois } from "@/shared/domain/periode";
import { formatMoney, formatNumber, formatPeriod } from "@/shared/lib/format";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { ListFilters } from "@/shared/ui/list-filters";
import { PageHeader } from "@/shared/ui/page-header";
import { RowActions } from "@/shared/ui/row-actions";
import { StatCard } from "@/shared/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

export const metadata: Metadata = {
  title: "Rémunérations",
};

/**
 * Récapitulatif de ce qui sera versé ce mois-ci (modules 5 et 6).
 *
 * C'est l'écran de la personne qui prépare la paie : pour chaque employé, le
 * socle fixe, ce que son activité a rapporté, et le total. Le détail ligne à
 * ligne se lit sur la fiche de chacun.
 */
export default async function RemunerationsPage(props: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PAYROLL_READ);
  const { mois: moisDemande } = await props.searchParams;

  const mois = parseMois(moisDemande);
  const peutConfigurer = can(user, PERMISSIONS.PAYROLL_CALCULATE);

  const [lignes, employees, cibles] = await Promise.all([
    getRecapitulatifMensuel(mois.debut, mois.fin),
    peutConfigurer ? getActiveEmployeeOptions() : Promise.resolve([]),
    peutConfigurer ? listerCibles() : Promise.resolve(null),
  ]);

  const totalBase = lignes.reduce((somme, ligne) => somme + ligne.salaireDeBase, 0);
  const totalActivite = lignes.reduce((somme, ligne) => somme + ligne.remuneration, 0);
  const totalGeneral = totalBase + totalActivite;
  const concernes = lignes.filter((ligne) => ligne.remuneration > 0).length;

  return (
    <>
      <PageHeader
        title="Rémunérations du mois"
        description={`Ce qui sera versé pour ${formatPeriod(mois.annee, mois.mois)}.`}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Rémunérations" },
        ]}
      />

      <Card className="mb-6">
        <ListFilters
          basePath="/remunerations"
          fields={[{ name: "mois", label: "Période", type: "month" }]}
        />
        <CardBody>
          <p className="text-sm text-surface-500">
            La rémunération d&apos;activité est calculée à partir des encaissements confirmés de
            la période et du barème propre à chaque employé. Elle n&apos;est figée qu&apos;à la
            validation de la paie.
          </p>
        </CardBody>
      </Card>

      {peutConfigurer && cibles ? (
        <Card className="mb-6">
          <CardHeader
            title="Attribuer une commission"
            description="Choisissez un employé et, si besoin, une formation : vous arrivez directement sur son barème, prêt à compléter."
            icon={<UserCog className="size-4.5" />}
          />
          <CardBody>
            <CommissionQuickAccess employees={employees} cibles={cibles} />
          </CardBody>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Masse salariale fixe"
          value={formatMoney(totalBase)}
          hint={`${formatNumber(lignes.length)} employés`}
          icon={<Banknote />}
          tone="primary"
        />
        <StatCard
          label="Rémunération d'activité"
          value={formatMoney(totalActivite)}
          hint={`${formatNumber(concernes)} employé${concernes > 1 ? "s" : ""} concerné${concernes > 1 ? "s" : ""}`}
          icon={<Calculator />}
          tone="accent"
        />
        <StatCard
          label="Total à verser"
          value={formatMoney(totalGeneral)}
          hint="Base + activité"
          icon={<Wallet />}
          tone="success"
        />
        <StatCard
          label="Part variable"
          value={
            totalGeneral > 0
              ? `${Math.round((totalActivite / totalGeneral) * 100)} %`
              : "—"
          }
          hint="Dans le total versé"
          icon={<Users />}
          tone="info"
        />
      </div>

      <Card>
        {lignes.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Aucun employé actif"
            description="Créez des fiches employés pour préparer une paie."
          />
        ) : (
          <Table>
            <THead>
              <TH>Employé</TH>
              <TH>Poste</TH>
              <TH align="right">Salaire de base</TH>
              <TH align="right">Activité</TH>
              <TH align="right">Opérations</TH>
              <TH align="right">Total à verser</TH>
              <TH align="right" className="no-print">
                Actions
              </TH>
            </THead>
            <TBody>
              {lignes.map((ligne) => (
                <TR key={ligne.employeeId}>
                  <TD>
                    <Link
                      href={`/employes/${ligne.employeeId}`}
                      className="font-medium text-surface-800 hover:text-primary-700"
                    >
                      {ligne.nom}
                    </Link>
                    <span className="block font-mono text-[0.7rem] text-surface-400">
                      {ligne.matricule}
                    </span>
                  </TD>
                  <TD className="text-sm">{ligne.poste ?? "—"}</TD>
                  <TD align="right">{formatMoney(ligne.salaireDeBase)}</TD>
                  <TD
                    align="right"
                    className={ligne.remuneration > 0 ? "font-medium text-accent-700" : undefined}
                  >
                    {ligne.remuneration > 0 ? formatMoney(ligne.remuneration) : "—"}
                  </TD>
                  <TD align="right" className="text-xs text-surface-500">
                    {ligne.operations > 0 ? formatNumber(ligne.operations) : "—"}
                  </TD>
                  <TD align="right" className="font-semibold text-primary-900">
                    {formatMoney(ligne.salaireTotal)}
                  </TD>
                  <TD align="right" className="no-print">
                    <RowActions
                      actions={[
                        {
                          href: `/employes/${ligne.employeeId}/remuneration?mois=${mois.champ}`,
                          label: "Voir le décompte détaillé",
                          icon: "voir",
                        },
                      ]}
                    />
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
