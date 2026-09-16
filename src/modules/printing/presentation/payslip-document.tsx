import type { PayrollItemType, PayrollStatus } from "@/modules/payroll/domain/payroll";
import {
  PAYROLL_ITEM_TYPE_LABELS,
  PAYROLL_STATUS_LABELS,
} from "@/modules/payroll/presentation/payroll-badges";
import { formatDate, formatMoney, formatNumber, humanizeEnum } from "@/shared/lib/format";

import type { PrintableDocument } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";
import type { PayslipData } from "../infrastructure/print-queries";

import {
  AmountInWords,
  DefinitionGrid,
  DocumentCartouche,
  DocumentFooter,
  Letterhead,
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
 * Bulletin de paie.
 *
 * Structure imposee par l'usage : qui paie, qui est paye, sur quelle periode,
 * puis le detail des gains et des retenues, le net a payer en chiffres et en
 * lettres, et deux signatures. Un bulletin encore au brouillon porte un
 * filigrane : il ne doit pas pouvoir etre remis a l'employe par erreur.
 */
export function PayslipDocument({
  data,
  company,
  printable,
  editedBy,
}: {
  data: PayslipData;
  company: CompanyIdentity;
  printable: PrintableDocument;
  editedBy: string | null;
}) {
  const paye = data.status === "PAYE";

  return (
    <PrintSheet className="relative">
      <StatusWatermark label={watermarkFor(data.status)} />

      <Letterhead company={company} />

      <DocumentCartouche
        title={printable.title}
        subtitle={`Période de ${data.periode}`}
        reference={data.reference}
        issuedAt={data.paidAt ?? data.validatedAt}
      />

      <div className="mb-5 grid grid-cols-2 gap-4">
        <PartyBlock
          title="Employeur"
          name={company.name}
          lines={[
            company.address,
            company.phone,
            company.rccm ? `RCCM : ${company.rccm}` : null,
            company.niu ? `NIU : ${company.niu}` : null,
          ]}
        />
        <PartyBlock
          title="Salarié"
          name={data.employee.fullName}
          lines={[
            `Matricule : ${data.employee.matricule}`,
            data.employee.position,
            data.employee.department,
            data.employee.address,
          ]}
        />
      </div>

      <DefinitionGrid
        className="mb-5"
        columns={4}
        items={[
          { label: "Période", value: data.periode },
          { label: "Date d'embauche", value: formatDate(data.employee.hireDate) },
          {
            label: "Statut du bulletin",
            value: PAYROLL_STATUS_LABELS[data.status as PayrollStatus] ?? humanizeEnum(data.status),
          },
          {
            label: "Date de paiement",
            value: data.paidAt ? formatDate(data.paidAt) : "Non payé",
          },
        ]}
      />

      {/* --- Gains ---------------------------------------------------------- */}
      <h2 className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-primary-900">
        Éléments de rémunération
      </h2>
      <PrintTable className="mb-4">
        <thead>
          <tr>
            <PrintTH>Rubrique</PrintTH>
            <PrintTH align="right">Montant</PrintTH>
          </tr>
        </thead>
        <tbody>
          {data.gains.map((ligne) => (
            <tr key={ligne.label}>
              <PrintTD>{ligne.label}</PrintTD>
              <PrintTD align="right">{formatMoney(ligne.amount)}</PrintTD>
            </tr>
          ))}
          <tr>
            <PrintTD className="font-semibold text-primary-900">Total brut</PrintTD>
            <PrintTD align="right" className="font-semibold text-primary-900">
              {formatMoney(data.totals.gross)}
            </PrintTD>
          </tr>
        </tbody>
      </PrintTable>

      {/* --- Retenues ------------------------------------------------------- */}
      {data.retenues.length > 0 ? (
        <>
          <h2 className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-primary-900">
            Retenues
          </h2>
          <PrintTable className="mb-4">
            <thead>
              <tr>
                <PrintTH>Rubrique</PrintTH>
                <PrintTH align="right">Montant</PrintTH>
              </tr>
            </thead>
            <tbody>
              {data.retenues.map((ligne) => (
                <tr key={ligne.label}>
                  <PrintTD>{ligne.label}</PrintTD>
                  <PrintTD align="right">{formatMoney(ligne.amount)}</PrintTD>
                </tr>
              ))}
            </tbody>
          </PrintTable>
        </>
      ) : null}

      {/* --- Detail saisi depuis le module de paie -------------------------- */}
      {data.detail.length > 0 ? (
        <>
          <h2 className="mb-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-primary-900">
            Détail des lignes
          </h2>
          <PrintTable className="mb-4">
            <thead>
              <tr>
                <PrintTH>Nature</PrintTH>
                <PrintTH>Libellé</PrintTH>
                <PrintTH align="right">Quantité</PrintTH>
                <PrintTH align="right">Montant</PrintTH>
              </tr>
            </thead>
            <tbody>
              {data.detail.map((ligne, index) => (
                <tr key={`${ligne.label}-${index}`}>
                  <PrintTD>
                    {PAYROLL_ITEM_TYPE_LABELS[ligne.type as PayrollItemType] ??
                      humanizeEnum(ligne.type)}
                  </PrintTD>
                  <PrintTD>
                    {ligne.label}
                    {ligne.notes ? (
                      <span className="block text-[0.65rem] text-surface-500">{ligne.notes}</span>
                    ) : null}
                  </PrintTD>
                  <PrintTD align="right">
                    {ligne.quantity === null ? "—" : formatNumber(ligne.quantity)}
                  </PrintTD>
                  <PrintTD align="right">{formatMoney(ligne.amount)}</PrintTD>
                </tr>
              ))}
            </tbody>
          </PrintTable>
        </>
      ) : null}

      <TotalsBlock
        rows={[
          { label: "Salaire brut", amount: data.totals.gross },
          { label: "Total des retenues", amount: data.totals.deductions, negative: true },
          { label: "Net à payer", amount: data.totals.net, strong: true },
        ]}
      />

      <AmountInWords
        className="mt-4"
        amount={data.totals.net}
        intro="Arrêté le présent bulletin à la somme nette de"
      />

      <SignatureRow
        signatures={[
          { role: "L'employeur", hint: "Cachet et signature" },
          {
            role: "Le salarié",
            name: data.employee.fullName,
            hint: paye ? "Pour acquit" : "Pour réception",
          },
        ]}
      />

      <DocumentFooter note={printable.footnote} editedBy={editedBy} editedAt={new Date()} />
    </PrintSheet>
  );
}
