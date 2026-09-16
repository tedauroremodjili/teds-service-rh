import type { Metadata } from "next";

import { PAGES_VITRINE } from "@/modules/landing/domain/content";
import { listFaqEntries } from "@/modules/landing/infrastructure/faq-queries";
import { PageHero } from "@/modules/landing/presentation/page-hero";
import { Pager } from "@/modules/landing/presentation/pager";
import { Faq } from "@/modules/landing/presentation/faq";

/** Page « Questions » de la vitrine. Le contenu vient du domaine. */
const PAGE = PAGES_VITRINE.find((page) => page.href === "/questions")!;

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

export default async function QuestionsPage() {
  const entries = await listFaqEntries();

  return (
    <>
      <PageHero
        surtitre={PAGE.surtitre}
        titre={PAGE.titre}
        description={PAGE.description}
      />
      <Faq entries={entries} />
      <Pager courante="/questions" />
    </>
  );
}
