import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  Briefcase,
  CalendarDays,
  IdCard,
  Mail,
  MapPin,
  Pencil,
  Percent,
  Phone,
  Printer,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { getEmployee } from "@/modules/employees/application/employee-use-cases";
import { prismaEmployeeRepository } from "@/modules/employees/infrastructure/prisma-employee-repository";
import { ArchiveEmployeeButton } from "@/modules/employees/presentation/archive-employee-button";
import {
  EmployeeStatusBadge,
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
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { LinkButton } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getEmployee(prismaEmployeeRepository, id);

  return {
    title: result.ok ? `${result.value.firstName} ${result.value.lastName}` : "Employé",
  };
}

export default async function FicheEmployePage(props: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.EMPLOYEES_READ);
  const { id } = await props.params;

  const result = await getEmployee(prismaEmployeeRepository, id);
  if (!result.ok) {
    notFound();
  }

  const employe = result.value;
  const peutModifier = can(user, PERMISSIONS.EMPLOYEES_UPDATE);
  const peutSupprimer = can(user, PERMISSIONS.EMPLOYEES_DELETE);

  return (
    <>
      <PageHeader
        title={`${employe.firstName} ${employe.lastName}`}
        description={`Matricule ${employe.matricule}`}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Employés", href: "/employes" },
          { label: `${employe.firstName} ${employe.lastName}` },
        ]}
        actions={
          <>
            <LinkButton href={`/employes/${id}/remuneration`} variant="outline">
              <Scale className="size-4" />
              Rémunération
            </LinkButton>
            <LinkButton href={`/employes/${id}/impression`} variant="outline">
              <Printer className="size-4" />
              Fiche du personnel
            </LinkButton>
            {peutModifier ? (
              <LinkButton href={`/employes/${id}/modifier`} variant="outline">
                <Pencil className="size-4" />
                Modifier
              </LinkButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* --- Carte d'identite ------------------------------------------ */}
        <Card className="lg:col-span-1">
          <CardBody className="flex flex-col items-center text-center">
            <Avatar
              firstName={employe.firstName}
              lastName={employe.lastName}
              photoUrl={employe.photoUrl}
              size="xl"
            />
            <h2 className="mt-4 text-lg font-bold text-primary-900">
              {employe.firstName} {employe.lastName}
            </h2>
            <p className="text-sm text-surface-500">
              {employe.positionTitle ?? "Poste non défini"}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <EmployeeStatusBadge status={employe.status} />
              {employe.hasUserAccount ? (
                <Badge tone="primary">
                  <ShieldCheck className="size-3" />
                  Compte actif
                </Badge>
              ) : null}
            </div>

            <dl className="mt-6 w-full space-y-3 text-left">
              <InfoLine icon={<IdCard className="size-4" />} label="Matricule">
                <span className="font-mono">{employe.matricule}</span>
              </InfoLine>
              <InfoLine icon={<Phone className="size-4" />} label="Téléphone">
                <a href={`tel:${employe.phone}`} className="hover:text-primary-700">
                  {employe.phone}
                </a>
              </InfoLine>
              <InfoLine icon={<Mail className="size-4" />} label="Email">
                <a
                  href={`mailto:${employe.email}`}
                  className="break-all hover:text-primary-700"
                >
                  {employe.email}
                </a>
              </InfoLine>
              {employe.address ? (
                <InfoLine icon={<MapPin className="size-4" />} label="Adresse">
                  {employe.address}
                </InfoLine>
              ) : null}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* --- Situation professionnelle ----------------------------- */}
          <Card>
            <CardHeader
              title="Situation professionnelle"
              description="Données utilisées par la paie et les commissions"
              icon={<Briefcase className="size-4.5" />}
            />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Département" value={employe.departmentName ?? "Non affecté"} />
                <Detail label="Poste" value={employe.positionTitle ?? "Non défini"} />
                <Detail
                  label="Date d'embauche"
                  value={formatDate(employe.hireDate)}
                  hint={`Ancienneté : ${formatSeniority(employe.hireDate)}`}
                />
                <Detail label="Statut" value={<EmployeeStatusBadge status={employe.status} />} />
                <Detail
                  label="Salaire de base"
                  value={
                    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-primary-900">
                      <Wallet className="size-4 text-primary-600" />
                      {formatMoney(employe.baseSalary)}
                    </span>
                  }
                  hint="Par mois"
                />
                <Detail
                  label="Taux de commission"
                  value={
                    employe.commissionRate > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-base font-semibold text-accent-600">
                        <Percent className="size-4" />
                        {formatPercent(employe.commissionRate)}
                      </span>
                    ) : (
                      "Aucune commission"
                    )
                  }
                  hint={
                    employe.commissionRate > 0
                      ? `Ex. : une vente de 300 000 FCFA rapporte ${formatMoney(
                          Math.round((300_000 * employe.commissionRate) / 100),
                        )}`
                      : undefined
                  }
                />
              </dl>
            </CardBody>
          </Card>

          {/* --- Etat civil ------------------------------------------- */}
          <Card>
            <CardHeader
              title="Informations personnelles"
              icon={<CalendarDays className="size-4.5" />}
            />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Detail label="Sexe" value={GENDER_LABELS[employe.gender] ?? employe.gender} />
                <Detail
                  label="État civil"
                  value={MARITAL_STATUS_LABELS[employe.maritalStatus] ?? employe.maritalStatus}
                />
                <Detail
                  label="Date de naissance"
                  value={formatDate(employe.birthDate)}
                  hint={`${computeAge(employe.birthDate)} ans`}
                />
                <Detail label="Lieu de naissance" value={employe.birthPlace ?? "—"} />
                <Detail label="Nationalité" value={employe.nationality} />
              </dl>
            </CardBody>
          </Card>

          {/* --- Modules a venir --------------------------------------- */}
          <Card>
            <CardHeader
              title="Dossier complet"
              description="Ces onglets s'activeront à mesure que les modules seront livrés"
            />
            <CardBody>
              <ul className="grid gap-2 sm:grid-cols-2">
                {[
                  "Contrats",
                  "Présences et congés",
                  "Fiches de paie",
                  "Commissions",
                  "Documents administratifs",
                  "Ventes réalisées",
                ].map((libelle) => (
                  <li
                    key={libelle}
                    className="flex items-center justify-between rounded-lg border border-dashed border-surface-300 px-3 py-2 text-sm text-surface-500"
                  >
                    {libelle}
                    <Badge tone="neutral">bientôt</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {peutSupprimer ? (
            <Card className="border-danger-500/30">
              <CardHeader
                title="Archiver la fiche"
                description="L'employé sort des listes ; son historique de paie et de ventes est conservé."
                icon={<Archive className="size-4" />}
              />
              <CardBody>
                <ArchiveEmployeeButton
                  employeeId={id}
                  label={`${employe.firstName} ${employe.lastName}`}
                />
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-xs text-surface-400">
        Fiche créée le {formatDate(employe.createdAt)} — dernière modification le{" "}
        {formatDate(employe.updatedAt)}.{" "}
        <Link href="/employes" className="text-primary-700 hover:underline">
          Retour à la liste
        </Link>
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function InfoLine({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-surface-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-surface-500">{label}</dt>
        <dd className="text-sm text-surface-700">{children}</dd>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-surface-500">{label}</dt>
      <dd className="mt-1 text-sm text-surface-800">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-surface-400">{hint}</p> : null}
    </div>
  );
}
