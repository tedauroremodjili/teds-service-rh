import type { Metadata } from "next";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { getSellableDocumentOptions } from "@/modules/documents/infrastructure/product-queries";
import { SaleForm } from "@/modules/sales/presentation/sale-form";
import { getActiveStudentOptions } from "@/modules/students/infrastructure/student-queries";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "Nouvelle vente",
};

/**
 * Ecran dedie, distinct du formulaire generique `[ressource]/nouveau` : une
 * vente porte plusieurs lignes (documents + quantites), que le moteur
 * generique ne sait pas ecrire. Route concrete, prend le pas sur le
 * catch-all pour `/ventes/nouveau` — meme mecanisme que `employes/nouveau`.
 */
export default async function NouvelleVentePage() {
  await requirePermission(PERMISSIONS.SALES_CREATE);

  const [products, students] = await Promise.all([
    getSellableDocumentOptions(),
    getActiveStudentOptions(),
  ]);

  return (
    <>
      <PageHeader
        title="Nouvelle vente"
        description="Choisissez les documents vendus — le prix vient du catalogue."
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Ventes", href: "/ventes" },
          { label: "Nouveau" },
        ]}
      />

      <div className="max-w-3xl">
        <SaleForm products={products} students={students} cancelHref="/ventes" />
      </div>
    </>
  );
}
