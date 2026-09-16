import type { ReactNode } from "react";

import { getSession } from "@/infrastructure/auth/dal";
import { SiteFooter } from "@/modules/landing/presentation/site-footer";
import { SiteHeader } from "@/modules/landing/presentation/site-header";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";

/**
 * Mise en page de l'espace PUBLIC.
 *
 * Elle appelle `getSession()` et non `requireAuth()` : la nuance est tout le
 * propos de cette page. On lit la session si elle existe, pour proposer
 * « Ouvrir l'application » plutot que « Se connecter », mais on n'exige rien —
 * un visiteur qui ne s'est jamais connecte doit pouvoir tout consulter.
 *
 * Les coordonnees du pied de page viennent des memes parametres (`company.*`)
 * que le papier a en-tete du back-office : une seule adresse a tenir a jour,
 * jamais deux copies qui divergent.
 */
export default async function VitrineLayout({ children }: { children: ReactNode }) {
  const [session, company] = await Promise.all([getSession(), getCompanyIdentity()]);
  const connecte = session !== null;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader connecte={connecte} />
      <main className="flex-1">{children}</main>
      <SiteFooter connecte={connecte} company={company} />
    </div>
  );
}
