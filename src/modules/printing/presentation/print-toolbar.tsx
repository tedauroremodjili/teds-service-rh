"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";

import { buttonStyles } from "@/shared/ui/button";

/**
 * Bandeau d'actions d'une page d'impression.
 *
 * Composant CLIENT : `window.print()` n'a de sens que dans un navigateur. Le
 * reste de la piece est rendu sur le serveur.
 *
 * Deux façons d'obtenir un document, pour deux besoins differents :
 *  - « Télécharger le PDF » appelle `/api/impression/pdf` (lien construit par
 *    la page serveur avec `buildPrintPdfHref`, `print-pdf-href.ts`), qui
 *    rejoue cette meme page dans un Chromium sans affichage cote serveur (voir
 *    `pdf-renderer.ts`) et renvoie directement le fichier. Le resultat est
 *    identique sur tous les postes et ne porte jamais l'en-tete que le
 *    navigateur ajoute de son cote (URL, date, numero de page) — un habillage
 *    qu'aucun CSS ni JS d'une page ne peut supprimer depuis le site lui-meme.
 *  - « Imprimer » ouvre la boite de dialogue native, pour une impression
 *    papier directe ; si l'utilisateur y choisit « Enregistrer au format
 *    PDF », le rendu suit la meme mise en page mais peut porter l'habillage
 *    du navigateur selon ses reglages.
 *
 * Le bandeau porte `no-print` : il disparait de la piece, evidemment.
 */
export function PrintToolbar({
  backHref,
  backLabel = "Retour",
  pdfHref,
  hint,
  auto = false,
}: {
  backHref: string;
  backLabel?: string;
  /** Lien vers `/api/impression/pdf`, construit par la page avec `buildPrintPdfHref`. */
  pdfHref: string;
  hint?: string;
  /**
   * Ouvrir la boite de dialogue des l'affichage (`?auto=1` dans l'URL).
   * La valeur est lue par la page serveur, qui a deja `searchParams` en main :
   * `useSearchParams()` obligerait a une frontiere Suspense pour rien.
   */
  auto?: boolean;
}) {
  useEffect(() => {
    if (!auto) return;

    // Un cadre : laisser au navigateur le temps de poser la mise en page et de
    // decoder le logo avant d'ouvrir la boite de dialogue, sans quoi l'apercu
    // s'affiche sur une page a moitie composee.
    const minuteur = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(minuteur);
  }, [auto]);

  return (
    <div className="no-print sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 bg-white/95 px-4 py-3 shadow-card backdrop-blur">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary-900">Aperçu avant impression</p>
        <p className="text-xs text-surface-500">
          {hint ?? "« Télécharger le PDF » produit un fichier A4 propre, sans rien ajouter."}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link href={backHref} className={buttonStyles("outline", "sm")}>
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className={buttonStyles("outline", "sm")}
        >
          <Printer className="size-4" />
          Imprimer
        </button>
        <a href={pdfHref} className={buttonStyles("primary", "sm")}>
          <Download className="size-4" />
          Télécharger le PDF
        </a>
      </div>
    </div>
  );
}
