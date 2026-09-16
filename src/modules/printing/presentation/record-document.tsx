import type { ResourceDefinition } from "@/modules/resources/domain/resource";
import type { ResourceRow } from "@/modules/resources/domain/resource-repository";
import { displayValue, rowTitle } from "@/modules/resources/presentation/format-value";

import type { PrintableDocument } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";

import {
  DefinitionGrid,
  DocumentCartouche,
  DocumentFooter,
  Letterhead,
  PrintSheet,
  SignatureRow,
} from "./sheet";

/**
 * Fiche generique — le repli pour toute ressource sans piece dediee.
 *
 * Elle imprime les champs declares au catalogue, dans leur ordre, avec le meme
 * formatage que l'ecran (`displayValue`). Ce n'est pas un pis-aller : un contrat
 * de travail, une demande de conge ou une ecriture comptable s'archivent tres
 * bien sous cette forme, et la piece porte en-tete, reference et signatures
 * comme les autres.
 */
export function RecordDocument({
  definition,
  row,
  company,
  printable,
  editedBy,
}: {
  definition: ResourceDefinition;
  row: ResourceRow;
  company: CompanyIdentity;
  printable: PrintableDocument;
  editedBy: string | null;
}) {
  const titre = rowTitle(definition.titleFields, row, definition.singular);

  // La reference si la ressource en porte une ; l'identifiant sinon. Une fiche
  // sans numero est inclassable.
  const reference = typeof row.reference === "string" ? row.reference : row.id;

  const items = definition.fields.map((field) => ({
    label: field.label,
    value: displayValue(field, row),
  }));

  return (
    <PrintSheet>
      <Letterhead company={company} />

      <DocumentCartouche
        title={printable.title}
        subtitle={titre === reference ? definition.description : titre}
        reference={reference}
        issuedAt={null}
      />

      <DefinitionGrid columns={3} items={items} className="gap-y-3" />

      <SignatureRow
        signatures={[
          { role: "Établi par", name: editedBy, hint: "Signature" },
          { role: "Visa du responsable", hint: "Cachet et signature" },
        ]}
      />

      <DocumentFooter note={printable.footnote} editedBy={editedBy} editedAt={new Date()} />
    </PrintSheet>
  );
}
