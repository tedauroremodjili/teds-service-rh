import type { ReactNode } from "react";
import { BookOpen, GraduationCap, Laptop } from "lucide-react";

import { WordmarkLight } from "@/shared/ui/logo";

/**
 * Mise en page des ecrans publics d'authentification.
 *
 * Ce layout appartient au groupe de routes (auth) : les parentheses signifient
 * que le dossier n'apparait pas dans l'URL. La page de connexion reste donc
 * accessible sur /connexion, tout en ayant une presentation totalement
 * differente de celle du back-office.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const annee = new Date().getFullYear();

  return (
    /*
      `h-dvh overflow-hidden` : l'ecran de connexion tient dans la fenetre et
      ne defile jamais. Seule la colonne du formulaire peut defiler, et
      uniquement si la fenetre est vraiment tres basse.
    */
    <div className="grid h-dvh overflow-hidden lg:grid-cols-2">
      {/*
        Panneau de marque — masque sur mobile pour laisser la place au
        formulaire. `overflow-hidden` est indispensable : les halos decoratifs
        debordent volontairement du cadre, et sans cela le navigateur ajoutait
        une barre de defilement horizontale.
      */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-12 bg-brand-gradient">
        <div className="relative z-10">
          <WordmarkLight className="text-2xl" />
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary-200">
            Learning &amp; Tech Solutions
          </p>
        </div>

        <div className="relative z-10 my-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">
            La gestion de votre centre,
            <br />
            réunie en un seul endroit.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-100">
            Personnel, formations, apprenants, ventes et comptabilité : tout est
            centralisé, tracé et disponible en temps réel.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-primary-100">
            <li className="flex items-center gap-3">
              <GraduationCap className="size-5 shrink-0 text-accent-400" />
              Formations et suivi des apprenants
            </li>
            <li className="flex items-center gap-3">
              <BookOpen className="size-5 shrink-0 text-accent-400" />
              Documents administratifs et certificats
            </li>
            <li className="flex items-center gap-3">
              <Laptop className="size-5 shrink-0 text-accent-400" />
              Prestations informatiques et services
            </li>
          </ul>
        </div>

        {/*
          Chaine construite en une seule expression : en JSX, l'espace entre
          une accolade fermante et le texte suivant n'est pas conserve de
          maniere fiable, ce qui collait l'annee au nom de l'entreprise.
        */}
        <p className="relative z-10 text-xs text-primary-200">
          {`© ${annee} TED'S SERVICE. Tous droits réservés.`}
        </p>

        {/* Halos decoratifs, repris des teintes du logo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-accent-500/15 blur-3xl"
        />
      </aside>

      <main className="flex items-center justify-center overflow-y-auto bg-surface-100 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
