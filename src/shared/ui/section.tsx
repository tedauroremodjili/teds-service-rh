import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

/**
 * Briques de mise en page de la vitrine.
 *
 * Le rythme vertical fait tout le caractere « premium » d'une page de
 * presentation : c'est l'air entre les blocs, pas les effets, qui donne
 * l'impression de calme. Ces composants figent ce rythme une fois pour toutes,
 * afin qu'aucune section ne derive.
 */

/** Largeur de lecture commune a toute la page. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-12 xl:px-16", className)}>
      {children}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  fond = "clair",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Alternance des fonds : elle sépare les sections sans tracer de trait. */
  fond?: "clair" | "gris" | "sombre";
}) {
  return (
    <section
      id={id}
      // `scroll-mt` compense l'en-tête collant : une ancre ne doit pas amener
      // le titre sous la barre de navigation.
      className={cn(
        "scroll-mt-20 py-20 sm:py-28",
        fond === "clair" && "bg-white",
        fond === "gris" && "bg-surface-50",
        fond === "sombre" && "bg-primary-950 text-white",
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * En-tete d'une section : surtitre, titre, phrase d'accroche.
 * Le surtitre porte la couleur d'accent — c'est la seule touche d'orange de la
 * plupart des sections, et elle suffit a rappeler la marque.
 */
export function SectionHeading({
  surtitre,
  titre,
  description,
  centre = true,
  sombre = false,
  className,
}: {
  surtitre?: string;
  titre: string;
  description?: string;
  centre?: boolean;
  sombre?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "reveal max-w-2xl",
        centre && "mx-auto text-center",
        className,
      )}
    >
      {surtitre ? (
        <p
          className={cn(
            "mb-3 text-xs font-semibold uppercase tracking-[0.18em]",
            sombre ? "text-accent-400" : "text-accent-600",
          )}
        >
          {surtitre}
        </p>
      ) : null}

      <h2
        className={cn(
          "text-3xl font-bold tracking-tight sm:text-4xl",
          sombre ? "text-white" : "text-primary-950",
        )}
      >
        {titre}
      </h2>

      {description ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed",
            sombre ? "text-primary-200" : "text-surface-600",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Carte de la vitrine.
 *
 * Bordure discrete plutot qu'ombre portee au repos : l'ombre n'apparait qu'au
 * survol, ce qui evite qu'une grille de douze cartes ne ressemble a un tas de
 * boites flottantes.
 */
export function FeatureCard({
  children,
  className,
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "reveal group rounded-2xl border border-surface-200 bg-white p-6",
        interactive &&
          "transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover",
        className,
      )}
    >
      {children}
    </div>
  );
}
