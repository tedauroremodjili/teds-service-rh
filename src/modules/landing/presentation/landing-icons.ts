import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  CalendarClock,
  Coins,
  FileSignature,
  FileText,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Percent,
  Printer,
  Receipt,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import type { LandingIconName } from "../domain/icon-names";

/**
 * Icones autorisees pour les modules, arguments et etapes de la vitrine.
 *
 * Les ecrans d'administration (`modules-vitrine`, `arguments-vitrine`,
 * `etapes-vitrine`) stockent le NOM de l'icone, jamais un composant — un champ
 * `icon` ne peut porter que du texte serialisable (voir
 * `domain/icon-names.ts`, qui liste les noms autorises). Ce fichier est le
 * seul endroit qui traduit ce nom en composant Lucide, pour l'affichage
 * public.
 */
const LANDING_ICONS: Record<LandingIconName, LucideIcon> = {
  BadgeCheck,
  Banknote,
  BarChart3,
  Boxes,
  CalendarClock,
  Coins,
  FileSignature,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Percent,
  Printer,
  Receipt,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
};

/** Composant a afficher pour un nom d'icone — repli neutre si le nom est inconnu. */
export function landingIcon(nom: string): LucideIcon {
  return LANDING_ICONS[nom as LandingIconName] ?? BadgeCheck;
}
