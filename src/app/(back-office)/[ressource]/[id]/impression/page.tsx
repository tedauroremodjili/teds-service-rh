import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { loadPrintedRecord } from "@/modules/printing/application/print-use-cases";
import { printableFor } from "@/modules/printing/domain/printable";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { buildPrintPdfHref } from "@/modules/printing/presentation/print-pdf-href";
import { PrintToolbar } from "@/modules/printing/presentation/print-toolbar";
import { PrintedRecordDocument } from "@/modules/printing/presentation/printed-record";
import { findResource } from "@/modules/resources/domain/catalog";
import { prismaResourceRepository } from "@/modules/resources/infrastructure/prisma-resource-repository";

export async function generateMetadata(props: {
  params: Promise<{ ressource: string; id: string }>;
}): Promise<Metadata> {
  const { ressource } = await props.params;
  const definition = findResource(ressource);
  if (!definition) return { title: "Impression" };

  // Le titre du document devient le nom du fichier propose par le navigateur
  // dans « Enregistrer au format PDF » : il vaut mieux qu'il dise la piece.
  return { title: `${printableFor(definition.key, definition.singular).title} — impression` };
}

/**
 * Piece imprimable d'un enregistrement — /<ressource>/<id>/impression.
 *
 * Cette page unique sert les bulletins de paie, les factures, les recus, les
 * certificats et la fiche generique : le gabarit est choisi par le catalogue
 * d'impression, pas par l'URL. Une ressource ajoutee au catalogue est donc
 * imprimable le jour meme, sans page supplementaire.
 *
 * L'autorisation est celle de la lecture de la ressource : imprimer, c'est lire.
 * Le controle se fait ici, au plus pres des donnees, comme sur toute page du
 * back-office (regle 2 du projet).
 */
export default async function ImpressionFichePage(props: {
  params: Promise<{ ressource: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { ressource, id } = await props.params;
  const definition = findResource(ressource);

  if (!definition) {
    notFound();
  }

  const user = await requirePermission(definition.permissions.read);
  const { auto } = await props.searchParams;

  const [record, company] = await Promise.all([
    loadPrintedRecord(prismaResourceRepository, definition, id),
    getCompanyIdentity(),
  ]);

  if (!record) {
    notFound();
  }

  return (
    <>
      <PrintToolbar
        backHref={`/${definition.key}/${id}`}
        backLabel="Retour à la fiche"
        pdfHref={buildPrintPdfHref(`/${definition.key}/${id}/impression`)}
        auto={auto === "1"}
      />

      <PrintedRecordDocument
        record={record}
        definition={definition}
        company={company}
        editedBy={user.displayName}
      />
    </>
  );
}
