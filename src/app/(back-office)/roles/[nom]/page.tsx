import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ShieldCheck, Trash2, Users } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_DESCRIPTIONS,
} from "@/modules/auth/domain/permissions";
import { PermissionMatrix } from "@/modules/auth/presentation/permission-matrix";
import { can } from "@/modules/auth/domain/session";
import { getRole } from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import { updateRolePermissionsAction } from "@/modules/roles/presentation/actions";
import { DeleteRoleButton } from "@/modules/roles/presentation/delete-role-button";
import { LinkButton } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ nom: string }>;
}): Promise<Metadata> {
  const { nom } = await props.params;
  const result = await getRole(prismaRoleRepository, nom);
  return { title: result.ok ? result.value.label : "Rôle" };
}

/** Socle de droits d'un rôle : la même matrice que sur une fiche de compte. */
export default async function FicheRolePage(props: { params: Promise<{ nom: string }> }) {
  const actor = await requirePermission(PERMISSIONS.USERS_READ);
  const { nom } = await props.params;

  const result = await getRole(prismaRoleRepository, nom);
  if (!result.ok) {
    notFound();
  }

  const role = result.value;
  const joker = role.name === "SUPER_ADMIN";
  const soiMeme = actor.role === role.name;
  const modifiable = can(actor, PERMISSIONS.ROLES_MANAGE) && !joker && !soiMeme;

  return (
    <>
      <PageHeader
        title={role.label}
        description={role.description ?? ROLE_DESCRIPTIONS[role.name]}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Rôles", href: "/roles" },
          { label: role.label },
        ]}
        actions={
          <>
            <LinkButton href={`/utilisateurs?role=${role.name}`} variant="outline">
              <Users className="size-4" />
              Utilisateurs
            </LinkButton>
            {can(actor, PERMISSIONS.ROLES_MANAGE) ? (
              <LinkButton href={`/roles/${role.name}/modifier`} variant="outline">
                <Pencil className="size-4" />
                Renommer
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Card>
        <CardHeader
          title="Socle de droits"
          description={`${role.userCount} compte${role.userCount > 1 ? "s portent" : " porte"} ce rôle.`}
          icon={<ShieldCheck className="size-4" />}
        />
        <CardBody className="space-y-4">
          {joker ? (
            <Alert tone="info" title="Rôle à tous les droits">
              Le super administrateur détient le joker <code>*</code> : toutes les permissions lui
              sont acquises, présentes et futures. C&apos;est ce qui garantit qu&apos;une
              manipulation malheureuse ne laisse jamais le système sans administrateur.
            </Alert>
          ) : null}

          {!joker && soiMeme ? (
            <Alert tone="info">
              C&apos;est votre propre rôle : vous ne pouvez pas en modifier le socle. Sans cette
              règle, la permission « Attribuer rôles et permissions » suffirait à s&apos;octroyer
              tout le reste. Un autre administrateur doit s&apos;en charger.
            </Alert>
          ) : null}

          {!joker && !can(actor, PERMISSIONS.ROLES_MANAGE) ? (
            <Alert tone="info">
              Lecture seule : la permission « Attribuer rôles et permissions » est requise pour
              modifier ce socle.
            </Alert>
          ) : null}

          {!joker && modifiable ? (
            <Alert tone="warning">
              Ce que vous cochez ici s&apos;applique à{" "}
              <strong>
                {role.userCount} compte{role.userCount > 1 ? "s" : ""}
              </strong>
              . Pour n&apos;ouvrir un accès qu&apos;à une personne, passez par sa fiche dans{" "}
              <Link href="/utilisateurs" className="font-medium underline">
                Utilisateurs
              </Link>
              .
            </Alert>
          ) : null}

          {/* Toujours affichée : grisée quand elle n'est pas modifiable, et
              entièrement cochée pour le joker — on doit pouvoir LIRE ce que
              donne un rôle même sans avoir le droit de le changer. */}
          <PermissionMatrix
            action={updateRolePermissionsAction.bind(null, role.name)}
            current={joker ? [...ALL_PERMISSIONS] : role.permissions}
            summary={
              joker
                ? "Toutes les permissions, présentes et futures."
                : `Socle du rôle ${role.label}.`
            }
            editable={modifiable}
          />
        </CardBody>
      </Card>

      {!role.isSystem && can(actor, PERMISSIONS.ROLES_MANAGE) ? (
        <Card className="mt-5 border-danger-500/30">
          <CardHeader
            title="Supprimer le rôle"
            description="Possible uniquement si plus aucun compte ne le porte."
            icon={<Trash2 className="size-4" />}
          />
          <CardBody>
            <DeleteRoleButton name={role.name} label={role.label} />
          </CardBody>
        </Card>
      ) : null}

      <Card className="mt-5">
        <CardHeader
          title="Comptes concernés"
          description="Les titulaires de ce rôle."
          icon={<Users className="size-4" />}
        />
        <CardBody>
          <p className="text-sm text-surface-600">
            {role.userCount === 0
              ? "Aucun compte ne porte ce rôle pour l'instant."
              : `${role.userCount} compte${role.userCount > 1 ? "s" : ""} — ouvrez la liste filtrée sur ce rôle.`}
          </p>
          <Link
            href={`/utilisateurs?role=${role.name}`}
            className="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline"
          >
            Voir les comptes concernés
          </Link>
        </CardBody>
      </Card>
    </>
  );
}
