import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

import type { CompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { cn } from "@/shared/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { WordmarkLight } from "@/shared/ui/logo";
import { Container } from "@/shared/ui/section";

import { PAGES_VITRINE } from "../domain/content";

/**
 * Appel a l'action et pied de page.
 *
 * Le lien vers le site vitrine est signale comme externe : ce sont deux
 * produits distincts, et l'utilisateur doit savoir qu'il quitte l'application.
 *
 * Les coordonnees viennent de `company` (parametres de l'entreprise) : un
 * champ non renseigne ne s'affiche pas, plutot que de montrer une ligne vide.
 */
export function SiteFooter({
  connecte,
  company,
}: {
  connecte: boolean;
  company: CompanyIdentity;
}) {
  const annee = new Date().getFullYear();

  return (
    <footer className="bg-primary-950 text-white">
      {/* --- Appel a l'action ------------------------------------------- */}
      <Container className="border-b border-white/10 py-16 text-center sm:py-20">
        <h2 className="reveal text-3xl font-bold tracking-tight sm:text-4xl">
          Prêt à gérer votre activité autrement ?
        </h2>
        <p className="reveal mx-auto mt-4 max-w-xl text-primary-200">
          Connectez-vous avec vos identifiants professionnels. Les comptes sont créés par
          l&apos;administrateur, avec les droits correspondant à votre fonction.
        </p>
        <div className="reveal mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={connecte ? "/tableau-de-bord" : "/connexion"}
            className={cn(buttonStyles("accent", "lg"), "group")}
          >
            {connecte ? "Ouvrir l'application" : "Se connecter"}
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/fonctionnalites"
            className={cn(
              buttonStyles("ghost", "lg"),
              "text-primary-100 hover:bg-white/10 hover:text-white",
            )}
          >
            Voir les fonctionnalités
          </Link>
        </div>
      </Container>

      {/* --- Coordonnees -------------------------------------------------- */}
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <WordmarkLight className="text-xl" />
            {company.slogan ? (
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-primary-300">
                {company.slogan}
              </p>
            ) : null}
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-primary-200">
              Application de gestion interne : ressources humaines, formations, ventes,
              documents administratifs, caisse et comptabilité.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-primary-200">
              {company.address ? (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent-400" />
                  {company.address}
                </li>
              ) : null}
              {company.phone ? (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-accent-400" />
                  <a href={`tel:${company.phone}`} className="hover:text-white">
                    {company.phone}
                  </a>
                </li>
              ) : null}
              {company.email ? (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-accent-400" />
                  <a href={`mailto:${company.email}`} className="break-all hover:text-white">
                    {company.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Navigation</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-primary-200">
              <li>
                <Link href="/" className="hover:text-white">
                  Accueil
                </Link>
              </li>
              {PAGES_VITRINE.map((page) => (
                <li key={page.href}>
                  <Link href={page.href} className="hover:text-white">
                    {page.libelle}
                  </Link>
                </li>
              ))}
              {company.website ? (
                <li>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-white"
                  >
                    Site institutionnel ↗
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-primary-300 sm:flex-row sm:items-center sm:justify-between">
          <p>{`© ${annee} ${company.name}. Tous droits réservés.`}</p>
          <p>Application de gestion interne — accès réservé au personnel autorisé.</p>
        </div>
      </Container>
    </footer>
  );
}
