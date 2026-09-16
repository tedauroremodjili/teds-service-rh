import { Container } from "@/shared/ui/section";

/**
 * Bandeau d'ouverture des pages intérieures de la vitrine.
 *
 * Il joue le rôle que tenait le titre de section dans la page unique : dire où
 * l'on est, avant tout contenu. Le fond dégradé très clair sépare l'en-tête du
 * corps de page sans tracer de filet, et le halo d'accent rappelle la marque
 * sans occuper le premier plan.
 */
export function PageHero({
  surtitre,
  titre,
  description,
}: {
  surtitre: string;
  titre: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-surface-200 bg-gradient-to-b from-primary-50/60 to-white">
      <div
        aria-hidden
        className="halo-float pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-accent-100/40 blur-3xl"
      />

      <Container className="relative py-14 sm:py-20">
        <div className="page-enter max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
            {surtitre}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-primary-950 sm:text-4xl lg:text-5xl">
            {titre}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-surface-600 sm:text-lg">
            {description}
          </p>
        </div>
      </Container>
    </section>
  );
}
