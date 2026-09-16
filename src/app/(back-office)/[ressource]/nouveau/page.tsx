import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { buildFormContext } from "@/modules/resources/application/resource-use-cases";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { ResourceForm } from "@/modules/resources/presentation/resource-form";
import { Card, CardBody } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ ressource: string }>;
}): Promise<Metadata> {
  const { ressource } = await props.params;
  const definition = findResource(ressource);
  return { title: definition ? `Nouveau — ${definition.singular}` : "Nouveau" };
}

/** Creation generique. La permission exigee est celle declaree par la ressource. */
export default async function NouvelleRessourcePage(props: {
  params: Promise<{ ressource: string }>;
}) {
  const { ressource } = await props.params;
  const definition = findResource(ressource);

  if (!definition) {
    notFound();
  }

  await requirePermission(definition.permissions.create);

  const context = await buildFormContext(prismaResourceRepository, definition, "creation");

  return (
    <>
      <PageHeader
        title={`Nouveau — ${definition.singular.toLowerCase()}`}
        description={definition.description}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: definition.plural, href: `/${definition.key}` },
          { label: "Nouveau" },
        ]}
      />

      <Card>
        <CardBody>
          <ResourceForm
            definition={definition}
            options={context.options}
            defaults={context.defaults}
          />
        </CardBody>
      </Card>
    </>
  );
}
