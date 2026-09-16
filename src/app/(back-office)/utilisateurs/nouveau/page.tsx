import type { Metadata } from "next";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { listRoles } from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import { prismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";
import { NewUserForm } from "@/modules/users/presentation/new-user-form";
import { Card, CardBody } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "Nouveau compte",
};

/** Ouverture d'un accès au système (module 1). */
export default async function NouveauComptePage() {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const [employees, roles] = await Promise.all([
    prismaUserRepository.employeesWithoutAccount(),
    listRoles(prismaRoleRepository),
  ]);

  return (
    <>
      <PageHeader
        title="Nouveau compte"
        description="Donner accès au système à une personne."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Utilisateurs", href: "/utilisateurs" },
          { label: "Nouveau" },
        ]}
      />

      <Card>
        <CardBody className="space-y-5">
          <Alert tone="info">
            Le rôle donne le socle de droits. Une fois le compte créé, sa fiche permet
            d&apos;ajouter ou de retirer des permissions une par une, sans toucher aux autres
            comptes du même rôle.
          </Alert>

          <NewUserForm employees={employees} roles={roles} />
        </CardBody>
      </Card>
    </>
  );
}
