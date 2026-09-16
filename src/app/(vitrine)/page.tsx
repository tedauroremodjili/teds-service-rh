import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getSession } from "@/infrastructure/auth/dal";
import { PAGES_VITRINE } from "@/modules/landing/domain/content";
import { listLandingModules } from "@/modules/landing/infrastructure/module-queries";
import { Hero } from "@/modules/landing/presentation/hero";
import { landingIcon } from "@/modules/landing/presentation/landing-icons";
import { Container, FeatureCard, Section, SectionHeading } from "@/shared/ui/section";

const DESCRIPTION =
  "Une plateforme intelligente pour gérer les ressources humaines, les formations, " +
  "les ventes, les documents administratifs, la caisse et les finances de votre entreprise.";

export const metadata: Metadata = {
  title: "TED'S SERVICE ERP — Gestion RH, formations, ventes et finances",
  description: DESCRIPTION,
  openGraph: {
    title: "TED'S SERVICE ERP",
    description: DESCRIPTION,
    type: "website",
    locale: "fr_FR",
    siteName: "TED'S SERVICE ERP",
  },
  twitter: {
    card: "summary_large_image",
    title: "TED'S SERVICE ERP",
    description: DESCRIPTION,
  },
};

/**
 * Accueil de la vitrine.
 *
 * Elle ne rejoue pas le contenu des autres pages : elle pose le produit, montre
 * six modules en guise d'echantillon, puis oriente vers le sujet qui interesse
 * le visiteur. Repeter ici tout ce qui suit annulerait le decoupage en pages.
 *
 * Les modules sont lus en base (module 18) comme sur /fonctionnalites — un
 * contenu que TED'S SERVICE modifie lui-meme n'a pas de raison de differer
 * d'une page a l'autre. La lecture est publique et sans donnee sensible,
 * comme la FAQ de /questions.
 */
export default async function AccueilPage() {
  const [session, modules] = await Promise.all([getSession(), listLandingModules()]);
  const connecte = session !== null;

  // Un echantillon representatif : une carte par famille, plus deux phares.
  const echantillon = modules.filter((module) =>
    [
      "Ressources humaines",
      "Gestion des salaires",
      "Commissions",
      "Gestion des formations",
      "Vente de documents",
      "Tableau de bord",
    ].includes(module.title),
  );

  return (
    <>
      <Hero connecte={connecte} />

      {/* --- Echantillon de modules ------------------------------------- */}
      <Section fond="gris" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            surtitre="Un aperçu"
            titre="Quatorze modules, une seule base de données"
            description="Une vente enregistrée par un commercial alimente sa commission, la caisse et le tableau de bord au même instant."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {echantillon.map((module) => {
              const Icone = landingIcon(module.icon);

              return (
                <FeatureCard key={module.id}>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    <Icone className="size-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-primary-950 transition-colors group-hover:text-primary-700">
                    {module.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-surface-600">
                    {module.description}
                  </p>
                </FeatureCard>
              );
            })}
          </div>

          <div className="reveal mt-10 text-center">
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline"
            >
              Voir les quatorze modules
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </Section>

      {/* --- Orientation vers les autres pages --------------------------- */}
      <Section fond="clair" className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            surtitre="Explorer"
            titre="Par où voulez-vous commencer ?"
            description="Chaque sujet a sa page — vous pouvez la partager par lien."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAGES_VITRINE.map((page) => (
              <Link key={page.href} href={page.href} className="group block">
                <FeatureCard className="h-full">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-600">
                    {page.surtitre}
                  </p>
                  <h3 className="mt-2 font-semibold text-primary-950 group-hover:text-primary-700">
                    {page.titre}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-surface-600">
                    {page.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700">
                    Ouvrir
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </FeatureCard>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
