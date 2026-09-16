import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-100 text-surface-700 ring-surface-200",
  primary: "bg-primary-50 text-primary-800 ring-primary-200",
  accent: "bg-accent-50 text-accent-800 ring-accent-200",
  success: "bg-success-50 text-success-700 ring-success-500/25",
  warning: "bg-warning-50 text-warning-700 ring-warning-500/25",
  danger: "bg-danger-50 text-danger-700 ring-danger-500/25",
  info: "bg-info-50 text-info-700 ring-info-500/25",
};

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

/** Pastille de statut : contrat actif, paie validee, vente annulee... */
export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
