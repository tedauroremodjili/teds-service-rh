import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archive, KeyRound, Pencil, ShieldCheck, UserCog } from "lucide-react";

import { requirePermission } from "@/infrastructure/auth/dal";
import { ALL_PERMISSIONS, PERMISSIONS, roleLabel } from "@/modules/auth/domain/permissions";
import { can } from "@/modules/auth/domain/session";
import { getUserAccess } from "@/modules/users/application/user-use-cases";
import { listRoles } from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import { prismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";
import { AccountSettings } from "@/modules/users/presentation/account-settings";
import { ArchiveUserButton } from "@/modules/users/presentation/archive-user-button";
import { LinkButton } from "@/shared/ui/button";
import { PermissionMatrix } from "@/modules/auth/presentation/permission-matrix";
import { updateUserPermissionsAction } from "@/modules/users/presentation/actions";
import { RoleBadge, UserStatusBadge } from "@/modules/users/presentation/user-status-badge";
import { formatDateTime } from "@/shared/lib/format";
import { Avatar } from "@/shared/ui/avatar";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { PageHeader } from "@/shared/ui/page-header";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const result = await getUserAccess(prismaUserRepository, id);

  return { title: result.ok ? result.value.user.displayName : "Utilisateur" };
}

/**
 * Fiche d'un compte : ses reglages et, surtout, ses droits.
 *
 * C'est ici qu'on attribue des permissions a l'utilisateur de son choix, module
 * par module. La page se contente de lire — toute ecriture passe par les Server
 * Actions du module, qui re-verifient l'autorisation.
 */
export default async function FicheUtilisateurPage(props: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission(PERMISSIONS.USERS_READ);
  const { id } = await props.params;

  // Les rôles proposés sont lus en base : ils se créent depuis /roles, une
  // liste figée dans le code en omettrait.
  const [result, roles] = await Promise.all([
    getUserAccess(prismaUserRepository, id),
    listRoles(prismaRoleRepository),
  ]);

  if (!result.ok) {
    notFound();
  }

  const { user, fromRole, effective } = result.value;

  const isSelf = actor.id === user.id;
  const canManageRoles = can(actor, PERMISSIONS.ROLES_MANAGE);
  const canManageUsers = can(actor, PERMISSIONS.USERS_MANAGE);
  // Le super administrateur detient le joker : ses droits ne se detaillent pas.
  const roleJoker = user.role === "SUPER_ADMIN";
  const matriceModifiable = canManageRoles && !isSelf && !roleJoker;

  // `displayName` vaut « Prénom Nom » pour un compte rattaché à un employé, et
  // l'email sinon : on le decoupe seulement pour les initiales de l'avatar.
  const [prenom = user.email, ...reste] = user.displayName.split(" ");

  return (
    <>
      <PageHeader
        title={user.displayName}
        description={user.email}
        breadcrumbs={[
          { label: "Accueil", href: "/tableau-de-bord" },
          { label: "Utilisateurs", href: "/utilisateurs" },
          { label: user.displayName },
        ]}
        actions={
          canManageUsers ? (
            <LinkButton href={`/utilisateurs/${user.id}/modifier`} variant="outline">
              <Pencil className="size-4" />
              Modifier
            </LinkButton>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardBody className="flex items-start gap-4">
              <Avatar firstName={prenom} lastName={reste.join(" ")} size="lg" />
              <div className="min-w-0 space-y-2">
                <p className="truncate font-semibold text-surface-800">{user.displayName}</p>
                <div className="flex flex-wrap gap-2">
                  <RoleBadge role={user.role} />
                  <UserStatusBadge status={user.status} />
                </div>
                <dl className="space-y-1 text-xs text-surface-500">
                  <div>
                    <dt className="inline">Dernière connexion : </dt>
                    <dd className="inline">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "jamais"}
                    </dd>
                  </div>
                  {user.matricule ? (
                    <div>
                      <dt className="inline">Matricule : </dt>
                      <dd className="inline font-mono">{user.matricule}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline">Droits effectifs : </dt>
                    <dd className="inline">
                      {roleJoker ? "tous (joker)" : `${effective.length}`}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Réglages du compte"
              description="Rôle et statut."
              icon={<UserCog className="size-4" />}
            />
            <CardBody>
              <AccountSettings
                userId={user.id}
                role={user.role}
                roles={roles}
                status={user.status}
                canManageRoles={canManageRoles}
                canManageUsers={canManageUsers}
                isSelf={isSelf}
              />
            </CardBody>
          </Card>

          {canManageUsers && !isSelf ? (
            <Card className="border-danger-500/30">
              <CardHeader
                title="Archiver le compte"
                description="Il ne pourra plus se connecter ; son historique est conservé."
                icon={<Archive className="size-4" />}
              />
              <CardBody>
                <ArchiveUserButton userId={user.id} label={user.displayName} />
              </CardBody>
            </Card>
          ) : null}

          {user.mustChangePassword || user.lockedUntil ? (
            <Card>
              <CardHeader
                title="Sécurité"
                description="État de l'accès au compte."
                icon={<KeyRound className="size-4" />}
              />
              <CardBody className="space-y-2 text-sm text-surface-600">
                {user.mustChangePassword ? (
                  <p>Changement de mot de passe exigé à la prochaine connexion.</p>
                ) : null}
                {user.lockedUntil ? (
                  <p>
                    Compte verrouillé jusqu&apos;au{" "}
                    <strong>{formatDateTime(user.lockedUntil)}</strong> après plusieurs échecs de
                    connexion.
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader
            title="Permissions"
            description="Cochez les droits que doit détenir ce compte. Seul l'écart avec le rôle est enregistré."
            icon={<ShieldCheck className="size-4" />}
          />
          <CardBody className="space-y-4">
            {roleJoker ? (
              <Alert tone="info" title="Rôle à tous les droits">
                Le super administrateur dispose du joker <code>*</code> : toutes les permissions
                lui sont acquises, présentes et futures. Pour restreindre ce compte, changez son
                rôle plutôt que de retirer des droits un par un.
              </Alert>
            ) : null}

            {!roleJoker && !canManageRoles ? (
              <Alert tone="info">
                Lecture seule : la permission « Attribuer rôles et permissions » est requise pour
                modifier ces droits.
              </Alert>
            ) : null}

            {/*
              La matrice est TOUJOURS affichée, grisée quand elle n'est pas
              modifiable. Masquer les modules laisserait croire qu'ils n'existent
              pas, alors que la question posée ici est « que détient ce compte ? »
              — et la réponse vaut d'être lue même sans droit de la changer.
            */}
            <PermissionMatrix
              action={updateUserPermissionsAction.bind(null, user.id)}
              base={roleJoker ? undefined : fromRole}
              current={roleJoker ? [...ALL_PERMISSIONS] : effective}
              summary={
                roleJoker
                  ? "Toutes les permissions, présentes et futures."
                  : `Socle du rôle ${roleLabel(user.role)} : ${fromRole.length} droit${fromRole.length > 1 ? "s" : ""}.`
              }
              resetLabel="Revenir au rôle"
              editable={matriceModifiable}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
