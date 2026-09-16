import { Container, Section } from "@/shared/ui/section";

import type { LandingWorkflowStepItem } from "../infrastructure/module-queries";
import { landingIcon } from "./landing-icons";

/**
 * Le parcours d'une opération, de l'agent au rapport.
 *
 * Presente comme une CHAINE et non comme une liste : c'est l'enchainement qui
 * porte le message — chaque etape decoule de la precedente sans ressaisie.
 *
 * La ligne de liaison suit la disposition : verticale tant que les etapes sont
 * empilees, horizontale des qu'elles s'alignent. Elle disparait plutot que de
 * traverser le vide sur une grille a deux ou trois colonnes, ou elle
 * suggererait un ordre qui n'est pas celui de la lecture.
 *
 * Les etapes sont lues en base par la page (module 18) et transmises ici en
 * prop, dans l'ordre d'affichage : le numero (« Étape 1 »...) se deduit de ce
 * rang, pas d'un champ separe qui pourrait s'en desynchroniser.
 */
export function Workflow({ etapes }: { etapes: LandingWorkflowStepItem[] }) {
  return (
    <Section fond="sombre" className="py-14 sm:py-20">
      <Container>
        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 xl:gap-4">
          {/* Liaison verticale sur mobile, horizontale sur très large écran. */}
          <span
            aria-hidden
            className="absolute left-6 top-6 h-[calc(100%-3rem)] w-px bg-white/15 sm:hidden xl:left-0 xl:top-6 xl:block xl:h-px xl:w-full"
          />

          {etapes.map((etape, index) => {
            const Icone = landingIcon(etape.icon);
            const derniere = index === etapes.length - 1;

            return (
              <li key={etape.id} className="reveal group relative flex gap-4 sm:block">
                <span
                  className={`relative z-10 flex size-12 shrink-0 items-center justify-center rounded-xl ring-4 ring-primary-950 transition-transform duration-300 group-hover:scale-110 ${
                    derniere
                      ? "pulse-glow bg-accent-500 text-white"
                      : "bg-white/10 text-white backdrop-blur"
                  }`}
                >
                  <Icone className="size-5" />
                </span>

                <div className="sm:mt-5">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-primary-300">
                    Étape {index + 1}
                  </p>
                  <h2 className="mt-1 font-semibold text-white transition-colors group-hover:text-accent-300">
                    {etape.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-primary-200">
                    {etape.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}
