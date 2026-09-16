import { Card } from "@/shared/ui/card";
import { Skeleton, TableSkeleton } from "@/shared/ui/feedback";

/** Squelette affiche pendant le chargement de la liste des roles. */
export default function ChargementRoles() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="mb-5 h-16 w-full" />
      <Card>
        <TableSkeleton rows={5} columns={3} />
      </Card>
    </>
  );
}
