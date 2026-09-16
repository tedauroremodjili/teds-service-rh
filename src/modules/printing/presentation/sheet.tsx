import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/shared/lib/utils";
import { montantEnLettres } from "@/shared/lib/amount-in-words";
import { formatDate, formatDateTime, formatMoney } from "@/shared/lib/format";

import type { CompanyIdentity } from "../infrastructure/company-queries";

/**
 * Briques de mise en page des pieces imprimees.
 *
 * Toutes sont des composants SERVEUR : une piece n'a aucun etat, aucun
 * evenement, et n'a donc rien a faire dans le navigateur. Seul le bandeau
 * d'actions (`print-toolbar.tsx`) est un composant client, parce qu'il appelle
 * `window.print()`.
 *
 * Regle de style : les classes de couleur employees ici doivent rester lisibles
 * sur du papier. Les aplats de marque sont conserves a l'impression grace a
 * `print-color-adjust: exact` (voir globals.css), mais on evite les gris trop
 * clairs, qui disparaissent sur une imprimante laser d'entree de gamme.
 */

/* -------------------------------------------------------------------------- */
/* La feuille                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Feuille A4.
 *
 * A l'ecran, elle se donne les dimensions du papier (210 mm) pour que l'apercu
 * soit fidele ; a l'impression, la page EST la feuille et les marges sont celles
 * de `@page`. Les deux comportements vivent dans `.print-sheet`.
 */
export function PrintSheet({
  children,
  orientation = "portrait",
  className,
}: {
  children: ReactNode;
  orientation?: "portrait" | "landscape";
  className?: string;
}) {
  return (
    <article
      className={cn("print-sheet", orientation === "landscape" && "print-landscape", className)}
    >
      {children}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* En-tete et pied                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Papier a en-tete : logo, raison sociale et coordonnees legales.
 *
 * Les mentions absentes des parametres ne laissent pas de ligne vide — un
 * document officiel ne montre pas les cases qu'on n'a pas remplies.
 */
export function Letterhead({ company }: { company: CompanyIdentity }) {
  const coordonnees = [company.address, company.phone, company.email, company.website].filter(
    Boolean,
  ) as string[];

  const mentions = [
    company.rccm ? `RCCM : ${company.rccm}` : null,
    company.niu ? `NIU : ${company.niu}` : null,
  ].filter(Boolean) as string[];

  return (
    <header className="print-avoid-break mb-6 flex items-start justify-between gap-6 border-b-2 border-primary-900 pb-4">
      <div className="flex min-w-0 items-start gap-4">
        <Image
          src={company.logoUrl}
          alt=""
          width={378}
          height={142}
          priority
          unoptimized
          className="h-14 w-auto shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="text-lg font-extrabold uppercase leading-tight tracking-tight text-primary-900">
            {company.name}
          </p>
          {company.slogan ? (
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-accent-600">
              {company.slogan}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 text-right text-[0.68rem] leading-relaxed text-surface-700">
        {coordonnees.map((ligne) => (
          <p key={ligne}>{ligne}</p>
        ))}
        {mentions.length > 0 ? (
          <p className="mt-1 font-medium text-surface-800">{mentions.join(" · ")}</p>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Cartouche du document : sa nature, son numero et sa date.
 * C'est ce que l'on cherche des yeux en reprenant une piece dans un classeur.
 */
export function DocumentCartouche({
  title,
  reference,
  issuedAt,
  subtitle,
  referenceLabel = "N°",
}: {
  title: string;
  reference: string;
  issuedAt: string | Date | null;
  subtitle?: string | null;
  referenceLabel?: string;
}) {
  return (
    <div className="print-avoid-break mb-5 flex items-end justify-between gap-6 border-b border-surface-300 pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold uppercase tracking-wide text-primary-900">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-surface-600">{subtitle}</p> : null}
      </div>
      <dl className="shrink-0 text-right text-xs leading-relaxed">
        <div className="flex justify-end gap-2">
          <dt className="text-surface-500">{referenceLabel}</dt>
          <dd className="font-mono font-semibold text-surface-900">{reference}</dd>
        </div>
        {issuedAt ? (
          <div className="flex justify-end gap-2">
            <dt className="text-surface-500">Date</dt>
            <dd className="font-medium text-surface-800">{formatDate(issuedAt)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/**
 * Pied de piece : mention legale, puis la ligne d'edition.
 *
 * La ligne d'edition (« edite le … par … ») n'est pas decorative : elle permet
 * de distinguer deux tirages d'une meme piece, et de retrouver qui l'a sortie.
 */
export function DocumentFooter({
  note,
  editedBy,
  editedAt,
}: {
  note?: string | null;
  editedBy?: string | null;
  editedAt: Date;
}) {
  return (
    <footer className="print-avoid-break mt-6 border-t border-surface-300 pt-2 text-[0.62rem] leading-relaxed text-surface-500">
      {note ? <p className="mb-1 text-surface-600">{note}</p> : null}
      <p>
        Édité le {formatDateTime(editedAt)}
        {editedBy ? ` par ${editedBy}` : ""} — document produit par le système de gestion
        TED&apos;S SERVICE.
      </p>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* Blocs de contenu                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Encadre d'une partie (employeur, employe, client).
 * Deux blocs cote a cote suffisent a dire qui doit quoi a qui.
 */
export function PartyBlock({
  title,
  name,
  lines,
  className,
}: {
  title: string;
  name: string;
  lines?: Array<string | null | undefined>;
  className?: string;
}) {
  const visibles = (lines ?? []).filter(Boolean) as string[];

  return (
    <section
      className={cn(
        "print-avoid-break min-w-0 rounded border border-surface-300 px-3 py-2",
        className,
      )}
    >
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-primary-700">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold text-surface-900">{name}</p>
      {visibles.map((ligne) => (
        <p key={ligne} className="text-[0.72rem] leading-snug text-surface-600">
          {ligne}
        </p>
      ))}
    </section>
  );
}

export interface DefinitionItem {
  label: string;
  value: ReactNode;
}

/** Grille libelle / valeur, pour les caracteristiques d'une piece. */
export function DefinitionGrid({
  items,
  columns = 3,
  className,
}: {
  items: DefinitionItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const grille = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];

  return (
    <dl className={cn("print-avoid-break grid gap-x-6 gap-y-2", grille, className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[0.6rem] font-medium uppercase tracking-wide text-surface-500">
            {item.label}
          </dt>
          <dd className="break-words text-[0.78rem] font-medium text-surface-900">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Tableau d'une piece.
 *
 * `<thead>` est repete en haut de chaque page par le navigateur (regle posee
 * dans globals.css) : une liste de deux cents lignes reste lisible page apres
 * page, ce qu'un tableau d'ecran ne garantit pas.
 */
export function PrintTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("w-full border-collapse text-[0.75rem]", className)}>{children}</table>
  );
}

export function PrintTH({
  children,
  align = "left",
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-surface-400 bg-primary-50 px-2 py-1.5 text-[0.62rem] font-semibold uppercase tracking-wide text-primary-900",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function PrintTD({
  children,
  align = "left",
  colSpan,
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right" | "center";
  colSpan?: number;
  className?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "border-b border-surface-200 px-2 py-1.5 align-top text-surface-800",
        align === "right" && "text-right tabular-nums",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export interface TotalRow {
  label: string;
  amount: number;
  /** Ligne mise en avant : le net a payer, le total du a regler. */
  strong?: boolean;
  /** Montant a soustraire : affiche precede d'un signe moins. */
  negative?: boolean;
}

/** Bloc de totaux, aligne a droite comme sur toute piece comptable. */
export function TotalsBlock({ rows, className }: { rows: TotalRow[]; className?: string }) {
  return (
    <table
      className={cn("print-avoid-break ml-auto w-[62mm] border-collapse text-[0.78rem]", className)}
    >
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={cn(
              "border-b border-surface-200",
              row.strong && "border-y-2 border-primary-900 bg-primary-50",
            )}
          >
            <th
              scope="row"
              className={cn(
                "px-2 py-1 text-left font-medium text-surface-700",
                row.strong && "py-1.5 font-bold uppercase text-primary-900",
              )}
            >
              {row.label}
            </th>
            <td
              className={cn(
                "px-2 py-1 text-right tabular-nums text-surface-900",
                row.strong && "py-1.5 text-sm font-bold text-primary-900",
              )}
            >
              {row.negative && row.amount !== 0 ? "− " : ""}
              {formatMoney(Math.abs(row.amount))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Somme arretee en toutes lettres.
 *
 * C'est la mention qui fait foi sur une piece de caisse : un chiffre se
 * surcharge, une lettre non.
 */
export function AmountInWords({
  amount,
  intro = "Arrêtée la présente pièce à la somme de",
  className,
}: {
  amount: number;
  intro?: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "print-avoid-break rounded border border-dashed border-surface-400 px-3 py-2 text-[0.75rem] leading-snug text-surface-800",
        className,
      )}
    >
      {intro} <span className="font-semibold italic">{montantEnLettres(amount)}</span>.
    </p>
  );
}

/**
 * Emplacements de signature, avec leur trait d'appui.
 *
 * `compact` reduit la hauteur reservee a la signature. C'est ce qu'il faut
 * quand deux exemplaires doivent tenir sur la meme feuille (un recu a souche) :
 * on garde de quoi signer, on renonce a la place du cachet.
 */
export function SignatureRow({
  signatures,
  compact = false,
  className,
}: {
  signatures: Array<{ role: string; name?: string | null; hint?: string }>;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "print-avoid-break flex items-start justify-between gap-8",
        compact ? "mt-4" : "mt-8",
        className,
      )}
    >
      {signatures.map((signature) => (
        <div key={signature.role} className="min-w-0 flex-1 text-center">
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-surface-700">
            {signature.role}
          </p>
          {signature.hint ? (
            <p className="text-[0.6rem] italic text-surface-500">{signature.hint}</p>
          ) : null}
          {/* L'espace vide EST le champ : il faut de quoi signer et cacheter. */}
          <div className={cn("border-t border-surface-500", compact ? "mt-8" : "mt-12")} />
          {signature.name ? (
            <p className="mt-1 text-[0.68rem] text-surface-700">{signature.name}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Filigrane d'etat.
 *
 * Un brouillon ou une piece annulee ne doit pas pouvoir etre confondu avec une
 * piece valide une fois sorti de l'imprimante : le filigrane traverse la page.
 */
export function StatusWatermark({ label }: { label: string | null }) {
  if (!label) return null;

  return (
    <p
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[64pt] font-black uppercase tracking-widest text-danger-500/12 -rotate-24"
    >
      {label}
    </p>
  );
}

/**
 * Filigrane a poser sur les pieces qui n'engagent pas encore l'entreprise.
 * Une piece validee ou payee n'en porte pas.
 */
export function watermarkFor(status: string | null | undefined): string | null {
  if (!status) return null;
  if (status === "BROUILLON" || status === "DEVIS") return "Brouillon";
  if (status === "ANNULE" || status === "ANNULEE") return "Annulé";
  if (status === "EN_ATTENTE") return "Non confirmé";
  return null;
}

/** Bandeau « Acquitté » : la piece est soldee, le lecteur doit le voir. */
export function PaidStamp({ paid }: { paid: boolean }) {
  if (!paid) return null;

  return (
    <p className="print-avoid-break inline-block -rotate-6 rounded border-2 border-success-700 px-4 py-1 text-sm font-extrabold uppercase tracking-widest text-success-700">
      Acquitté
    </p>
  );
}
