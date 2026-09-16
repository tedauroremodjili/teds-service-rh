"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { Logo } from "@/shared/ui/logo";
import { PendingHint } from "@/shared/ui/nav-pending";
import { Container } from "@/shared/ui/section";

import { PAGES_VITRINE } from "../domain/content";

/**
 * En-tete de la vitrine.
 *
 * Composant CLIENT pour deux raisons : le menu deroulant sur mobile a un etat,
 * et `usePathname()` marque l'onglet courant. Depuis que chaque sujet a sa
 * page, cette marque n'est plus un ornement — c'est ce qui dit ou l'on se
 * trouve.
 *
 * `connecte` vient du layout, qui lit la session sans l'exiger. Un visiteur
 * deja connecte voit « Ouvrir l'application » plutot que « Se connecter » : on
 * ne le redirige pas de force, car il doit pouvoir montrer ces pages a un
 * client sans quitter sa session.
 */
export function SiteHeader({ connecte }: { connecte: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();

  const lienPrincipal = connecte
    ? { href: "/tableau-de-bord", libelle: "Ouvrir l'application" }
    : { href: "/connexion", libelle: "Se connecter" };

  const estActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200/80 bg-white/85 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center transition-transform duration-300 hover:scale-105"
            aria-label="TED'S SERVICE ERP"
          >
            <Logo className="max-w-[132px] sm:max-w-[140px]" />
          </Link>

          {/* Le menu complet apparait a partir de 1024 px : en dessous, cinq
              onglets plus le bouton d'action ne tiennent pas sans se serrer. */}
          <nav aria-label="Pages" className="hidden items-center gap-0.5 lg:flex">
            {PAGES_VITRINE.map((page) => {
              const active = estActive(page.href);

              return (
                <Link
                  key={page.href}
                  href={page.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "font-medium text-primary-900"
                      : "text-surface-600 hover:bg-surface-100 hover:text-primary-900",
                  )}
                >
                  {page.libelle}
                  <PendingHint />
                  {/* Soulignement de l'onglet courant : discret, mais net. */}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent-500" />
                  ) : (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 origin-left scale-x-0 rounded-full bg-primary-300 transition-transform duration-300 group-hover:scale-x-100" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={lienPrincipal.href}
              className={cn(buttonStyles("primary", "md"), "hidden sm:inline-flex")}
            >
              <span className="hidden md:inline">{lienPrincipal.libelle}</span>
              <span className="md:hidden">{connecte ? "Ouvrir" : "Connexion"}</span>
              <ArrowRight className="size-4" />
            </Link>

            <button
              type="button"
              onClick={() => setOuvert((etat) => !etat)}
              aria-expanded={ouvert}
              aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
              className="flex size-10 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-100 lg:hidden"
            >
              {ouvert ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </Container>

      {/* Grille a une seule ligne dont la hauteur (`fr`) s'anime : la methode
          CSS courante pour un depli fluide sans mesurer le contenu en JS. Le
          contenu reste monte tant que le panneau n'est pas entierement
          refermé, pour que la transition ait quelque chose a animer. */}
      <div
        className={cn(
          "grid overflow-hidden bg-white transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none lg:hidden",
          ouvert ? "grid-rows-[1fr] border-t border-surface-200" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0">
          <Container className="py-3">
            <nav aria-label="Pages" className="flex flex-col gap-0.5">
              {PAGES_VITRINE.map((page) => {
                const active = estActive(page.href);

                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={() => setOuvert(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary-50 font-medium text-primary-900"
                        : "text-surface-700 hover:bg-surface-100",
                    )}
                  >
                    {page.libelle}
                    <PendingHint />
                  </Link>
                );
              })}

              <Link
                href={lienPrincipal.href}
                onClick={() => setOuvert(false)}
                className={cn(buttonStyles("primary", "md"), "mt-2 sm:hidden")}
              >
                {lienPrincipal.libelle}
                <ArrowRight className="size-4" />
              </Link>
            </nav>
          </Container>
        </div>
      </div>
    </header>
  );
}
