import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartColumn, Plus, Printer, Table2 } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { can } from "@/modules/auth/domain/session";
import { listResource } from "@/modules/resources/application/resource-use-cases";
import { findResource } from "@/modules/resources/domain/catalog";
import type { FieldOption } from "@/modules/resources/domain/field";
import { filterFields } from "@/modules/resources/domain/resource";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { ResourceFilters } from "@/modules/resources/presentation/resource-filters";
import { ResourceTable } from "@/modules/resources/presentation/resource-table";
import { parsePagination } from "@/shared/domain/pagination";
import { LinkButton } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Alert, EmptyState } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

type SearchParams = Record<string, string | undefined>;

export async function generateMetadata(props: {
  params: Promise<{ ressource: string }>;
}): Promise<Metadata> {
  const { ressource } = await props.params;
  return { title: findResource(ressource)?.plural ?? "Ressource" };
}

/**
 * Liste generique — l'index de toutes les ressources du catalogue.
 *
 * Ce fichier unique sert /contrats, /presences, /ventes, /caisse... Le segment
 * dynamique `[ressource]` ne prend la main que si aucune route statique ne
 * correspond : /employes et /utilisateurs, qui ont leurs propres regles metier,
 * gardent leurs pages dediees.
 *
 * Une URL absente du catalogue donne un 404, jamais une page vide : sans cela,
 * n'importe quelle adresse inventee afficherait un ecran d'ERP credible.
 */
export default async function ListeRessourcePage(props: {
  params: Promise<{ ressource: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { ressource } = await props.params;
  const definition = findResource(ressource);

  if (!definition) {
    notFound();
  }

  const user = await requirePermission(definition.permissions.read);
  const searchParams = await props.searchParams;

  const filtres = filterFields(definition);

  // Les filtres sur relation ont besoin de leur liste deroulante ; on ne
  // charge que celles-la, pas toutes les relations de la ressource.
  const listes = await Promise.all(
    filtres
      .filter((field) => field.kind === "relation")
      .map(async (field) => [field.name, await prismaResourceRepository.optionsFor(field)] as const),
  );

  const equals: Record<string, string> = {};
  for (const field of filtres) {
    const valeur = searchParams[field.name];
    if (valeur) equals[field.name] = valeur;
  }

  const pagination = parsePagination(searchParams.page);
  const page = await listResource(
    prismaResourceRepository,
    definition,
    { search: searchParams.recherche, equals },
    pagination,
  );

  const peutCreer = can(user, definition.permissions.create);
  const peutModifier = can(user, definition.permissions.update);
  const filtre = Boolean(searchParams.recherche) || Object.keys(equals).length > 0;

  // L'etat imprime reprend les criteres de l'ecran, mais pas la page courante :
  // on imprime la liste filtree en entier, pas les vingt lignes affichees.
  const criteres = new URLSearchParams(
    Object.entries(searchParams).filter(
      (entree): entree is [string, string] =>
        entree[0] !== "page" && typeof entree[1] === "string" && entree[1].length > 0,
    ),
  ).toString();

  return (
    <>
      <PageHeader
        title={definition.plural}
        description={definition.description}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: definition.plural },
        ]}
        actions={
          <>
            {/* La liste sert la saisie quotidienne ; la synthese, le pilotage.
                Les modules qui ont les deux renvoient de l'une a l'autre. */}
            {definition.summary ? (
              <LinkButton href={`/${definition.key}/synthese`} variant="outline">
                <ChartColumn className="size-4" />
                Synthèse
              </LinkButton>
            ) : null}
            <LinkButton
              href={`/${definition.key}/impression${criteres ? `?${criteres}` : ""}`}
              variant="outline"
            >
              <Printer className="size-4" />
              Imprimer
            </LinkButton>
            {peutCreer ? (
              <LinkButton href={`/${definition.key}/nouveau`}>
                <Plus className="size-4" />
                Ajouter
              </LinkButton>
            ) : null}
          </>
        }
      />

      {definition.notice ? (
        <Alert tone="info" className="mb-5">
          {definition.notice}
        </Alert>
      ) : null}

      <Card>
        <ResourceFilters
          resourceKey={definition.key}
          fields={filtres}
          options={Object.fromEntries(listes) as Record<string, FieldOption[]>}
          searchable={definition.searchFields.length > 0}
        />

        {page.items.length === 0 ? (
          <EmptyState
            icon={<Table2 />}
            title={`Aucun élément dans « ${definition.plural} »`}
            description={
              filtre
                ? "Aucun résultat ne correspond à ces critères. Modifiez ou réinitialisez les filtres."
                : `Commencez par ajouter un premier élément : ${definition.description.toLowerCase()}`
            }
            action={
              peutCreer && !filtre ? (
                <LinkButton href={`/${definition.key}/nouveau`} variant="primary">
                  <Plus className="size-4" />
                  Ajouter
                </LinkButton>
              ) : null
            }
          />
        ) : (
          <>
            <ResourceTable
              definition={definition}
              rows={page.items}
              peutModifier={peutModifier}
            />
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              basePath={`/${definition.key}`}
              searchParams={searchParams}
            />
          </>
        )}
      </Card>
    </>
  );
}
