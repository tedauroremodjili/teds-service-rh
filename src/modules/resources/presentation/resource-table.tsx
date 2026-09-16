import Link from "next/link";

import { RowActions, type RowAction } from "@/shared/ui/row-actions";
import { Table, TBody, TD, TH, THead, TR } from "@/shared/ui/table";

import { listFields, type ResourceDefinition } from "../domain/resource";
import type { ResourceRow } from "../domain/resource-repository";

import { displayValue } from "./format-value";

/**
 * Tableau de liste commun.
 *
 * Composant serveur : il ne fait qu'afficher des valeurs deja calculees, donc
 * rien ne justifie de l'envoyer au navigateur. La premiere colonne est le lien
 * vers la fiche — c'est la convention de tout le back-office — et la derniere
 * porte les actions de ligne.
 *
 * `peutModifier` vient de la page, qui a deja resolu les droits. Masquer le
 * crayon n'est pas une securite : la Server Action de modification revalide
 * l'autorisation. C'est seulement une interface honnete, qui ne propose pas un
 * geste qui sera refuse.
 */
export function ResourceTable({
  definition,
  rows,
  peutModifier = false,
}: {
  definition: ResourceDefinition;
  rows: ResourceRow[];
  peutModifier?: boolean;
}) {
  const colonnes = listFields(definition);

  return (
    <Table>
      <THead>
        {colonnes.map((field) => (
          <TH key={field.name} align={field.align === "right" ? "right" : "left"}>
            {field.label}
          </TH>
        ))}
        <TH align="right" className="no-print">
          Actions
        </TH>
      </THead>
      <TBody>
        {rows.map((row) => {
          const actions: RowAction[] = [
            {
              href: `/${definition.key}/${row.id}`,
              label: "Ouvrir la fiche",
              icon: "voir",
            },
          ];

          if (peutModifier) {
            actions.push({
              href: `/${definition.key}/${row.id}/modifier`,
              label: "Modifier",
              icon: "modifier",
            });
          }

          actions.push({
            href: `/${definition.key}/${row.id}/impression`,
            label: "Imprimer la fiche",
            icon: "imprimer",
          });

          return (
            <TR key={row.id}>
              {colonnes.map((field, index) => (
                <TD
                  key={field.name}
                  align={field.align === "right" ? "right" : "left"}
                  className={field.align === "right" ? "whitespace-nowrap" : undefined}
                >
                  {index === 0 ? (
                    <Link
                      href={`/${definition.key}/${row.id}`}
                      className="font-medium text-surface-800 hover:text-primary-700"
                    >
                      {displayValue(field, row)}
                    </Link>
                  ) : (
                    displayValue(field, row)
                  )}
                </TD>
              ))}

              {/* Les actions n'ont pas de sens sur le papier. */}
              <TD align="right" className="no-print">
                <RowActions actions={actions} />
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
