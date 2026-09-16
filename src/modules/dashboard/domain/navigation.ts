import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BookOpen,
  Boxes,
  Briefcase,
  BadgeCheck,
  Building2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Cog,
  CreditCard,
  FileSignature,
  FileText,
  Gauge,
  GraduationCap,
  HelpCircle,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Landmark,
  ListOrdered,
  PackageOpen,
  Percent,
  PieChart,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from "lucide-react";

import { PERMISSIONS, type Permission } from "@/modules/auth/domain/permissions";

/**
 * Arborescence de navigation du back-office.
 *
 * Elle couvre les 17 modules du cahier des charges. Chaque entree porte la
 * permission qui la conditionne : la barre laterale se construit a partir des
 * droits de l'utilisateur, si bien qu'un commercial ne voit jamais le menu
 * « Comptabilite ».
 *
 * Masquer un lien n'est pas une securite — c'est du confort. Le controle reel
 * est fait par le DAL sur chaque page.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission requise ; absente = visible par tout utilisateur connecte. */
  permission?: Permission;
  /** Modules pas encore developpes : le lien est affiche mais signale. */
  planned?: boolean;
}

export interface NavGroup {
  title: string;
  /** Icone de la categorie, affichee dans le rail de gauche. */
  icon: LucideIcon;
  /** Phrase courte affichee en tete du panneau de la categorie. */
  description: string;
  items: NavItem[];
}

const P = PERMISSIONS;

export const NAVIGATION: NavGroup[] = [
  {
    title: "Pilotage",
    icon: Gauge,
    description: "Vue d'ensemble et rapports",
    items: [
      { label: "Tableau de bord", href: "/tableau-de-bord", icon: LayoutDashboard },
      {
        label: "Rapports",
        href: "/rapports",
        icon: PieChart,
        permission: P.REPORTS_VIEW,
      },
    ],
  },
  {
    title: "Ressources humaines",
    icon: UsersRound,
    description: "Personnel, contrats et paie",
    items: [
      { label: "Employés", href: "/employes", icon: Users, permission: P.EMPLOYEES_READ },
      {
        label: "Contrats",
        href: "/contrats",
        icon: FileSignature,
        permission: P.CONTRACTS_READ,
      },
      {
        label: "Présences",
        href: "/presences",
        icon: CalendarClock,
        permission: P.ATTENDANCE_READ,
      },
      {
        label: "Congés",
        href: "/conges",
        icon: CalendarDays,
        permission: P.LEAVES_READ,
      },
      {
        label: "Salaires",
        href: "/salaires",
        icon: Banknote,
        permission: P.PAYROLL_READ,
      },
      {
        label: "Rémunérations",
        href: "/remunerations",
        icon: Scale,
        permission: P.PAYROLL_READ,
      },
      {
        label: "Commissions",
        href: "/commissions",
        icon: Percent,
        permission: P.COMMISSIONS_READ,
      },
      {
        label: "Règles de commission",
        href: "/regles-commission",
        icon: Percent,
        permission: P.COMMISSIONS_READ,
      },
      {
        label: "Départements",
        href: "/departements",
        icon: Building2,
        permission: P.EMPLOYEES_READ,
      },
      {
        label: "Postes",
        href: "/postes",
        icon: IdCard,
        permission: P.EMPLOYEES_READ,
      },
    ],
  },
  {
    title: "Activité commerciale",
    icon: Store,
    description: "Ventes de documents et prestations",
    items: [
      {
        label: "Ventes",
        href: "/ventes",
        icon: ShoppingCart,
        permission: P.SALES_READ,
      },
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
        permission: P.SALES_READ,
      },
      {
        label: "Prestations",
        href: "/prestations",
        icon: Briefcase,
        permission: P.SALES_READ,
      },
      {
        label: "Catalogue prestations",
        href: "/catalogue-prestations",
        icon: Wrench,
        permission: P.SALES_READ,
      },
    ],
  },
  {
    title: "Formation",
    icon: GraduationCap,
    description: "Sessions, apprenants et certificats",
    items: [
      {
        label: "Formations",
        href: "/formations",
        icon: BookOpen,
        permission: P.TRAININGS_READ,
      },
      {
        label: "Apprenants",
        href: "/apprenants",
        icon: GraduationCap,
        permission: P.STUDENTS_READ,
      },
      {
        label: "Inscriptions",
        href: "/inscriptions",
        icon: ClipboardList,
        permission: P.STUDENTS_READ,
      },
      {
        label: "Notes",
        href: "/notes",
        icon: ClipboardCheck,
        permission: P.STUDENTS_READ,
      },
      {
        label: "Certificats",
        href: "/certificats",
        icon: BadgeCheck,
        permission: P.TRAININGS_READ,
      },
    ],
  },
  {
    title: "Finances",
    icon: Landmark,
    description: "Caisse, comptabilité et stock",
    items: [
      { label: "Caisse", href: "/caisse", icon: Wallet, permission: P.CASH_READ },
      {
        label: "Paiements",
        href: "/paiements",
        icon: CreditCard,
        permission: P.CASH_READ,
      },
      {
        label: "Comptabilité",
        href: "/comptabilite",
        icon: ScrollText,
        permission: P.ACCOUNTING_READ,
      },
      {
        label: "Dépenses",
        href: "/depenses",
        icon: TrendingDown,
        permission: P.ACCOUNTING_READ,
      },
      {
        label: "Recettes",
        href: "/recettes",
        icon: TrendingUp,
        permission: P.ACCOUNTING_READ,
      },
      {
        label: "Stock",
        href: "/stock",
        icon: Boxes,
        permission: P.INVENTORY_READ,
      },
      {
        label: "Mouvements de stock",
        href: "/mouvements-stock",
        icon: PackageOpen,
        permission: P.INVENTORY_READ,
      },
    ],
  },
  {
    title: "Administration",
    icon: Cog,
    description: "Comptes, droits et paramètres",
    items: [
      {
        label: "Utilisateurs",
        href: "/utilisateurs",
        icon: ShieldCheck,
        permission: P.USERS_READ,
      },
      {
        label: "Rôles et permissions",
        href: "/roles",
        icon: KeyRound,
        permission: P.USERS_READ,
      },
      {
        label: "Paramètres",
        href: "/parametres",
        icon: Settings,
        permission: P.SETTINGS_READ,
      },
      {
        label: "FAQ vitrine",
        href: "/faq",
        icon: HelpCircle,
        permission: P.LANDING_READ,
      },
      {
        label: "Modules vitrine",
        href: "/modules-vitrine",
        icon: LayoutGrid,
        permission: P.LANDING_READ,
      },
      {
        label: "Arguments vitrine",
        href: "/arguments-vitrine",
        icon: Sparkles,
        permission: P.LANDING_READ,
      },
      {
        label: "Étapes vitrine",
        href: "/etapes-vitrine",
        icon: ListOrdered,
        permission: P.LANDING_READ,
      },
    ],
  },
];

/** Ne conserve que les entrees autorisees, et supprime les groupes vides. */
export function visibleNavigation(permissions: readonly string[]): NavGroup[] {
  const isGranted = (permission?: Permission) =>
    !permission || permissions.includes("*") || permissions.includes(permission);

  return NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => isGranted(item.permission)),
  })).filter((group) => group.items.length > 0);
}
