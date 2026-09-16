import { formatMoney, formatPercent } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";

import type { Activite, RegleRemuneration } from "../domain/rule";

/**
 * Resume compact du bareme, pour une colonne de liste.
 *
 * Une regle se lit « 10 % · Formation » ou « 1 000 FCFA · Document » : le
 * taux collé a l'activite qu'il remunere, plutot que le taux generique isole
 * qu'affichait la fiche employe avant que le bareme par activite n'existe.
 * Au dela de deux regles, le detail complet reste a une ligne raisonnable —
 * il vit sur l'ecran « Rémunération » de l'employe, pas dans la liste.
 *
 * `fallbackRate` couvre les employes qui n'ont pas encore de bareme : ils
 * continuent de montrer leur taux de commission generique, pour ne rien
 * cacher de ce qui existait avant.
 */
export function CommissionSummary({
  regles,
  fallbackRate,
}: {
  regles: RegleRemuneration[];
  fallbackRate?: number;
}) {
  if (regles.length === 0) {
    return fallbackRate && fallbackRate > 0 ? (
      <span className="text-surface-700">{formatPercent(fallbackRate)}</span>
    ) : (
      <span className="text-surface-400">—</span>
    );
  }

  const MAX_VISIBLE = 2;
  const visibles = regles.slice(0, MAX_VISIBLE);
  const reste = regles.length - visibles.length;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {visibles.map((regle) => (
        <Badge key={regle.id} tone="accent" className="whitespace-nowrap">
          {calculCourt(regle)} · {ACTIVITE_COURTE[regle.activity]}
        </Badge>
      ))}
      {reste > 0 ? <Badge tone="neutral">+{reste}</Badge> : null}
    </div>
  );
}

const ACTIVITE_COURTE: Record<Activite, string> = {
  FRAIS_INSCRIPTION: "Inscription",
  FRAIS_FORMATION: "Formation",
  VENTE_DOCUMENT: "Document",
  PRESTATION: "Prestation",
};

function calculCourt(regle: Pick<RegleRemuneration, "mode" | "rate" | "fixedAmount">): string {
  return regle.mode === "POURCENTAGE"
    ? formatPercent(regle.rate ?? 0)
    : formatMoney(regle.fixedAmount ?? 0);
}
