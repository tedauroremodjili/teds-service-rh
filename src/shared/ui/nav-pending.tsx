"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Icone de navigation qui bascule sur un chargement anime tant que le clic
 * n'a pas abouti a une navigation effective.
 *
 * En developpement, une route pas encore compilee peut prendre plusieurs
 * secondes a repondre ; sans repere visuel, cliquer un onglet donnait
 * l'impression que rien ne se passait. `useLinkStatus` lit cet etat, mais ne
 * fonctionne QUE rendu comme descendant d'un <Link> — c'est de la qu'il tire
 * l'information.
 */
export function NavIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  const { pending } = useLinkStatus();

  if (pending) {
    return <Loader2 className={cn(className, "animate-spin")} />;
  }

  return <Icon className={className} />;
}

/**
 * Repere discret pour les liens sans icone (menu de la vitrine) : un point
 * qui prend vie tant que la navigation est en attente. L'espace est toujours
 * reserve (le point existe, transparent) pour ne jamais decaler le texte.
 */
export function PendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={cn(
        "ml-1.5 inline-block size-1.5 rounded-full bg-current align-middle opacity-0 transition-opacity",
        pending && "motion-safe:animate-pulse opacity-60",
        className,
      )}
    />
  );
}
