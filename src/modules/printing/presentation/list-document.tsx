import { listFields, type ResourceDefinition } from "@/modules/resources/domain/resource";
import type { ResourceRow } from "@/modules/resources/domain/resource-repository";
import { displayValue } from "@/modules/resources/presentation/format-value";
import { formatMoney, formatNumber } from "@/shared/lib/format";

import { listOrientation, MAX_LIGNES_IMPRIMEES } from "../domain/printable";
import type { CompanyIdentity } from "../infrastructure/company-queries";

import {
  DocumentCartouche,
  DocumentFooter,
  Letterhead,
  PrintSheet,
  PrintTable,
  PrintTD,
  PrintTH,
} from "./sheet";

/**
 * Etat imprime d'une liste de ressources.
 *
 * Trois choses distinguent un etat papier d'un tableau d'ecran, et elles sont
 * traitees ici :
 *
 *  1. l'en-tete de colonnes se repete en haut de chaque page (`<thead>`, avec
 *     la regle d'impression posee dans globals.css) ;
 *  2. les criteres retenus sont imprimes avec la liste — un etat filtre qui ne
 *     dit pas sur quoi il est filtre est un etat faux ;
 *  3. les colonnes de montants sont totalisees en pied de tableau, ce qu'un
 *     lecteur de papier ne peut pas faire lui-meme.
 */
export function ListDocument({
  definition,
  rows,
  total,
  criteria,
  company,
  editedBy,
}: {
  definition: ResourceDefinition;
  rows: ResourceRow[];
  /** Nombre total d'enregistrements correspondant aux criteres. */
  total: number;
  /** Criteres retenus, deja mis en forme (« Statut : Payé »). */
  criteria: string[];
  company: CompanyIdentity;
  editedBy: string | null;
}) {
  const colonnes = listFields(definition);
  const totaux = totauxParColonne(definition, rows);
  const tronquee = total > rows.length;

  return (
    <PrintSheet orientation={listOrientation(colonnes.length)}>
      <Letterhead company={company} />

      <DocumentCartouche
        title={definition.plural}
        subtitle={definition.description}
        reference={`${formatNumber(rows.length)} ligne${rows.length > 1 ? "s" : ""} sur ${formatNumber(total)}`}
        referenceLabel="Étendue"
        issuedAt={new Date()}
      />

      {criteria.length > 0 ? (
        <p className="print-avoid-break mb-3 rounded border border-surface-300 bg-surface-50 px-3 py-2 text-[0.7rem] text-surface-700">
          <span className="font-semibold uppercase tracking-wide text-surface-600">
            Critères appliqués —{" "}
          </span>
          {criteria.join(" · ")}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded border border-dashed border-surface-400 px-4 py-8 text-center text-sm text-surface-500">
          Aucun enregistrement ne correspond à ces critères.
        </p>
      ) : (
        <PrintTable>
          <thead>
            <tr>
              <PrintTH align="right" className="w-10">
                N°
              </PrintTH>
              {colonnes.map((field) => (
                <PrintTH key={field.name} align={field.align === "right" ? "right" : "left"}>
                  {field.label}
                </PrintTH>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <PrintTD align="right" className="text-surface-500">
                  {index + 1}
                </PrintTD>
                {colonnes.map((field) => (
                  <PrintTD
                    key={field.name}
                    align={field.align === "right" ? "right" : "left"}
                    className={field.align === "right" ? "whitespace-nowrap" : undefined}
                  >
                    {displayValue(field, row)}
                  </PrintTD>
                ))}
              </tr>
            ))}
          </tbody>

          {totaux.size > 0 ? (
            <tfoot>
              <tr className="border-t-2 border-primary-900 bg-primary-50">
                <td className="px-2 py-1.5 text-right text-[0.68rem] font-bold uppercase text-primary-900">
                  {/* Le libelle du total occupe la colonne du numero de ligne. */}
                  Σ
                </td>
                {colonnes.map((field, index) => {
                  const somme = totaux.get(field.name);
                  return (
                    <td
                      key={field.name}
                      className={`px-2 py-1.5 text-[0.72rem] font-bold text-primary-900 ${
                        field.align === "right" ? "text-right tabular-nums" : "text-left"
                      }`}
                    >
                      {somme !== undefined
                        ? formatMoney(somme)
                        : index === 0
                          ? "Totaux"
                          : null}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </PrintTable>
      )}

      <DocumentFooter
        note={
          tronquee
            ? `Seules les ${formatNumber(MAX_LIGNES_IMPRIMEES)} premières lignes sont imprimées sur les ${formatNumber(total)} correspondant aux critères. Affinez les filtres pour obtenir un état complet.`
            : null
        }
        editedBy={editedBy}
        editedAt={new Date()}
      />
    </PrintSheet>
  );
}

/**
 * Somme des colonnes de montant.
 *
 * Seuls les champs « money » sont totalises : additionner des taux, des annees
 * ou des quantites d'unites differentes ne voudrait rien dire. Les totaux ne
 * portent que sur les lignes imprimees, ce que le pied de page precise quand la
 * liste est tronquee.
 */
function totauxParColonne(
  definition: ResourceDefinition,
  rows: ResourceRow[],
): Map<string, number> {
  const totaux = new Map<string, number>();

  for (const field of listFields(definition)) {
    if (field.kind !== "money") continue;

    const somme = rows.reduce((cumul, row) => {
      const valeur = row[field.name];
      return typeof valeur === "number" && Number.isFinite(valeur) ? cumul + valeur : cumul;
    }, 0);

    totaux.set(field.name, somme);
  }

  return totaux;
}
