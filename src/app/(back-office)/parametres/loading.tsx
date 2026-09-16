import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/feedback";

/** Squelette affiche pendant le chargement des parametres. */
export default function ChargementParametres() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="mb-6 space-y-4 p-5">
          <Skeleton className="h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}
    </>
  );
}
