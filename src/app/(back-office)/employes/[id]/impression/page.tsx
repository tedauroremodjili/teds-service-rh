import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { getEmployee } from "@/modules/employees/application/employee-use-cases";
import { prismaEmployeeRepository } from "@/modules/employees/infrastructure/prisma-employee-repository";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { EmployeeDocument } from "@/modules/printing/presentation/employee-document";
import { buildPrintPdfHref } from "@/modules/printing/presentation/print-pdf-href";
import { PrintToolbar } from "@/modules/printing/presentation/print-toolbar";

export const metadata: Metadata = {
  title: "Fiche du personnel — impression",
};

/**
 * Fiche du personnel imprimable — /employes/<id>/impression.
 *
 * Le module employes a ses propres regles metier, donc ses propres pages : il
 * ne passe pas par le catalogue de ressources, et son impression non plus.
 */
export default async function ImpressionFicheEmployePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_READ);
  const { id } = await props.params;
  const { auto } = await props.searchParams;

  const [result, company] = await Promise.all([
    getEmployee(prismaEmployeeRepository, id),
    getCompanyIdentity(),
  ]);

  if (!result.ok) {
    notFound();
  }

  return (
    <>
      <PrintToolbar
        backHref={`/employes/${id}`}
        backLabel="Retour à la fiche"
        pdfHref={buildPrintPdfHref(`/employes/${id}/impression`)}
        auto={auto === "1"}
      />

      <EmployeeDocument
        employee={result.value}
        company={company}
        editedBy={user.displayName}
      />
    </>
  );
}
