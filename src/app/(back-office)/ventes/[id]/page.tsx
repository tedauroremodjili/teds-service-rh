import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Printer, ShoppingCart } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { can } from "@/modules/auth/domain/session";
import { hasDedicatedDocument, printableFor } from "@/modules/printing/domain/printable";
import { getSaleInvoice } from "@/modules/printing/infrastructure/print-queries";
import { getResource } from "@/modules/resources/application/resource-use-cases";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { displayValue, rowTitle } from "@/modules/resources/presentation/format-value";
import { RemoveResourceButton } from "@/modules/resources/presentation/remove-resource-button";
import { formatMoney } from "@/shared/lib/format";
import { LinkButton } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

const DEFINITION = findResource("ventes")!;

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getResource(prismaResourceRepository, DEFINITION, id);
  return { title: result.ok ? rowTitle(DEFINITION.titleFields, result.value, "Vente") : "Vente" };
}

/**
 * Fiche de vente, dediee : la fiche generique n'affiche que des champs plats
 * et ne sait pas montrer les lignes (documents + quantites) d'une vente.
 * Tout le reste (en-tete, actions, archivage) reste identique a la fiche
 * generique — seule la liste des lignes est propre a cet ecran.
 */
export default async function FicheVentePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const user = await requirePermission(DEFINITION.permissions.read);

  const [result, facture] = await Promise.all([
    getResource(prismaResourceRepository, DEFINITION, id),
    getSaleInvoice(id),
  ]);

  if (!result.ok || !facture) {
    notFound();
  }

  const row = result.value;
  const titre = rowTitle(DEFINITION.titleFields, row, "Vente");

  const peutModifier = can(user, DEFINITION.permissions.update);
  const peutSupprimer = DEFINITION.deletable && can(user, DEFINITION.permissions.remove);

  return (
    <>
      <PageHeader
        title={titre}
        description={DEFINITION.singular}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: DEFINITION.plural, href: `/${DEFINITION.key}` },
          { label: titre },
        ]}
        actions={
          <>
            <LinkButton href={`/${DEFINITION.key}/${row.id}/impression`} variant="outline">
              <Printer className="size-4" />
              {hasDedicatedDocument(DEFINITION.key)
                ? printableFor(DEFINITION.key, DEFINITION.singular).title
                : "Imprimer"}
            </LinkButton>
            {peutModifier ? (
              <LinkButton href={`/${DEFINITION.key}/${row.id}/modifier`} variant="outline">
                <Pencil className="size-4" />
                Modifier
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader title="Détail" description={DEFINITION.description} />
        <CardBody>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {DEFINITION.fields.map((field) => (
              <div key={field.name} className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-surface-500">
                  {field.label}
                </dt>
                <dd className="mt-0.5 break-words text-sm text-surface-800">
                  {displayValue(field, row)}
                </dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <Card className="mt-5">
        <CardHeader title="Documents vendus" icon={<ShoppingCart className="size-4.5" />} />
        <Table>
          <THead>
            <TH>Document</TH>
            <TH align="right">Quantité</TH>
            <TH align="right">Prix unitaire</TH>
            <TH align="right">Total</TH>
          </THead>
          <TBody>
            {facture.lines.map((ligne, index) => (
              <TR key={`${ligne.designation}-${index}`}>
                <TD>
                  <span className="font-medium text-surface-800">{ligne.designation}</span>
                  {ligne.details ? (
                    <span className="ml-2 font-mono text-[0.7rem] text-surface-400">
                      {ligne.details}
                    </span>
                  ) : null}
                </TD>
                <TD align="right">{ligne.quantity}</TD>
                <TD align="right">{formatMoney(ligne.unitPrice)}</TD>
                <TD align="right" className="font-medium">
                  {formatMoney(ligne.total)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      {peutSupprimer ? (
        <Card className="mt-5 border-danger-500/30">
          <CardHeader
            title={DEFINITION.softDelete ? "Archiver" : "Supprimer"}
            description={
              DEFINITION.softDelete
                ? "La fiche sort des listes mais reste consultable dans l'historique."
                : "La suppression est définitive."
            }
          />
          <CardBody>
            <RemoveResourceButton
              resourceKey={DEFINITION.key}
              id={row.id}
              label={titre}
              softDelete={DEFINITION.softDelete}
            />
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
