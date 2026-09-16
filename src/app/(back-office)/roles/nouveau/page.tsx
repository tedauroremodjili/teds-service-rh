import type { Metadata } from "next";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { RoleForm } from "@/modules/roles/presentation/role-form";
import { Alert } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "Nouveau rôle",
};

/**
 * Création d'un rôle (module 1).
 *
 * Le nom et le socle de droits se choisissent d'un seul geste : un rôle créé
 * sans permissions n'ouvrirait aucun écran à ses titulaires, ce qui n'a de sens
 * pour personne.
 */
export default async function NouveauRolePage() {
  await requirePermission(PERMISSIONS.ROLES_MANAGE);

  return (
    <>
      <PageHeader
        title="Nouveau rôle"
        description="Un socle de droits partagé par plusieurs comptes."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Rôles", href: "/roles" },
          { label: "Nouveau" },
        ]}
      />

      <div className="space-y-5">
        <Alert tone="info">
          Créez un rôle quand plusieurs personnes doivent partager les mêmes droits. Pour un
          besoin propre à une seule personne, il est plus simple d&apos;ajuster les droits sur
          sa fiche.
        </Alert>

        <RoleForm />
      </div>
    </>
  );
}
