import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Container } from "@/shared/ui/section";

import { voisinesDe } from "../domain/content";

/**
 * Parcours d'une page à la suivante.
 *
 * Découper la vitrine en pages fait perdre une qualité de la page unique : on
 * y faisait défiler et tout venait dans l'ordre. Ces deux liens rendent cet
 * enchaînement, sans obliger à repasser par le menu.
 */
export function Pager({ courante }: { courante: string }) {
  const { precedente, suivante } = voisinesDe(courante);

  if (!precedente && !suivante) return null;

  return (
    <nav aria-label="Pages voisines" className="border-t border-surface-200 bg-surface-50">
      <Container className="py-8">
        <div className="reveal grid gap-3 sm:grid-cols-2">
          {precedente ? (
            <Link
              href={precedente.href}
              className="group flex items-center gap-3 rounded-xl border border-surface-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-primary-200 hover:shadow-card"
            >
              <ArrowLeft className="size-4 shrink-0 text-surface-400 transition-transform group-hover:-translate-x-0.5 group-hover:text-primary-700" />
              <span className="min-w-0">
                <span className="block text-xs text-surface-500">Précédent</span>
                <span className="block truncate font-medium text-primary-900">
                  {precedente.libelle}
                </span>
              </span>
            </Link>
          ) : (
            <span className="hidden sm:block" />
          )}

          {suivante ? (
            <Link
              href={suivante.href}
              className="group flex items-center justify-end gap-3 rounded-xl border border-surface-200 bg-white p-4 text-right transition-[border-color,box-shadow] hover:border-primary-200 hover:shadow-card"
            >
              <span className="min-w-0">
                <span className="block text-xs text-surface-500">Suivant</span>
                <span className="block truncate font-medium text-primary-900">
                  {suivante.libelle}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-surface-400 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-700" />
            </Link>
          ) : null}
        </div>
      </Container>
    </nav>
  );
}
