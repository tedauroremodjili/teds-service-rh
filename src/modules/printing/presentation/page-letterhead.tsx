import Image from "next/image";

import { formatDateTime } from "@/shared/lib/format";

import type { CompanyIdentity } from "../infrastructure/company-queries";

/**
 * Papier a en-tete des pages ordinaires.
 *
 * Toute page du back-office peut etre imprimee depuis le bouton de l'en-tete :
 * une synthese, un tableau de bord, la matrice des droits. Sans en-tete, ces
 * tirages sortent anonymes — impossible de dire de quelle entreprise ni de quel
 * jour ils datent une fois poses sur un bureau. Ce bandeau y repond.
 *
 * Il est `print-only` : il n'apparait jamais a l'ecran, ou la coquille de
 * l'application dit deja tout cela. Et il s'efface devant une piece dediee
 * (voir la regle `:has(.print-sheet)` dans globals.css), qui porte le sien.
 */
export function PageLetterhead({
  company,
  editedBy,
}: {
  company: CompanyIdentity;
  editedBy: string | null;
}) {
  const coordonnees = [company.address, company.phone, company.email].filter(Boolean) as string[];

  return (
    <header className="print-page-letterhead mb-4 items-start justify-between gap-6 border-b-2 border-primary-900 pb-3">
      <div className="flex items-center gap-3">
        <Image
          src={company.logoUrl}
          alt=""
          width={378}
          height={142}
          unoptimized
          className="h-10 w-auto object-contain"
        />
        <div>
          <p className="text-base font-extrabold uppercase leading-tight text-primary-900">
            {company.name}
          </p>
          {coordonnees.length > 0 ? (
            <p className="text-[0.62rem] text-surface-600">{coordonnees.join(" · ")}</p>
          ) : null}
        </div>
      </div>

      <p className="text-right text-[0.62rem] leading-relaxed text-surface-500">
        Édité le {formatDateTime(new Date())}
        {editedBy ? (
          <>
            <br />
            par {editedBy}
          </>
        ) : null}
      </p>
    </header>
  );
}
