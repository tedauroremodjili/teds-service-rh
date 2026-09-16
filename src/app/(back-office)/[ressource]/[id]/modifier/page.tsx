import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import {
  buildFormContext,
  getResource,
} from "@/modules/resources/application/resource-use-cases";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { rowTitle } from "@/modules/resources/presentation/format-value";
import { ResourceForm } from "@/modules/resources/presentation/resource-form";
import { Card, CardBody } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ ressource: string; id: string }>;
}): Promise<Metadata> {
  const { ressource } = await props.params;
  const definition = findResource(ressource);
  return { title: definition ? `Modifier — ${definition.singular}` : "Modifier" };
}

/** Modification generique. */
export default async function ModifierRessourcePage(props: {
  params: Promise<{ ressource: string; id: string }>;
}) {
  const { ressource, id } = await props.params;
  const definition = findResource(ressource);

  if (!definition) {
    notFound();
  }

  await requirePermission(definition.permissions.update);

  const [result, context] = await Promise.all([
    getResource(prismaResourceRepository, definition, id),
    buildFormContext(prismaResourceRepository, definition, "modification"),
  ]);

  if (!result.ok) {
    notFound();
  }

  const row = result.value;
  const titre = rowTitle(definition.titleFields, row, definition.singular);

  return (
    <>
      <PageHeader
        title={`Modifier — ${titre}`}
        description={definition.description}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: definition.plural, href: `/${definition.key}` },
          { label: titre, href: `/${definition.key}/${row.id}` },
          { label: "Modifier" },
        ]}
      />

      <Card>
        <CardBody>
          <ResourceForm
            definition={definition}
            id={row.id}
            row={row}
            options={context.options}
            defaults={context.defaults}
          />
        </CardBody>
      </Card>
    </>
  );
}
