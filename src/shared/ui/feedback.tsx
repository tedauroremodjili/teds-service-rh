import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/* -------------------------------------------------------------------------- */
/* Alertes                                                                     */
/* -------------------------------------------------------------------------- */

export type AlertTone = "success" | "warning" | "danger" | "info";

const ALERT_TONES: Record<AlertTone, { box: string; icon: ReactNode }> = {
  success: {
    box: "border-success-500/30 bg-success-50 text-success-700",
    icon: <CheckCircle2 className="size-5 shrink-0" />,
  },
  warning: {
    box: "border-warning-500/30 bg-warning-50 text-warning-700",
    icon: <AlertTriangle className="size-5 shrink-0" />,
  },
  danger: {
    box: "border-danger-500/30 bg-danger-50 text-danger-700",
    icon: <XCircle className="size-5 shrink-0" />,
  },
  info: {
    box: "border-info-500/30 bg-info-50 text-info-700",
    icon: <Info className="size-5 shrink-0" />,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { box, icon } = ALERT_TONES[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}
    >
      {icon}
      <div className="space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Etat vide                                                                   */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-400 [&_svg]:size-7">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-surface-700">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-surface-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Squelettes de chargement (utilises par les fichiers loading.tsx)            */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-200", className)} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-5 flex-1", columnIndex === 0 && "max-w-[220px]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
