import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { getEmployee } from "@/modules/employees/application/employee-use-cases";
import { prismaEmployeeRepository } from "@/modules/employees/infrastructure/prisma-employee-repository";
import {
  getDepartmentOptions,
  getPositionOptions,
} from "@/modules/employees/infrastructure/reference-queries";
import { updateEmployeeAction } from "@/modules/employees/presentation/actions";
import { EmployeeForm } from "@/modules/employees/presentation/employee-form";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "Modifier un employé",
};

/**
 * Next.js 16 : `params` est une PROMESSE, comme `searchParams`.
 * Il faut donc l'attendre avant de lire l'identifiant.
 */
export default async function ModifierEmployePage(props: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.EMPLOYEES_UPDATE);
  const { id } = await props.params;

  const [result, departments, positions] = await Promise.all([
    getEmployee(prismaEmployeeRepository, id),
    getDepartmentOptions(),
    getPositionOptions(),
  ]);

  if (!result.ok) {
    notFound();
  }

  const employee = result.value;

  // `bind` fige l'identifiant cote serveur : le client ne peut pas le remplacer
  // par celui d'un autre employe en manipulant le formulaire.
  const action = updateEmployeeAction.bind(null, id);

  return (
    <>
      <PageHeader
        title={`Modifier — ${employee.firstName} ${employee.lastName}`}
        description={`Matricule ${employee.matricule}`}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Employés", href: "/employes" },
          { label: `${employee.firstName} ${employee.lastName}`, href: `/employes/${id}` },
          { label: "Modifier" },
        ]}
      />

      <div className="max-w-4xl">
        <EmployeeForm
          action={action}
          employee={employee}
          departments={departments}
          positions={positions}
          submitLabel="Enregistrer les modifications"
          cancelHref={`/employes/${id}`}
        />
      </div>
    </>
  );
}
