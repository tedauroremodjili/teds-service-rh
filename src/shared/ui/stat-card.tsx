import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Sparkline } from "@/shared/ui/charts/sparkline";

export type StatTone = "primary" | "accent" | "success" | "danger" | "info";

const TONES: Record<StatTone, string> = {
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-600",
  success: "bg-success-50 text-success-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-700",
};

/** Couleur du point courant de la sparkline, accordee au ton de la tuile. */
const TONES_TRACE: Record<StatTone, string> = {
  primary: "#2b7cc9",
  accent: "#f07d1a",
  success: "#008300",
  danger: "#e34948",
  info: "#2b7cc9",
};

/**
 * Tuile de statistique du tableau de bord (module 15).
 * La valeur est l'element dominant ; l'icone et la variation restent secondaires
 * pour ne pas concurrencer le chiffre.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  trend,
  href,
  sparkline,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
  /** Variation en pourcentage par rapport a la periode precedente. */
  trend?: number;
  href?: string;
  /**
   * Douze derniers points de la serie. La sparkline ne donne pas de valeur :
   * elle donne une forme, et laisse le chiffre porter la precision.
   */
  sparkline?: number[];
}) {
  const content = (
    <div
      className={cn(
        "h-full rounded-xl border border-surface-200 bg-white p-5 shadow-card transition-shadow",
        href && "hover:shadow-card-hover",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-surface-500">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4.5",
              TONES[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        {/*
          Chiffres proportionnels, pas tabulaires : a cette taille, `tabular-nums`
          espace exagerement les chiffres etroits. L'alignement vertical n'est
          utile qu'en colonne de tableau.
        */}
        <p className="text-2xl font-bold tracking-tight text-primary-900">{value}</p>
        {sparkline && sparkline.length > 1 ? (
          <Sparkline
            values={sparkline}
            couleur={TONES_TRACE[tone]}
            ariaLabel={`Tendance de « ${label} » sur les douze derniers mois`}
          />
        ) : null}
      </div>

      <div className="mt-1 flex items-center gap-2">
        {typeof trend === "number" ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              trend >= 0 ? "text-success-700" : "text-danger-700",
            )}
          >
            {trend >= 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(trend).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
          </span>
        ) : null}
        {hint ? <p className="text-xs text-surface-500">{hint}</p> : null}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
