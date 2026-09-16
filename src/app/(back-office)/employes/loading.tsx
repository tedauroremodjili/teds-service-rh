import { Card } from "@/shared/ui/card";
import { Skeleton, TableSkeleton } from "@/shared/ui/feedback";

/**
 * Squelette affiche pendant le chargement de la liste.
 *
 * Next.js enveloppe automatiquement la page dans une frontiere Suspense et
 * affiche ce composant tant que les donnees ne sont pas pretes. La navigation
 * reste donc instantanee, meme si la requete est lente.
 */
export default function ChargementEmployes() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Card>
        <div className="border-b border-surface-200 px-5 py-4">
          <Skeleton className="h-10 w-full max-w-2xl" />
        </div>
        <TableSkeleton rows={8} columns={6} />
      </Card>
    </>
  );
}
