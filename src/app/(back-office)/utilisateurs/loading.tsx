import { Card } from "@/shared/ui/card";
import { Skeleton, TableSkeleton } from "@/shared/ui/feedback";

/** Squelette affiche pendant le chargement de la liste des comptes. */
export default function ChargementUtilisateurs() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
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
