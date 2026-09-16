import type { EmployeeDetail } from "@/modules/employees/domain/employee-repository";
import {
  EMPLOYEE_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
} from "@/modules/employees/presentation/employee-status-badge";
import {
  computeAge,
  formatDate,
  formatMoney,
  formatPercent,
  formatSeniority,
} from "@/shared/lib/format";

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
 * Fiche du personnel.
 *
 * Le dossier papier d'un employe est encore la piece que reclament l'inspection
 * du travail, la banque a l'ouverture d'un compte et la caisse de securite
 * sociale. Elle reprend l'etat civil, la situation professionnelle et la
 * remuneration, avec la signature des deux parties.
 *
 * Le module employees a ses propres pages (ce n'est pas une ressource du
 * catalogue), d'ou cette piece dediee plutot que la fiche generique.
 */
export function EmployeeDocument({
  employee,
  company,
  editedBy,
}: {
  employee: EmployeeDetail;
  company: CompanyIdentity;
  editedBy: string | null;
}) {
  const nomComplet = `${employee.lastName.toUpperCase()} ${employee.firstName}`;

  return (
    <PrintSheet>
      <Letterhead company={company} />

      <DocumentCartouche
        title="Fiche du personnel"
        subtitle={nomComplet}
        reference={employee.matricule}
        referenceLabel="Matricule"
        issuedAt={new Date()}
      />

      <Section title="État civil">
        <DefinitionGrid
          columns={3}
          items={[
            { label: "Nom et prénom", value: nomComplet },
            { label: "Sexe", value: GENDER_LABELS[employee.gender] ?? employee.gender },
            {
              label: "État civil",
              value: MARITAL_STATUS_LABELS[employee.maritalStatus] ?? employee.maritalStatus,
            },
            {
              label: "Date de naissance",
              value: `${formatDate(employee.birthDate)} (${computeAge(employee.birthDate)} ans)`,
            },
            { label: "Lieu de naissance", value: employee.birthPlace ?? "—" },
            { label: "Nationalité", value: employee.nationality },
          ]}
        />
      </Section>

      <Section title="Coordonnées">
        <DefinitionGrid
          columns={3}
          items={[
            { label: "Téléphone", value: employee.phone },
            { label: "Adresse électronique", value: employee.email },
            { label: "Adresse", value: employee.address ?? "—" },
          ]}
        />
      </Section>

      <Section title="Situation professionnelle">
        <DefinitionGrid
          columns={3}
          items={[
            { label: "Département", value: employee.departmentName ?? "Non affecté" },
            { label: "Poste", value: employee.positionTitle ?? "Non défini" },
            { label: "Statut", value: EMPLOYEE_STATUS_LABELS[employee.status] },
            { label: "Date d'embauche", value: formatDate(employee.hireDate) },
            { label: "Ancienneté", value: formatSeniority(employee.hireDate) },
            {
              label: "Compte utilisateur",
              value: employee.hasUserAccount ? "Ouvert" : "Aucun",
            },
          ]}
        />
      </Section>

      <Section title="Rémunération">
        <DefinitionGrid
          columns={3}
          items={[
            { label: "Salaire de base mensuel", value: formatMoney(employee.baseSalary) },
            {
              label: "Taux de commission",
              value:
                employee.commissionRate > 0
                  ? formatPercent(employee.commissionRate)
                  : "Aucune commission",
            },
            {
              label: "Salaire annuel brut indicatif",
              value: formatMoney(employee.baseSalary * 12),
            },
          ]}
        />
      </Section>

      <SignatureRow
        signatures={[
          { role: "L'employé", name: nomComplet, hint: "Certifie exactes les informations ci-dessus" },
          { role: "Le responsable des ressources humaines", hint: "Cachet et signature" },
        ]}
      />

      <DocumentFooter
        note={`Fiche créée le ${formatDate(employee.createdAt)}, mise à jour le ${formatDate(employee.updatedAt)}. Document interne — toute diffusion est soumise à autorisation.`}
        editedBy={editedBy}
        editedAt={new Date()}
      />
    </PrintSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-avoid-break mb-5">
      <h2 className="mb-2 border-b border-surface-300 pb-1 text-[0.7rem] font-bold uppercase tracking-wider text-primary-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
