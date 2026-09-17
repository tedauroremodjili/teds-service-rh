import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/infrastructure/auth/dal";
import { prisma } from "@/infrastructure/database/prisma";
import { getDecompteEmploye } from "@/modules/remuneration/application/remuneration-use-cases";
import { buildFormContext } from "@/modules/resources/application/resource-use-cases";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { ResourceForm } from "@/modules/resources/presentation/resource-form";
import { parseMois } from "@/shared/domain/periode";
import { formatPeriod } from "@/shared/lib/format";
import { Card, CardBody } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";

const DEFINITION = findResource("salaires")!;

export const metadata: Metadata = {
  title: "Nouveau — bulletin de paie",
};

/**
 * Creation d'un bulletin de paie.
 *
 * Route concrete, prend le pas sur le formulaire generique `[ressource]/nouveau`
 * pour cette URL exacte : arrivee depuis la fiche Remuneration d'un employe
 * (`employeeId` + `mois` en parametres), le salaire de base et les commissions
 * sont pre-remplis a partir du decompte deja calcule — la personne qui etablit
 * la paie n'a plus a recopier un chiffre a la main. Sans ces parametres, le
 * formulaire reste identique a l'ancien (saisie manuelle), pour les cas ou la
 * paie n'a rien a voir avec une activite commissionnee.
 */
export default async function NouveauBulletinPage(props: {
  searchParams: Promise<{ employeeId?: string; mois?: string }>;
}) {
  await requirePermission(DEFINITION.permissions.create);

  const { employeeId, mois: moisParam } = await props.searchParams;
  const context = await buildFormContext(prismaResourceRepository, DEFINITION, "creation");

  let precalcule: { nom: string; periode: string; commissions: number } | null = null;
  let dejaExistant: { id: string; reference: string } | null = null;

  if (employeeId) {
    const mois = parseMois(moisParam);

    const existant = await prisma.payroll.findUnique({
      where: {
        employeeId_year_month: { employeeId, year: mois.annee, month: mois.mois },
      },
      select: { id: true, reference: true },
    });

    if (existant) {
      dejaExistant = existant;
    } else {
      const resultat = await getDecompteEmploye(employeeId, mois.debut, mois.fin);
      if (resultat.ok) {
        context.defaults.employeeId = employeeId;
        context.defaults.year = String(mois.annee);
        context.defaults.month = String(mois.mois);
        context.defaults.baseSalary = String(Math.round(resultat.value.employe.salaireDeBase));
        context.defaults.totalCommissions = String(Math.round(resultat.value.total));
        precalcule = {
          nom: resultat.value.employe.nom,
          periode: formatPeriod(mois.annee, mois.mois),
          commissions: resultat.value.total,
        };
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Nouveau — bulletin de paie"
        description={DEFINITION.description}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: DEFINITION.plural, href: `/${DEFINITION.key}` },
          { label: "Nouveau" },
        ]}
      />

      {dejaExistant ? (
        <Alert tone="info" className="mb-5">
          Un bulletin existe déjà pour cette période.{" "}
          <Link href={`/salaires/${dejaExistant.id}`} className="font-medium underline">
            Voir le bulletin {dejaExistant.reference}
          </Link>
          .
        </Alert>
      ) : precalcule ? (
        <Alert tone="info" className="mb-5">
          Salaire de base et commissions pré-remplis pour {precalcule.nom} —{" "}
          {precalcule.periode}, à partir du décompte de rémunération déjà calculé. Vérifiez
          avant d&apos;enregistrer.
        </Alert>
      ) : null}

      {dejaExistant ? null : (
        <Card>
          <CardBody>
            <ResourceForm
              definition={DEFINITION}
              options={context.options}
              defaults={context.defaults}
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
