import { formatDate, formatMoney, humanizeEnum } from "@/shared/lib/format";

import type { PrintableDocument } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";
import type { ReceiptData } from "../infrastructure/print-queries";

import {
  AmountInWords,
  DefinitionGrid,
  DocumentFooter,
  Letterhead,
  PrintSheet,
  SignatureRow,
  StatusWatermark,
  watermarkFor,
} from "./sheet";

/**
 * Recu d'encaissement ou piece de decaissement.
 *
 * Deux exemplaires sur la meme feuille, separes par un trait de coupe : la
 * souche reste a la caisse, l'autre part avec le payeur. C'est la pratique
 * courante d'un carnet a souche, et cela evite d'imprimer deux fois.
 *
 * L'exemplaire est identifie en clair (« Souche — caisse » / « Exemplaire du
 * payeur ») : deux papiers identiques dans un classeur ne se distinguent plus.
 */
export function ReceiptDocument({
  data,
  company,
  printable,
  editedBy,
}: {
  data: ReceiptData;
  company: CompanyIdentity;
  printable: PrintableDocument;
  editedBy: string | null;
}) {
  const exemplaires =
    printable.copies === 2
      ? (["Souche — caisse", "Exemplaire du payeur"] as const)
      : (["Exemplaire unique"] as const);

  return (
    <PrintSheet className="relative">
      <StatusWatermark label={watermarkFor(data.status)} />

      {exemplaires.map((exemplaire, index) => (
        <div key={exemplaire}>
          {/* Trait de coupe entre les deux exemplaires : la feuille se coupe
              exactement la, sans avoir a viser. */}
          {index > 0 ? (
            <div className="my-6 flex items-center gap-2 text-[0.6rem] uppercase tracking-widest text-surface-400">
              <span className="h-px flex-1 border-t border-dashed border-surface-400" />
              découper ici
              <span className="h-px flex-1 border-t border-dashed border-surface-400" />
            </div>
          ) : null}

          <ReceiptCopy
            data={data}
            company={company}
            printable={printable}
            editedBy={editedBy}
            copyLabel={exemplaire}
          />
        </div>
      ))}
    </PrintSheet>
  );
}

function ReceiptCopy({
  data,
  company,
  printable,
  editedBy,
  copyLabel,
}: {
  data: ReceiptData;
  company: CompanyIdentity;
  printable: PrintableDocument;
  editedBy: string | null;
  copyLabel: string;
}) {
  const entree = data.direction === "ENTREE";

  return (
    <section className="print-avoid-break">
      <Letterhead company={company} />

      <div className="mb-4 flex items-end justify-between gap-6 border-b border-surface-300 pb-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold uppercase tracking-wide text-primary-900">
            {printable.title}
          </h2>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-accent-600">
            {copyLabel} · {entree ? "Encaissement" : "Décaissement"}
          </p>
        </div>
        <dl className="shrink-0 text-right text-xs leading-relaxed">
          <div className="flex justify-end gap-2">
            <dt className="text-surface-500">N°</dt>
            <dd className="font-mono font-semibold text-surface-900">{data.number}</dd>
          </div>
          <div className="flex justify-end gap-2">
            <dt className="text-surface-500">Date</dt>
            <dd className="font-medium text-surface-800">{formatDate(data.issuedAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Le montant est la seule chose que le lecteur cherche : il occupe la
          place qui lui revient, plutot qu'une ligne de tableau parmi d'autres. */}
      <div className="mb-4 flex items-center justify-between gap-4 rounded border-2 border-primary-900 bg-primary-50 px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-primary-800">
          {entree ? "Reçu de" : "Versé à"}
          <span className="mt-0.5 block text-base font-bold normal-case tracking-normal text-surface-900">
            {data.payer}
          </span>
        </p>
        <p className="shrink-0 text-2xl font-extrabold tabular-nums text-primary-900">
          {formatMoney(data.amount)}
        </p>
      </div>

      <AmountInWords
        className="mb-4"
        amount={data.amount}
        intro={entree ? "La somme de" : "La somme versée de"}
      />

      <DefinitionGrid
        className="mb-4"
        columns={2}
        items={[
          { label: "Objet du règlement", value: data.motif },
          {
            label: "Mode de règlement",
            value: data.method ? humanizeEnum(data.method) : "—",
          },
          ...(data.category
            ? [{ label: "Rubrique comptable", value: humanizeEnum(data.category) }]
            : []),
          ...(data.externalReference
            ? [{ label: "Référence de transaction", value: data.externalReference }]
            : []),
          ...(data.balanceAfter !== null
            ? [{ label: "Solde de caisse après opération", value: formatMoney(data.balanceAfter) }]
            : []),
          ...(data.notes ? [{ label: "Observations", value: data.notes }] : []),
        ]}
      />

      {/* Compact : deux exemplaires doivent tenir sur la meme feuille. */}
      <SignatureRow
        compact
        signatures={[
          { role: entree ? "Le payeur" : "Le bénéficiaire", name: data.payer },
          { role: "Le caissier", hint: "Cachet et signature" },
        ]}
      />

      <DocumentFooter note={printable.footnote} editedBy={editedBy} editedAt={new Date()} />
    </section>
  );
}
