import type { Metadata } from "next";

import { PAGES_VITRINE } from "@/modules/landing/domain/content";
import { listLandingArguments } from "@/modules/landing/infrastructure/module-queries";
import { PageHero } from "@/modules/landing/presentation/page-hero";
import { Pager } from "@/modules/landing/presentation/pager";
import { Benefits } from "@/modules/landing/presentation/benefits";

/** Page « Avantages » de la vitrine. Le contenu vient du domaine. */
const PAGE = PAGES_VITRINE.find((page) => page.href === "/avantages")!;

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

export default async function AvantagesPage() {
  const argumentsVitrine = await listLandingArguments();

  return (
    <>
      <PageHero
        surtitre={PAGE.surtitre}
        titre={PAGE.titre}
        description={PAGE.description}
      />
      <Benefits arguments={argumentsVitrine} />
      <Pager courante="/avantages" />
    </>
  );
}
