import type { ResourceDefinition } from "@/modules/resources/domain/resource";

import type { PrintedRecord } from "../application/print-use-cases";
import { printableFor } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";

import { CertificateDocument } from "./certificate-document";
import { InvoiceDocument } from "./invoice-document";
import { PayslipDocument } from "./payslip-document";
import { ReceiptDocument } from "./receipt-document";
import { RecordDocument } from "./record-document";

/**
 * Aiguillage : une piece chargee, le gabarit correspondant.
 *
 * Le type `PrintedRecord` est discrimine par son gabarit, donc TypeScript
 * verifie ici que chaque cas recoit bien les donnees qui lui correspondent :
 * ajouter un gabarit sans lui donner sa vue ne compile pas.
 */
export function PrintedRecordDocument({
  record,
  definition,
  company,
  editedBy,
}: {
  record: PrintedRecord;
  definition: ResourceDefinition;
  company: CompanyIdentity;
  editedBy: string | null;
}) {
  const printable = printableFor(definition.key, definition.singular);
  const commun = { company, printable, editedBy };

  switch (record.template) {
    case "bulletin":
      return <PayslipDocument data={record.data} {...commun} />;

    case "facture":
      return <InvoiceDocument data={record.data} {...commun} />;

    case "recu":
      return <ReceiptDocument data={record.data} {...commun} />;

    case "certificat":
      return <CertificateDocument data={record.data} {...commun} />;

    case "fiche":
      return <RecordDocument definition={definition} row={record.row} {...commun} />;
  }
}
