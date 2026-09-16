import { Card } from "@/shared/ui/card";
import { Skeleton, TableSkeleton } from "@/shared/ui/feedback";

/**
 * Squelette affiche pendant le chargement d'une liste de ressource.
 *
 * Ce fichier couvre toutes les URL prises en charge par `[ressource]/page.tsx`
 * (contrats, ventes, caisse, stock...) : sans lui, la navigation entre ces
 * modules restait figee, sans repere visuel, jusqu'a ce que la page arrive.
 */
export default function ChargementRessource() {
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
