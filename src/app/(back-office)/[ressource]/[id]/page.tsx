import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Printer } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { can } from "@/modules/auth/domain/session";
import { hasDedicatedDocument, printableFor } from "@/modules/printing/domain/printable";
import { getResource } from "@/modules/resources/application/resource-use-cases";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { displayValue, rowTitle } from "@/modules/resources/presentation/format-value";
import { RemoveResourceButton } from "@/modules/resources/presentation/remove-resource-button";
import { LinkButton } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ ressource: string; id: string }>;
}): Promise<Metadata> {
  const { ressource, id } = await props.params;
  const definition = findResource(ressource);
  if (!definition) return { title: "Fiche" };

  const result = await getResource(prismaResourceRepository, definition, id);
  return {
    title: result.ok
      ? rowTitle(definition.titleFields, result.value, definition.singular)
      : definition.singular,
  };
}

/**
 * Fiche generique : toutes les valeurs de l'enregistrement, dans l'ordre du
 * catalogue. Les actions n'apparaissent que si l'utilisateur detient la
 * permission correspondante — masquer un bouton reste un confort, le refus
 * ferme est celui de la Server Action.
 */
export default async function FicheRessourcePage(props: {
  params: Promise<{ ressource: string; id: string }>;
}) {
  const { ressource, id } = await props.params;
  const definition = findResource(ressource);

  if (!definition) {
    notFound();
  }

  const user = await requirePermission(definition.permissions.read);

  const result = await getResource(prismaResourceRepository, definition, id);
  if (!result.ok) {
    notFound();
  }

  const row = result.value;
  const titre = rowTitle(definition.titleFields, row, definition.singular);

  const peutModifier = can(user, definition.permissions.update);
  const peutSupprimer = definition.deletable && can(user, definition.permissions.remove);

  return (
    <>
      <PageHeader
        title={titre}
        description={definition.singular}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: definition.plural, href: `/${definition.key}` },
          { label: titre },
        ]}
        actions={
          <>
            {/* Imprimer, c'est lire : le bouton suit la permission de lecture,
                deja exigee pour afficher cette page. Quand la ressource a une
                piece officielle, le bouton la nomme — « Bulletin de paie » dit
                mieux que « Imprimer » ce qui va sortir. */}
            <LinkButton href={`/${definition.key}/${row.id}/impression`} variant="outline">
              <Printer className="size-4" />
              {hasDedicatedDocument(definition.key)
                ? printableFor(definition.key, definition.singular).title
                : "Imprimer"}
            </LinkButton>
            {peutModifier ? (
              <LinkButton href={`/${definition.key}/${row.id}/modifier`} variant="outline">
                <Pencil className="size-4" />
                Modifier
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader title="Détail" description={definition.description} />
        <CardBody>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {definition.fields.map((field) => (
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

      {peutSupprimer ? (
        <Card className="mt-5 border-danger-500/30">
          <CardHeader
            title={definition.softDelete ? "Archiver" : "Supprimer"}
            description={
              definition.softDelete
                ? "La fiche sort des listes mais reste consultable dans l'historique."
                : "La suppression est définitive."
            }
          />
          <CardBody>
            <RemoveResourceButton
              resourceKey={definition.key}
              id={row.id}
              label={titre}
              softDelete={definition.softDelete}
            />
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
