import { Skeleton } from "@/shared/ui/feedback";
import { Container } from "@/shared/ui/section";

/**
 * Squelette affiche pendant le chargement d'une page de la vitrine.
 *
 * Next.js enveloppe automatiquement la page (mais pas la mise en page, deja
 * a l'ecran) dans une frontiere Suspense et affiche ce composant tant que le
 * segment suivant n'est pas pret — le changement de route reste ainsi
 * immediat a l'oeil, meme quand la compilation ou le reseau prend un instant.
 *
 * La forme suit celle de `PageHero` puis d'une grille de cartes : ce n'est
 * pas la page exacte qui arrive, mais la silhouette est assez proche pour
 * qu'aucun saut ne se voie a la bascule.
 */
export default function ChargementVitrine() {
  return (
    <>
      <section className="border-b border-surface-200 bg-gradient-to-b from-primary-50/60 to-white">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl space-y-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-full max-w-xl sm:h-11" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-2/3 max-w-md" />
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-surface-200 p-6">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
