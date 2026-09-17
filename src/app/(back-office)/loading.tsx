import { Card } from "@/shared/ui/card";
import { Skeleton, TableSkeleton } from "@/shared/ui/feedback";

/**
 * Squelette de repli pour tout le back-office.
 *
 * Une bonne moitie des ecrans (les pages « synthese » : /apprenants/synthese,
 * /ventes/synthese, /caisse/synthese...) n'avaient AUCUN squelette dedie —
 * seules quelques pages tres frequentees en avaient un. Resultat : cliquer un
 * lien vers l'une d'elles ne montrait rien avant que la page entiere ne soit
 * prete, ce qui se lit comme une application figee plutot que comme un
 * chargement en cours.
 *
 * Ce fichier vit a la racine du groupe (back-office) : Next.js l'utilise pour
 * TOUT ecran qui n'a pas son propre `loading.tsx` plus proche (tableau de
 * bord, listes de ressources et quelques autres gardent le leur, plus
 * specifique). Une seule page generique vaut mieux que quatorze copies
 * presque identiques.
 */
export default function ChargementBackOffice() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-surface-200 px-5 py-4">
          <Skeleton className="h-10 w-full max-w-2xl" />
        </div>
        <TableSkeleton rows={6} columns={5} />
      </Card>
    </>
  );
}
