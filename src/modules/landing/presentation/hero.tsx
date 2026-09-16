import Link from "next/link";
import { ArrowRight, GraduationCap, ShoppingCart, TrendingUp, Users } from "lucide-react";

import { formatCompact, formatMoney, formatNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { buttonStyles } from "@/shared/ui/button";
import { Sparkline } from "@/shared/ui/charts";
import { Container } from "@/shared/ui/section";

import { APERCU } from "../domain/content";

/**
 * Section d'ouverture.
 *
 * A droite, un extrait du VRAI tableau de bord — memes tuiles, meme
 * sparkline, memes couleurs que l'application. Une capture d'ecran vieillirait
 * a la premiere evolution du produit ; ici, l'apercu suit le code.
 */
export function Hero({ connecte }: { connecte: boolean }) {
  const recettes = APERCU.serie.map((point) => point.recettes);
  const beneficesMois = APERCU.recettes - APERCU.depenses;

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Halos de marque, tres diffus : ils colorent sans se voir. */}
      <div
        aria-hidden
        className="halo-float pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary-100/60 blur-3xl"
      />
      <div
        aria-hidden
        style={{ animationDelay: "-7s" }}
        className="halo-float pointer-events-none absolute -left-40 top-40 size-[28rem] rounded-full bg-accent-100/40 blur-3xl"
      />

      <Container className="relative py-20 sm:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* --- Discours ---------------------------------------------- */}
          <div className="page-enter">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800">
              <span className="pulse-glow size-1.5 rounded-full bg-accent-500" />
              Gestion interne — TED&apos;S SERVICE
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-primary-950 sm:text-5xl lg:text-6xl">
              TED&apos;S SERVICE
              <span className="block text-primary-700">ERP</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-surface-600">
              Une plateforme intelligente pour gérer les ressources humaines, les formations,
              les ventes, les documents administratifs, la caisse et les finances de votre
              entreprise.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/fonctionnalites"
                className={cn(buttonStyles("primary", "lg"), "group")}
              >
                Découvrir
                <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href={connecte ? "/tableau-de-bord" : "/connexion"}
                className={cn(
                  buttonStyles("outline", "lg"),
                  "transition-transform duration-300 hover:-translate-y-0.5",
                )}
              >
                {connecte ? "Ouvrir l'application" : "Se connecter"}
              </Link>
            </div>

            <dl className="reveal mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-surface-200 pt-8">
              {[
                { valeur: "17", libelle: "modules métier" },
                { valeur: "8", libelle: "rôles et permissions" },
                { valeur: "100 %", libelle: "dans le navigateur" },
              ].map((chiffre) => (
                <div key={chiffre.libelle} className="transition-transform duration-300 hover:-translate-y-0.5">
                  <dt className="text-2xl font-bold text-primary-900">{chiffre.valeur}</dt>
                  <dd className="mt-1 text-xs leading-snug text-surface-500">
                    {chiffre.libelle}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* --- Apercu --------------------------------------------------- */}
          <div className="page-enter-delay relative">
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-3 shadow-card-hover transition-transform duration-500 hover:-translate-y-1.5 sm:p-4">
              {/* Barre de fenêtre : elle situe l'aperçu comme une application. */}
              <div className="mb-3 flex items-center gap-1.5 px-1">
                <span className="size-2.5 rounded-full bg-surface-300" />
                <span className="size-2.5 rounded-full bg-surface-300" />
                <span className="size-2.5 rounded-full bg-surface-300" />
                <span className="ml-2 truncate text-[0.7rem] text-surface-400">
                  Tableau de bord — TED&apos;S SERVICE
                </span>
              </div>

              <div className="space-y-3 rounded-xl bg-white p-4">
                <div className="grid grid-cols-2 gap-3">
                  <TuileApercu
                    libelle="Effectif actif"
                    valeur={formatNumber(APERCU.effectif)}
                    icone={<Users className="size-4" />}
                    ton="primary"
                  />
                  <TuileApercu
                    libelle="Apprenants"
                    valeur={formatNumber(APERCU.apprenants)}
                    icone={<GraduationCap className="size-4" />}
                    ton="accent"
                  />
                </div>

                <div className="rounded-xl border border-surface-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-surface-500">
                        Recettes du mois
                      </p>
                      <p className="mt-1.5 text-xl font-bold text-primary-900">
                        {formatMoney(APERCU.recettes)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-success-700">
                        +14,2 % vs mois précédent
                      </p>
                    </div>
                    <Sparkline
                      values={recettes}
                      couleur="#008300"
                      largeur={110}
                      hauteur={44}
                      ariaLabel="Tendance des recettes sur douze mois"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TuileApercu
                    libelle="Bénéfice"
                    valeur={`${formatCompact(beneficesMois)} F`}
                    icone={<TrendingUp className="size-4" />}
                    ton="success"
                  />
                  <TuileApercu
                    libelle="Ventes"
                    valeur={formatNumber(APERCU.ventes)}
                    icone={<ShoppingCart className="size-4" />}
                    ton="primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const TONS = {
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-600",
  success: "bg-success-50 text-success-700",
} as const;

function TuileApercu({
  libelle,
  valeur,
  icone,
  ton,
}: {
  libelle: string;
  valeur: string;
  icone: React.ReactNode;
  ton: keyof typeof TONS;
}) {
  return (
    <div className="rounded-xl border border-surface-200 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] font-medium uppercase tracking-wide text-surface-500">
          {libelle}
        </p>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            TONS[ton],
          )}
        >
          {icone}
        </span>
      </div>
      <p className="mt-1.5 text-lg font-bold text-primary-900">{valeur}</p>
    </div>
  );
}
