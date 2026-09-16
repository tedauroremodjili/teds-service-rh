import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { getUserAccess } from "@/modules/users/application/user-use-cases";
import { prismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";
import { EditUserForm } from "@/modules/users/presentation/edit-user-form";
import { Card, CardBody } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getUserAccess(prismaUserRepository, id);
  return { title: result.ok ? `Modifier — ${result.value.user.displayName}` : "Modifier" };
}

/** Modification d'un compte : coordonnées et mot de passe. */
export default async function ModifierComptePage(props: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const { id } = await props.params;

  const [result, libres] = await Promise.all([
    getUserAccess(prismaUserRepository, id),
    prismaUserRepository.employeesWithoutAccount(),
  ]);

  if (!result.ok) {
    notFound();
  }

  const { user } = result.value;

  // L'employé déjà rattaché n'est pas « sans compte » : sans lui, la liste
  // déroulante s'ouvrirait sur « Aucun » et un simple enregistrement
  // détacherait le compte sans que personne l'ait demandé.
  const employees =
    user.employeeId && !libres.some((employe) => employe.id === user.employeeId)
      ? [{ id: user.employeeId, label: `${user.displayName} (actuel)` }, ...libres]
      : libres;

  return (
    <>
      <PageHeader
        title={`Modifier — ${user.displayName}`}
        description="Coordonnées du compte et mot de passe."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Utilisateurs", href: "/utilisateurs" },
          { label: user.displayName, href: `/utilisateurs/${user.id}` },
          { label: "Modifier" },
        ]}
      />

      <Card>
        <CardBody>
          <EditUserForm
            userId={user.id}
            email={user.email}
            employeeId={user.employeeId}
            mustChangePassword={user.mustChangePassword}
            employees={employees}
          />
        </CardBody>
      </Card>
    </>
  );
}
