import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind en resolvant les conflits.
 * `cn("px-2", "px-4")` donne "px-4" — indispensable pour que les props
 * `className` passees aux composants puissent surcharger leur style par defaut.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
