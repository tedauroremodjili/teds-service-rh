import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { formatNumber } from "@/shared/lib/format";

/**
 * Pagination par liens : chaque page est une vraie URL. C'est un choix
 * deliberé — l'etat de la liste reste partageable, remonte dans l'historique du
 * navigateur, et la page peut etre rendue cote serveur sans JavaScript.
 */
export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  searchParams = {},
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  /** Filtres courants a conserver dans les liens (recherche, statut...). */
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return (
      <p className="px-5 py-3 text-xs text-surface-500">
        {formatNumber(total)} résultat{total > 1 ? "s" : ""}
      </p>
    );
  }

  const buildHref = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `${basePath}?${params.toString()}`;
  };

  // Fenetre glissante de 5 pages autour de la page courante.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  const linkStyle =
    "inline-flex size-8 items-center justify-center rounded-md border border-surface-200 text-xs font-medium transition-colors";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 px-5 py-3"
    >
      <p className="text-xs text-surface-500">
        Page {page} sur {totalPages} — {formatNumber(total)} résultat{total > 1 ? "s" : ""}
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            aria-label="Page précédente"
            className={cn(linkStyle, "bg-white text-surface-600 hover:bg-surface-50")}
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span className={cn(linkStyle, "cursor-not-allowed bg-surface-50 text-surface-300")}>
            <ChevronLeft className="size-4" />
          </span>
        )}

        {pages.map((target) => (
          <Link
            key={target}
            href={buildHref(target)}
            aria-current={target === page ? "page" : undefined}
            className={cn(
              linkStyle,
              target === page
                ? "border-primary-700 bg-primary-700 text-white"
                : "bg-white text-surface-600 hover:bg-surface-50",
            )}
          >
            {target}
          </Link>
        ))}

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            aria-label="Page suivante"
            className={cn(linkStyle, "bg-white text-surface-600 hover:bg-surface-50")}
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className={cn(linkStyle, "cursor-not-allowed bg-surface-50 text-surface-300")}>
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
