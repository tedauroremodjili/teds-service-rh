import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-surface-200 bg-white shadow-card",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, icon, className }: CardHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 border-b border-surface-200 px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold text-surface-800">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-surface-500">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-3 border-t border-surface-200 bg-surface-50 px-5 py-3",
        className,
      )}
    >
      {children}
    </footer>
  );
}
