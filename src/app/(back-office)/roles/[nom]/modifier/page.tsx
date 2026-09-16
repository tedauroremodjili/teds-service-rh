import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { getRole } from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import { RoleForm } from "@/modules/roles/presentation/role-form";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ nom: string }>;
}): Promise<Metadata> {
  const { nom } = await props.params;
  const result = await getRole(prismaRoleRepository, nom);
  return { title: result.ok ? `Modifier — ${result.value.label}` : "Modifier le rôle" };
}

/** Renomme un rôle. Son socle de droits se modifie depuis sa fiche. */
export default async function ModifierRolePage(props: {
  params: Promise<{ nom: string }>;
}) {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);
  const { nom } = await props.params;

  const result = await getRole(prismaRoleRepository, nom);
  if (!result.ok) {
    notFound();
  }

  const role = result.value;

  return (
    <>
      <PageHeader
        title={`Modifier — ${role.label}`}
        description="Nom et description. Le socle de droits se modifie depuis la fiche."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Rôles", href: "/roles" },
          { label: role.label, href: `/roles/${role.name}` },
          { label: "Modifier" },
        ]}
      />

      <RoleForm role={{ name: role.name, label: role.label, description: role.description }} />
    </>
  );
}
