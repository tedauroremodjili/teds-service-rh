import { formatDate, formatMoney, formatNumber, humanizeEnum } from "@/shared/lib/format";

import type { PrintableDocument } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";
import type { InvoiceData } from "../infrastructure/print-queries";

import {
  AmountInWords,
  DocumentCartouche,
  DocumentFooter,
  Letterhead,
  PaidStamp,
  PartyBlock,
  PrintSheet,
  PrintTable,
  PrintTD,
  PrintTH,
  SignatureRow,
  StatusWatermark,
  TotalsBlock,
  watermarkFor,
} from "./sheet";

/**
 * Facture — vente de documents, prestation, ou avis d'inscription.
 *
 * Les trois operations different par leur origine mais pas par leur forme :
 * un emetteur, un client, des lignes, des totaux, ce qui a ete regle et ce qui
 * reste du. Une seule piece les sert donc toutes, alimentee par `InvoiceData`.
 *
 * Le tampon « Acquitté » n'est pas decoratif : c'est ce que cherche le client
 * qui revient avec sa facture, et il doit se voir sans lire les totaux.
 */
export function InvoiceDocument({
  data,
  company,
  printable,
  editedBy,
}: {
  data: InvoiceData;
  company: CompanyIdentity;
  printable: PrintableDocument;
  editedBy: string | null;
}) {
  const soldee = data.balance === 0 && data.paid > 0;
  const remisesEtTaxes = data.discount !== 0 || data.tax !== 0;

  return (
    <PrintSheet className="relative">
      <StatusWatermark label={watermarkFor(data.status)} />

      <Letterhead company={company} />

      <DocumentCartouche
        title={printable.title}
        subtitle={data.reference === data.number ? null : `Pièce ${data.reference}`}
        reference={data.number}
        issuedAt={data.issuedAt}
      />

      <div className="mb-5 grid grid-cols-2 gap-4">
        <PartyBlock
          title="Émetteur"
          name={company.name}
          lines={[
            company.address,
            company.phone,
            company.email,
            company.rccm ? `RCCM : ${company.rccm}` : null,
          ]}
        />
        <PartyBlock
          title="Client"
          name={data.customer.name}
          lines={[
            data.customer.matricule ? `Matricule : ${data.customer.matricule}` : null,
            data.customer.phone,
            data.customer.email,
          ]}
        />
      </div>

      {/* --- Lignes --------------------------------------------------------- */}
      <PrintTable className="mb-4">
        <thead>
          <tr>
            <PrintTH className="w-8" align="center">
              #
            </PrintTH>
            <PrintTH>Désignation</PrintTH>
            <PrintTH align="right">Qté</PrintTH>
            <PrintTH align="right">Prix unitaire</PrintTH>
            <PrintTH align="right">Montant</PrintTH>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((ligne, index) => (
            <tr key={`${ligne.designation}-${index}`}>
              <PrintTD align="center" className="text-surface-500">
                {index + 1}
              </PrintTD>
              <PrintTD>
                <span className="font-medium text-surface-900">{ligne.designation}</span>
                {ligne.details ? (
                  <span className="block text-[0.65rem] text-surface-500">{ligne.details}</span>
                ) : null}
              </PrintTD>
              <PrintTD align="right">{formatNumber(ligne.quantity)}</PrintTD>
              <PrintTD align="right">{formatMoney(ligne.unitPrice)}</PrintTD>
              <PrintTD align="right" className="font-medium">
                {formatMoney(ligne.total)}
              </PrintTD>
            </tr>
          ))}
        </tbody>
      </PrintTable>

      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          {soldee ? <PaidStamp paid /> : null}

          {/* Le detail des reglements evite l'echange « j'ai deja paye » /
              « je n'ai rien recu » : la piece porte ses propres preuves. */}
          {data.payments.length > 0 ? (
            <div className="print-avoid-break">
              <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-wide text-surface-600">
                Règlements enregistrés
              </p>
              <ul className="space-y-0.5 text-[0.7rem] text-surface-700">
                {data.payments.map((paiement) => (
                  <li key={paiement.reference}>
                    {formatDate(paiement.paidAt)} — {formatMoney(paiement.amount)} (
                    {humanizeEnum(paiement.method)}, {paiement.reference})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <TotalsBlock
          rows={[
            ...(remisesEtTaxes ? [{ label: "Sous-total", amount: data.subtotal }] : []),
            ...(data.discount !== 0
              ? [{ label: "Remise", amount: data.discount, negative: true }]
              : []),
            ...(data.tax !== 0 ? [{ label: "Taxes", amount: data.tax }] : []),
            { label: "Total à payer", amount: data.total, strong: true },
            { label: "Déjà réglé", amount: data.paid },
            { label: "Reste à payer", amount: data.balance, strong: data.balance > 0 },
          ]}
        />
      </div>

      <AmountInWords
        className="mt-4"
        amount={data.total}
        intro="Arrêtée la présente facture à la somme de"
      />

      <SignatureRow
        signatures={[
          { role: "Le client", hint: "Signature précédée de « lu et approuvé »" },
          {
            role: "Pour l'entreprise",
            name: data.seller,
            hint: "Cachet et signature",
          },
        ]}
      />

      <DocumentFooter
        note={
          data.dueDate
            ? `${printable.footnote ? `${printable.footnote} ` : ""}Échéance de règlement : ${formatDate(data.dueDate)}.`
            : printable.footnote
        }
        editedBy={editedBy}
        editedAt={new Date()}
      />
    </PrintSheet>
  );
}
