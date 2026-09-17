"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Globe, LogOut, Menu, Printer, X } from "lucide-react";

import { ROLE_LABELS } from "@/modules/auth/domain/permissions";
import type { CurrentUser } from "@/modules/auth/domain/session";
import { visibleNavigation, type NavGroup } from "@/modules/dashboard/domain/navigation";
import { cn } from "@/shared/lib/utils";
import { initialsFromName } from "@/shared/lib/format";
import { WordmarkLight } from "@/shared/ui/logo";
import { NavIcon } from "@/shared/ui/nav-pending";

/**
 * Coquille du back-office : rail de categories, panneau de fonctionnalites,
 * en-tete et zone de contenu.
 *
 * L'ERP compte 17 modules. Les empiler dans une seule colonne obligeait a
 * faire defiler la barre laterale pour atteindre « Parametres ». La navigation
 * est donc a DEUX niveaux :
 *
 *   1. un rail etroit, une icone par categorie — toujours entierement visible ;
 *   2. un panneau qui detaille la categorie choisie, et qui se replie.
 *
 * Replie, l'application gagne 232 px de largeur utile : appreciable sur les
 * grands tableaux (liste des employes, journal de caisse).
 *
 * Composant CLIENT, pour trois raisons precises : `usePathname()` marque
 * l'entree active, le panneau a un etat local, et le tiroir mobile aussi. Le
 * contenu des pages (`children`) reste rendu sur le SERVEUR — React l'insere
 * ici deja transforme, ce qui preserve l'acces direct a la base dans les pages.
 */

const CLE_PANNEAU = "teds.sidebar.panneau";
const EVENEMENT_PANNEAU = "teds:panneau";

/**
 * Etat « panneau deplie », conserve dans localStorage.
 *
 * `localStorage` est un systeme exterieur a React : on le lit avec
 * `useSyncExternalStore`, l'API prevue pour cela. Le serveur ne connaissant pas
 * le stockage du navigateur, `getServerSnapshot` renvoie l'etat par defaut
 * (deplie) ; React reconcilie ensuite avec la valeur reelle, sans ecart
 * d'hydratation et sans mise a jour d'etat dans un effet.
 */
const panneauStore = {
  subscribe(onChange: () => void) {
    window.addEventListener(EVENEMENT_PANNEAU, onChange);
    // `storage` couvre le cas de deux onglets ouverts sur l'application.
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENEMENT_PANNEAU, onChange);
      window.removeEventListener("storage", onChange);
    };
  },
  getSnapshot() {
    return window.localStorage.getItem(CLE_PANNEAU) !== "ferme";
  },
  getServerSnapshot() {
    return true;
  },
  set(ouvert: boolean) {
    window.localStorage.setItem(CLE_PANNEAU, ouvert ? "ouvert" : "ferme");
    window.dispatchEvent(new Event(EVENEMENT_PANNEAU));
  },
};

export function AppShell({
  user,
  logoUrl,
  logoutAction,
  printLetterhead,
  children,
}: {
  user: CurrentUser;
  /** Logo de l'entreprise (parametres), affiche dans la barre laterale. */
  logoUrl: string;
  logoutAction: () => Promise<void>;
  /**
   * Papier a en-tete insere au-dessus du contenu, visible a la seule
   * impression. Il donne un emetteur, une date et une reference a TOUTE page
   * imprimee — un tableau de bord, une synthese, un ecran de parametres — et
   * pas uniquement aux pieces dediees de /impression.
   *
   * Il est rendu sur le SERVEUR (il lit les parametres de l'entreprise) et
   * transmis ici en prop : React insere l'element deja peint, la coquille
   * cliente n'a pas a connaitre la base.
   */
  printLetterhead?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const groups = visibleNavigation(user.permissions);

  const [mobileOpen, setMobileOpen] = useState(false);

  const panelOpen = useSyncExternalStore(
    panneauStore.subscribe,
    panneauStore.getSnapshot,
    panneauStore.getServerSnapshot,
  );

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  /** Categorie a laquelle appartient la page courante. */
  const groupeDeLaPage =
    groups.find((group) => group.items.some((item) => isActive(item.href)))?.title ?? null;

  const [selected, setSelected] = useState<string | null>(groupeDeLaPage);
  const [dernierGroupeVu, setDernierGroupeVu] = useState<string | null>(groupeDeLaPage);

  // La navigation fait autorite : ouvrir une page replace le panneau sur la
  // categorie correspondante, meme si l'utilisateur en explorait une autre.
  //
  // L'ajustement se fait PENDANT le rendu, pas dans un effet : React repart
  // aussitot pour un second rendu, sans jamais peindre l'etat intermediaire.
  // Un effet, lui, provoquerait un affichage puis une correction visible.
  if (groupeDeLaPage && groupeDeLaPage !== dernierGroupeVu) {
    setDernierGroupeVu(groupeDeLaPage);
    setSelected(groupeDeLaPage);
  }

  const togglePanel = (ouvert: boolean) => panneauStore.set(ouvert);

  const groupeActif = groups.find((group) => group.title === selected) ?? groups[0];

  const naviguer = () => setMobileOpen(false);

  const navigation = (
    <div className="flex h-full">
      <CategoryRail
        groups={groups}
        activeTitle={groupeActif?.title}
        user={user}
        logoUrl={logoUrl}
        logoutAction={logoutAction}
        onSelect={(title) => {
          // Recliquer sur la categorie deja ouverte replie le panneau :
          // le rail devient un interrupteur, sans bouton supplementaire.
          if (title === groupeActif?.title && panelOpen) {
            togglePanel(false);
          } else {
            setSelected(title);
            togglePanel(true);
          }
        }}
      />

      {panelOpen && groupeActif ? (
        <CategoryPanel
          group={groupeActif}
          user={user}
          logoUrl={logoUrl}
          logoutAction={logoutAction}
          isActive={isActive}
          onNavigate={naviguer}
          onCollapse={() => togglePanel(false)}
        />
      ) : null}
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface-100">
      {/* --- Navigation fixe, ecrans larges --------------------------------- */}
      <div className="no-print fixed inset-y-0 left-0 z-40 hidden shadow-sidebar lg:block">
        {navigation}
      </div>

      {/* --- Tiroir mobile -------------------------------------------------- */}
      {mobileOpen ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-primary-950/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 shadow-xl">{navigation}</div>
        </div>
      ) : null}

      <div
        // `data-app-shell` sert de prise a la feuille de style d'impression :
        // c'est ce conteneur qui porte la gouttiere de navigation, et elle doit
        // retomber a zero sur le papier (voir globals.css).
        data-app-shell
        className={cn(
          "flex min-h-dvh min-w-0 flex-col transition-[padding] duration-200",
          panelOpen ? "lg:pl-[19rem]" : "lg:pl-[4.5rem]",
        )}
      >
        <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-surface-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            className="flex size-10 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-100 lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Rouvrir le panneau quand il est replie. */}
          {!panelOpen ? (
            <button
              type="button"
              onClick={() => togglePanel(true)}
              aria-label="Déplier le menu"
              title="Déplier le menu"
              className="hidden size-10 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-100 lg:flex"
            >
              <ChevronRight className="size-5" />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary-900">
              {groupeActif?.title ?? "Espace de gestion"}
            </p>
            <p className="truncate text-xs text-surface-500">
              {ROLE_LABELS[user.role]} — {user.email}
            </p>
          </div>

          {/* Retour a la vitrine publique. Un nouvel onglet : quitter la page
              en cours ferait perdre une saisie en route, et l'espace de
              gestion et la vitrine restent deux univers distincts a l'usage,
              meme s'ils partagent la meme application. */}
          <Link
            href="/"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Voir le site public"
            title="Voir le site public"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-100 hover:text-primary-800"
          >
            <Globe className="size-5" />
          </Link>

          {/* Imprimer la page courante. Il ne remplace pas les pieces dediees
              de /impression, mais rend imprimable ce qui n'en a pas : une
              synthese, un tableau de bord, un ecran de parametres. */}
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Imprimer cette page"
            title="Imprimer cette page"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-100 hover:text-primary-800"
          >
            <Printer className="size-5" />
          </button>

          <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white sm:flex">
            {initialsFromName(user.displayName)}
          </span>
        </header>

        <main data-app-content className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {printLetterhead}
          {children}
        </main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Niveau 1 — rail des categories                                              */
/* -------------------------------------------------------------------------- */

function CategoryRail({
  groups,
  activeTitle,
  user,
  logoUrl,
  logoutAction,
  onSelect,
}: {
  groups: NavGroup[];
  activeTitle?: string;
  user: CurrentUser;
  logoUrl: string;
  logoutAction: () => Promise<void>;
  onSelect: (title: string) => void;
}) {
  return (
    <nav
      aria-label="Catégories"
      className="flex h-full w-18 shrink-0 flex-col items-center border-r border-white/10 bg-primary-950 py-3"
    >
      <Link
        href="/tableau-de-bord"
        aria-label="Tableau de bord"
        className="mb-3 flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/95 p-1.5 shadow-sm"
      >
        <Image
          src={logoUrl}
          alt=""
          width={378}
          height={142}
          unoptimized
          className="h-full w-full object-contain"
        />
      </Link>

      <ul className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
        {groups.map((group) => {
          const Icon = group.icon;
          const active = group.title === activeTitle;

          return (
            <li key={group.title}>
              <button
                type="button"
                onClick={() => onSelect(group.title)}
                title={group.title}
                aria-label={group.title}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-primary-300 hover:bg-white/10 hover:text-white",
                )}
              >
                {/* Repere vertical : la categorie active se lit d'un coup d'oeil. */}
                {active ? (
                  <span className="absolute -left-3 h-7 w-1 rounded-r-full bg-accent-500" />
                ) : null}
                <Icon className="size-5.5" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-col items-center gap-1 border-t border-white/10 pt-3">
        <span
          title={`${user.displayName} — ${ROLE_LABELS[user.role]}`}
          className="flex size-9 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white"
        >
          {initialsFromName(user.displayName)}
        </span>

        <form action={logoutAction}>
          <button
            type="submit"
            title="Déconnexion"
            aria-label="Déconnexion"
            className="flex size-10 items-center justify-center rounded-xl text-primary-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-5" />
          </button>
        </form>
      </div>
    </nav>
  );
}

/* -------------------------------------------------------------------------- */
/* Niveau 2 — panneau de la categorie                                          */
/* -------------------------------------------------------------------------- */

function CategoryPanel({
  group,
  user,
  logoUrl,
  logoutAction,
  isActive,
  onNavigate,
  onCollapse,
}: {
  group: NavGroup;
  user: CurrentUser;
  logoUrl: string;
  logoutAction: () => Promise<void>;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="flex h-full w-58 shrink-0 flex-col bg-brand-gradient">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/95 p-1 shadow-sm">
            <Image
              src={logoUrl}
              alt=""
              width={378}
              height={142}
              unoptimized
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <WordmarkLight className="block truncate text-sm" />
            <p className="truncate text-[0.6rem] uppercase tracking-[0.15em] text-primary-300">
              Learning &amp; Tech
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCollapse}
          aria-label="Replier le menu"
          title="Replier le menu"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-primary-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      <div className="px-4 pb-2 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">
          {group.title}
        </p>
        <p className="mt-0.5 text-[0.7rem] leading-snug text-primary-200">
          {group.description}
        </p>
      </div>

      <nav aria-label={group.title} className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/15 font-semibold text-white"
                      : "text-primary-100 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <NavIcon
                    icon={Icon}
                    className={cn(
                      "size-4.5 shrink-0",
                      active
                        ? "text-accent-400"
                        : "text-primary-300 group-hover:text-accent-400",
                    )}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.planned ? (
                    <span
                      title="Module à venir"
                      className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[0.6rem] font-medium text-primary-200"
                    >
                      bientôt
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">
            {initialsFromName(user.displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.displayName}</p>
            <p className="truncate text-xs text-primary-200">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4.5 shrink-0" />
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}
