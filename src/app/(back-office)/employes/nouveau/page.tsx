import type { Metadata } from "next";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { suggestMatricule } from "@/modules/employees/application/employee-use-cases";
import { listerCibles } from "@/modules/remuneration/infrastructure/prisma-remuneration-repository";
import { prismaEmployeeRepository } from "@/modules/employees/infrastructure/prisma-employee-repository";
import {
  getDepartmentOptions,
  getPositionOptions,
} from "@/modules/employees/infrastructure/reference-queries";
import { createEmployeeAction } from "@/modules/employees/presentation/actions";
import { EmployeeForm } from "@/modules/employees/presentation/employee-form";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "Nouvel employé",
};

export default async function NouvelEmployePage() {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_CREATE);

  // Poser un barème, c'est décider d'un salaire : la section n'est proposée
  // qu'à qui calcule la paie. Un responsable RH sans ce droit crée la fiche, un
  // gestionnaire de paie complète ensuite depuis l'écran Rémunération. La
  // Server Action refait ce contrôle — masquer un formulaire n'est qu'un confort.
  const peutDefinirBareme = can(user, PERMISSIONS.PAYROLL_CALCULATE);

  const [departments, positions, matricule, cibles] = await Promise.all([
    getDepartmentOptions(),
    getPositionOptions(),
    suggestMatricule(prismaEmployeeRepository),
    peutDefinirBareme ? listerCibles() : null,
  ]);

  return (
    <>
      <PageHeader
        title="Nouvel employé"
        description="Créez la fiche d'un nouveau membre du personnel."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Employés", href: "/employes" },
          { label: "Nouveau" },
        ]}
      />

      <div className="max-w-4xl">
        <EmployeeForm
          action={createEmployeeAction}
          departments={departments}
          positions={positions}
          suggestedMatricule={matricule}
          remunerationTargets={cibles ?? undefined}
          submitLabel="Créer l'employé"
          cancelHref="/employes"
        />
      </div>
    </>
  );
}
