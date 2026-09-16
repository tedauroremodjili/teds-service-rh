import type { Metadata } from "next";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { listEmployees } from "@/modules/employees/application/employee-use-cases";
import type { EmployeeStatus } from "@/modules/employees/domain/employee";
import { EMPLOYEE_STATUSES } from "@/modules/employees/domain/employee";
import { prismaEmployeeRepository } from "@/modules/employees/infrastructure/prisma-employee-repository";
import { getDepartmentOptions } from "@/modules/employees/infrastructure/reference-queries";
import { EMPLOYEE_STATUS_LABELS } from "@/modules/employees/presentation/employee-status-badge";
import { MAX_LIGNES_IMPRIMEES } from "@/modules/printing/domain/printable";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { EmployeeListDocument } from "@/modules/printing/presentation/employee-list-document";
import { buildPrintPdfHref } from "@/modules/printing/presentation/print-pdf-href";
import { PrintToolbar } from "@/modules/printing/presentation/print-toolbar";

export const metadata: Metadata = {
  title: "État du personnel — impression",
};

/**
 * État du personnel imprimable — /employes/impression.
 *
 * Comme pour les listes generees par le catalogue : les criteres de l'ecran
 * sont repris, la pagination ne l'est pas. On imprime l'effectif filtre en
 * entier, plafonne pour ne pas figer le navigateur.
 */
export default async function ImpressionEmployesPage(props: {
  searchParams: Promise<{
    recherche?: string;
    statut?: string;
    departement?: string;
    auto?: string;
  }>;
}) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_READ);
  const searchParams = await props.searchParams;

  const statut = EMPLOYEE_STATUSES.includes(searchParams.statut as EmployeeStatus)
    ? (searchParams.statut as EmployeeStatus)
    : undefined;
  const recherche = searchParams.recherche?.trim() || undefined;
  const departement = searchParams.departement || undefined;

  const [page, departments, company] = await Promise.all([
    listEmployees(
      prismaEmployeeRepository,
      { search: recherche, status: statut, departmentId: departement },
      { page: 1, pageSize: MAX_LIGNES_IMPRIMEES },
    ),
    getDepartmentOptions(),
    getCompanyIdentity(),
  ]);

  // Un etat filtre qui ne dit pas sur quoi il est filtre est un etat faux :
  // les criteres sont imprimes avec la liste, en clair.
  const criteres: string[] = [];
  if (recherche) criteres.push(`Recherche : « ${recherche} »`);
  if (statut) criteres.push(`Statut : ${EMPLOYEE_STATUS_LABELS[statut]}`);
  if (departement) {
    const nom = departments.find((option) => option.id === departement)?.label;
    criteres.push(`Département : ${nom ?? departement}`);
  }

  return (
    <>
      <PrintToolbar
        backHref="/employes"
        backLabel="Retour à la liste"
        pdfHref={buildPrintPdfHref("/employes/impression", searchParams)}
        auto={searchParams.auto === "1"}
        hint="Cet état s'imprime en paysage. Choisissez « Enregistrer au format PDF » pour obtenir un fichier."
      />

      <EmployeeListDocument
        employees={page.items}
        total={page.total}
        criteria={criteres}
        company={company}
        editedBy={user.displayName}
      />
    </>
  );
}
