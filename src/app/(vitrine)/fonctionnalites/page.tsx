import type { Metadata } from "next";

import { PAGES_VITRINE } from "@/modules/landing/domain/content";
import { listLandingModules } from "@/modules/landing/infrastructure/module-queries";
import { PageHero } from "@/modules/landing/presentation/page-hero";
import { Pager } from "@/modules/landing/presentation/pager";
import { FeatureGrid } from "@/modules/landing/presentation/feature-grid";

/** Page « Fonctionnalités » de la vitrine. Le contenu vient du domaine. */
const PAGE = PAGES_VITRINE.find((page) => page.href === "/fonctionnalites")!;

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

export default async function FonctionnalitesPage() {
  const modules = await listLandingModules();

  return (
    <>
      <PageHero
        surtitre={PAGE.surtitre}
        titre={PAGE.titre}
        description={PAGE.description}
      />
      <FeatureGrid modules={modules} />
      <Pager courante="/fonctionnalites" />
    </>
  );
}
