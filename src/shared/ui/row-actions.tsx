import Link from "next/link";
import { Eye, Pencil, Printer } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Actions de fin de ligne, dans une liste.
 *
 * Le nom de la fiche reste cliquable en premiere colonne — c'est la convention
 * du back-office. Cette colonne rend les autres gestes VISIBLES : jusqu'ici,
 * « modifier » supposait d'ouvrir la fiche puis de chercher le bouton, un
 * detour que rien ne justifie sur une liste de travail.
 *
 * L'icone est designee par un NOM et non passee en composant : une liste peut
 * etre rendue depuis un composant serveur, et un composant React ne traverse
 * pas la frontiere serveur/client.
 */

export type RowActionIcon = "voir" | "modifier" | "imprimer";

const ICONES = {
  voir: Eye,
  modifier: Pencil,
  imprimer: Printer,
} as const;

export interface RowAction {
  href: string;
  /** Sert d'infobulle et de nom accessible : l'icone seule ne suffit pas. */
  label: string;
  icon: RowActionIcon;
}

export function RowActions({
  actions,
  className,
}: {
  actions: RowAction[];
  className?: string;
}) {
  if (actions.length === 0) return null;

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {actions.map((action) => {
        const Icone = ICONES[action.icon];

        return (
          <Link
            key={`${action.icon}-${action.href}`}
            href={action.href}
            title={action.label}
            aria-label={action.label}
            className="flex size-8 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            <Icone className="size-4" />
          </Link>
        );
      })}
    </div>
  );
}
