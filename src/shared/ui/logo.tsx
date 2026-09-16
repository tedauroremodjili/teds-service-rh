import Image from "next/image";

import { cn } from "@/shared/lib/utils";

/**
 * Marque TED'S SERVICE.
 *
 * Deux presentations :
 *  - `full`  : le logo detoure, pour la page de connexion et les documents.
 *  - `mark`  : le monogramme « TS » sur degrade, pour la barre laterale ou
 *              l'espace horizontal est compte.
 *
 * On utilise `/logo.png` et non le JPEG d'origine : ce dernier porte un fond
 * gris (#F7F7F7) qui dessinait un rectangle visible des que le logo etait pose
 * sur autre chose que ce gris. Le PNG a un fond transparent et est recadre au
 * plus juste, ce qui le rend posable sur n'importe quel arriere-plan.
 */

/** Dimensions reelles du fichier, pour eviter tout decalage au chargement. */
const LOGO_WIDTH = 378;
const LOGO_HEIGHT = 142;

export function Logo({
  variant = "full",
  className,
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tracking-tight text-white shadow-sm bg-brand-gradient",
          className,
        )}
      >
        TS
      </span>
    );
  }

  return (
    <Image
      src="/logo.png"
      alt="TED'S SERVICE — Learning & Tech Solutions"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority
      className={cn("h-auto w-full max-w-[240px] object-contain", className)}
    />
  );
}

/** Nom de la marque en texte, avec la bichromie du logo. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-extrabold tracking-tight", className)}>
      <span className="text-primary-900">TED&apos;S</span>{" "}
      <span className="text-accent-500">SERVICE</span>
    </span>
  );
}

/** Variante claire, pour un fond bleu fonce (barre laterale). */
export function WordmarkLight({ className }: { className?: string }) {
  return (
    <span className={cn("font-extrabold tracking-tight", className)}>
      <span className="text-white">TED&apos;S</span>{" "}
      <span className="text-accent-400">SERVICE</span>
    </span>
  );
}
