/**
 * Noms d'icones autorises pour les modules, arguments et etapes de la
 * vitrine — une liste fermee de chaines, sans dependance a React ni a
 * Lucide.
 *
 * Fichier de DOMAINE : le catalogue de ressources (`modules/resources/domain
 * /catalog.ts`) s'en sert pour proposer un `<select>` ; la couche
 * presentation (`modules/landing/presentation/landing-icons.ts`) s'en sert
 * pour traduire le nom choisi en composant Lucide reel. Les deux listes
 * doivent rester identiques — elle n'existe qu'ici.
 */
export const LANDING_ICON_NAMES = [
  "BadgeCheck",
  "Banknote",
  "BarChart3",
  "Boxes",
  "CalendarClock",
  "Coins",
  "FileSignature",
  "FileText",
  "GraduationCap",
  "LayoutDashboard",
  "Percent",
  "Printer",
  "Receipt",
  "ScrollText",
  "ShieldCheck",
  "ShoppingCart",
  "Smartphone",
  "TrendingUp",
  "Users",
  "Wallet",
] as const;

export type LandingIconName = (typeof LANDING_ICON_NAMES)[number];
