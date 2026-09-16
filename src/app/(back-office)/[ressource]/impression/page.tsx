import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { loadPrintedList } from "@/modules/printing/application/print-use-cases";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { ListDocument } from "@/modules/printing/presentation/list-document";
import { buildPrintPdfHref } from "@/modules/printing/presentation/print-pdf-href";
import { PrintToolbar } from "@/modules/printing/presentation/print-toolbar";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";

export async function generateMetadata(props: {
  params: Promise<{ ressource: string }>;
}): Promise<Metadata> {
  const { ressource } = await props.params;
  const definition = findResource(ressource);
  return { title: `${definition?.plural ?? "Liste"} — impression` };
}

/**
 * Etat imprimable d'une liste — /<ressource>/impression.
 *
 * Elle reprend les criteres de l'ecran de liste (recherche et filtres passes
 * dans l'URL) mais ignore la pagination : on imprime l'etat, pas la page
 * courante. Le plafond de lignes et la mention qui l'accompagne sont declares
 * dans le domaine (`MAX_LIGNES_IMPRIMEES`), pour qu'une liste tronquee le dise.
 */
export default async function ImpressionListePage(props: {
  params: Promise<{ ressource: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { ressource } = await props.params;
  const definition = findResource(ressource);

  if (!definition) {
    notFound();
  }

  const user = await requirePermission(definition.permissions.read);
  const searchParams = await props.searchParams;

  const [liste, company] = await Promise.all([
    loadPrintedList(prismaResourceRepository, definition, searchParams),
    getCompanyIdentity(),
  ]);

  return (
    <>
      <PrintToolbar
        backHref={`/${definition.key}`}
        backLabel="Retour à la liste"
        pdfHref={buildPrintPdfHref(`/${definition.key}/impression`, searchParams)}
        auto={searchParams.auto === "1"}
        hint={
          liste.orientation === "landscape"
            ? "Cet état s'imprime en paysage. Choisissez « Enregistrer au format PDF » pour obtenir un fichier."
            : undefined
        }
      />

      <ListDocument
        definition={definition}
        rows={liste.rows}
        total={liste.total}
        criteria={liste.criteria}
        company={company}
        editedBy={user.displayName}
      />
    </>
  );
}
