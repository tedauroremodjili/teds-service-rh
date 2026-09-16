import { Container, FeatureCard, Section } from "@/shared/ui/section";

import type { LandingModuleFamille, LandingModuleItem } from "../infrastructure/module-queries";
import { FAMILLE_LABELS } from "../infrastructure/module-queries";
import { landingIcon } from "./landing-icons";

/**
 * Les modules du produit.
 *
 * Quatorze cartes, groupees en quatre familles. Le regroupement n'est pas
 * decoratif : il repond a la question que se pose le visiteur — « est-ce que ca
 * couvre MON besoin ? » — bien mieux qu'une grille uniforme ou tout se vaut.
 *
 * Le composant ne porte plus de titre : depuis que chaque sujet a sa page,
 * c'est le bandeau d'ouverture qui l'annonce.
 *
 * Les cartes sont lues en base par la page (module 18) et transmises ici en
 * prop : ce composant reste un simple gabarit d'affichage.
 */
export function FeatureGrid({ modules }: { modules: LandingModuleItem[] }) {
  const familles = [...new Set(modules.map((module) => module.famille))] as LandingModuleFamille[];

  return (
    <Section fond="clair" className="py-14 sm:py-20">
      <Container>
        <div className="space-y-12 sm:space-y-14">
          {familles.map((famille) => (
            <div key={famille}>
              <h2 className="reveal mb-5 flex items-center gap-3 text-sm font-semibold uppercase tracking-wider text-surface-500">
                {FAMILLE_LABELS[famille]}
                <span className="h-px flex-1 bg-surface-200" />
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {modules
                  .filter((module) => module.famille === famille)
                  .map((module) => {
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
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
