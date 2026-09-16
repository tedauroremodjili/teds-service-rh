import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { getEditableSettings } from "@/modules/settings/application/settings-use-cases";
import { prismaSettingsRepository } from "@/modules/settings/infrastructure/prisma-settings-repository";
import { SettingsForm } from "@/modules/settings/presentation/settings-form";
import { LinkButton } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = {
  title: "Paramètres",
};

/**
 * Paramètres du système (module 17).
 *
 * Cette page prend le pas sur l'écran générique `[ressource]` : les paramètres
 * sont stockés en JSON, et personne ne doit taper `{"vatRate": 18}` pour
 * changer un taux. Chaque réglage a ici son propre champ, typé.
 *
 * L'écran générique reste accessible pour les cas techniques — `/parametres/<clé>`
 * permet d'ajouter ou de supprimer une clé.
 */
export default async function ParametresPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_READ);

  const groups = await getEditableSettings(prismaSettingsRepository);

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Identité de l'entreprise, monnaie, taux et règles de temps de travail."
        breadcrumbs={[{ label: "Accueil", href: "/tableau-de-bord" }, { label: "Paramètres" }]}
        actions={
          <LinkButton href="/parametres/synthese" variant="outline">
            <ChartColumn className="size-4" />
            Synthèse
          </LinkButton>
        }
      />

      <SettingsForm groups={groups} editable={can(user, PERMISSIONS.SETTINGS_MANAGE)} />
    </>
  );
}
