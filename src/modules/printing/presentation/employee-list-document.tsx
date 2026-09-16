import type { EmployeeListItem } from "@/modules/employees/domain/employee-repository";
import { EMPLOYEE_STATUS_LABELS } from "@/modules/employees/presentation/employee-status-badge";
import { formatDateShort, formatMoney, formatNumber, formatPercent } from "@/shared/lib/format";

import { MAX_LIGNES_IMPRIMEES } from "../domain/printable";
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
 * État du personnel.
 *
 * L'equivalent papier de la liste des employes, avec la masse salariale
 * totalisee en pied de tableau : c'est le chiffre que cherche la direction sur
 * un etat imprime, et celui qu'un lecteur ne peut pas calculer lui-meme.
 *
 * Huit colonnes ne tiennent pas en portrait : l'etat s'imprime en paysage.
 */
export function EmployeeListDocument({
  employees,
  total,
  criteria,
  company,
  editedBy,
}: {
  employees: EmployeeListItem[];
  total: number;
  criteria: string[];
  company: CompanyIdentity;
  editedBy: string | null;
}) {
  const masseSalariale = employees.reduce((cumul, employe) => cumul + employe.baseSalary, 0);
  const tronquee = total > employees.length;

  return (
    <PrintSheet orientation="landscape">
      <Letterhead company={company} />

      <DocumentCartouche
        title="État du personnel"
        subtitle="Effectif et masse salariale"
        reference={`${formatNumber(employees.length)} agent${employees.length > 1 ? "s" : ""} sur ${formatNumber(total)}`}
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

      {employees.length === 0 ? (
        <p className="rounded border border-dashed border-surface-400 px-4 py-8 text-center text-sm text-surface-500">
          Aucun employé ne correspond à ces critères.
        </p>
      ) : (
        <PrintTable>
          <thead>
            <tr>
              <PrintTH align="right" className="w-10">
                N°
              </PrintTH>
              <PrintTH>Matricule</PrintTH>
              <PrintTH>Nom et prénom</PrintTH>
              <PrintTH>Poste</PrintTH>
              <PrintTH>Département</PrintTH>
              <PrintTH>Embauche</PrintTH>
              <PrintTH align="right">Salaire de base</PrintTH>
              <PrintTH align="right">Commission</PrintTH>
              <PrintTH>Statut</PrintTH>
            </tr>
          </thead>
          <tbody>
            {employees.map((employe, index) => (
              <tr key={employe.id}>
                <PrintTD align="right" className="text-surface-500">
                  {index + 1}
                </PrintTD>
                <PrintTD className="font-mono text-[0.68rem]">{employe.matricule}</PrintTD>
                <PrintTD className="font-medium text-surface-900">
                  {employe.lastName.toUpperCase()} {employe.firstName}
                </PrintTD>
                <PrintTD>{employe.positionTitle ?? "—"}</PrintTD>
                <PrintTD>{employe.departmentName ?? "—"}</PrintTD>
                <PrintTD className="whitespace-nowrap">
                  {formatDateShort(employe.hireDate)}
                </PrintTD>
                <PrintTD align="right">{formatMoney(employe.baseSalary)}</PrintTD>
                <PrintTD align="right">
                  {employe.commissionRate > 0 ? formatPercent(employe.commissionRate) : "—"}
                </PrintTD>
                <PrintTD>{EMPLOYEE_STATUS_LABELS[employe.status]}</PrintTD>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-primary-900 bg-primary-50">
              <td
                colSpan={6}
                className="px-2 py-1.5 text-right text-[0.68rem] font-bold uppercase text-primary-900"
              >
                Masse salariale mensuelle des lignes imprimées
              </td>
              <td className="px-2 py-1.5 text-right text-[0.72rem] font-bold tabular-nums text-primary-900">
                {formatMoney(masseSalariale)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </PrintTable>
      )}

      <DocumentFooter
        note={
          tronquee
            ? `Seules les ${formatNumber(MAX_LIGNES_IMPRIMEES)} premières lignes sont imprimées sur les ${formatNumber(total)} correspondant aux critères. Affinez les filtres pour obtenir un état complet.`
            : "Document interne — la masse salariale ne doit pas être diffusée hors de la direction."
        }
        editedBy={editedBy}
        editedAt={new Date()}
      />
    </PrintSheet>
  );
}
