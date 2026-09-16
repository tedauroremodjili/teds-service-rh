import { Container, FeatureCard, Section } from "@/shared/ui/section";

import type { LandingArgumentItem } from "../infrastructure/module-queries";
import { landingIcon } from "./landing-icons";

/**
 * Pourquoi choisir TED'S SERVICE ERP.
 *
 * Chaque argument enonce ce que le logiciel FAIT, jamais ce qu'il « permet de
 * faciliter ». Une promesse verifiable vaut mieux qu'un superlatif.
 *
 * Les arguments sont lus en base par la page (module 18) et transmis ici en
 * prop.
 */
export function Benefits({ arguments: argumentsVitrine }: { arguments: LandingArgumentItem[] }) {
  return (
    <Section fond="clair" className="py-14 sm:py-20">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {argumentsVitrine.map((argument) => {
            const Icone = landingIcon(argument.icon);

            return (
              <FeatureCard key={argument.id} className="flex flex-col">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icone className="size-5" />
                </span>
                <h2 className="mt-4 font-semibold text-primary-950 transition-colors group-hover:text-primary-700">
                  {argument.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-surface-600">
                  {argument.description}
                </p>
              </FeatureCard>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
