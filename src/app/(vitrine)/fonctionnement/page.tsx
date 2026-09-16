import type { Metadata } from "next";

import { PAGES_VITRINE } from "@/modules/landing/domain/content";
import { listLandingWorkflowSteps } from "@/modules/landing/infrastructure/module-queries";
import { PageHero } from "@/modules/landing/presentation/page-hero";
import { Pager } from "@/modules/landing/presentation/pager";
import { Workflow } from "@/modules/landing/presentation/workflow";

/** Page « Fonctionnement » de la vitrine. Le contenu vient du domaine. */
const PAGE = PAGES_VITRINE.find((page) => page.href === "/fonctionnement")!;

export const metadata: Metadata = {
  title: PAGE.titre,
  description: PAGE.description,
  openGraph: {
    title: `${PAGE.titre} — TED'S SERVICE ERP`,
    description: PAGE.description,
    type: "website",
    locale: "fr_FR",
  },
};

export default async function FonctionnementPage() {
  const etapes = await listLandingWorkflowSteps();

  return (
    <>
      <PageHero
        surtitre={PAGE.surtitre}
        titre={PAGE.titre}
        description={PAGE.description}
      />
      <Workflow etapes={etapes} />
      <Pager courante="/fonctionnement" />
    </>
  );
}
