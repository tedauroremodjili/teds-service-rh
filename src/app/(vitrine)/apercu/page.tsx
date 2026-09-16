import type { Metadata } from "next";

import { PAGES_VITRINE } from "@/modules/landing/domain/content";
import { PageHero } from "@/modules/landing/presentation/page-hero";
import { Pager } from "@/modules/landing/presentation/pager";
import { DashboardPreview } from "@/modules/landing/presentation/dashboard-preview";

/** Page « Aperçu » de la vitrine. Le contenu vient du domaine. */
const PAGE = PAGES_VITRINE.find((page) => page.href === "/apercu")!;

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

export default function ApercuPage() {
  return (
    <>
      <PageHero
        surtitre={PAGE.surtitre}
        titre={PAGE.titre}
        description={PAGE.description}
      />
      <DashboardPreview />
      <Pager courante="/apercu" />
    </>
  );
}
