import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/feedback";

/** Squelette affiche pendant le chargement du tableau de bord. */
export default function ChargementTableauDeBord() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <Skeleton className="mb-4 h-5 w-56" />
        <Skeleton className="h-56 w-full" />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <Skeleton className="mb-4 h-5 w-48" />
          <Skeleton className="h-48 w-full" />
        </Card>
        <Card className="p-5">
          <Skeleton className="mb-4 h-5 w-48" />
          <Skeleton className="h-48 w-full" />
        </Card>
      </div>
    </>
  );
}
