import { ChevronDown } from "lucide-react";

import { Container, Section } from "@/shared/ui/section";

import type { FaqItem } from "../infrastructure/faq-queries";

/**
 * Questions fréquentes.
 *
 * Bati sur `<details>` et `<summary>` natifs : l'accordeon fonctionne sans une
 * ligne de JavaScript, reste operable au clavier et annonce correctement son
 * etat aux lecteurs d'ecran. Un composant client aurait fait moins bien, plus
 * lourd.
 *
 * Les entrees sont lues en base par la page (module 18) et transmises ici en
 * prop : ce composant reste un simple gabarit d'affichage.
 */
export function Faq({ entries }: { entries: FaqItem[] }) {
  if (entries.length === 0) return null;

  return (
    <Section fond="clair" className="py-14 sm:py-20">
      <Container>
        <div className="reveal mx-auto max-w-3xl divide-y divide-surface-200 border-y border-surface-200">
          {entries.map((entree) => (
            <details key={entree.id} className="group open:bg-surface-50/60 transition-colors">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-2 py-5 text-left transition-colors hover:text-primary-700">
                <h2 className="font-medium text-primary-950 group-hover:text-primary-700">
                  {entree.question}
                </h2>
                <ChevronDown className="size-5 shrink-0 text-surface-400 transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="px-2 pb-5 pr-2 text-sm leading-relaxed text-surface-600 sm:pr-10">
                {entree.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
