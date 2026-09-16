"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { type RoleName } from "@/modules/auth/domain/permissions";
import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Select } from "@/shared/ui/form";

import { changeUserRoleAction, changeUserStatusAction, type AccessFormState } from "./actions";
import { USER_STATUSES, USER_STATUS_LABELS, type UserStatus } from "../domain/user-account";

/**
 * Reglages du compte : role et statut.
 *
 * Deux formulaires distincts, volontairement : changer le role remet a zero
 * les droits attribues individuellement, alors que suspendre un compte ne
 * touche a rien. Les melanger dans un seul bouton « Enregistrer » rendrait
 * cette difference invisible.
 */

interface AccountSettingsProps {
  userId: string;
  role: RoleName;
  /**
   * Roles disponibles, lus en base par la page. Depuis que les roles se creent
   * depuis /roles, une liste figee dans le code en omettrait.
   */
  roles: Array<{ name: string; label: string; description: string | null }>;
  status: UserStatus;
  /** `roles.manage` — le role est modifiable. */
  canManageRoles: boolean;
  /** `users.manage` — le statut est modifiable. */
  canManageUsers: boolean;
  /** Vrai si la fiche est celle de l'utilisateur connecte. */
  isSelf: boolean;
}

export function AccountSettings({
  userId,
  role,
  roles,
  status,
  canManageRoles,
  canManageUsers,
  isSelf,
}: AccountSettingsProps) {
  const [roleState, roleAction, rolePending] = useActionState<AccessFormState, FormData>(
    changeUserRoleAction.bind(null, userId),
    {},
  );
  const [statusState, statusAction, statusPending] = useActionState<AccessFormState, FormData>(
    changeUserStatusAction.bind(null, userId),
    {},
  );

  return (
    <div className="space-y-5">
      {isSelf ? (
        <Alert tone="info">
          Il s&apos;agit de votre propre compte : ni son rôle ni ses droits ne peuvent être
          modifiés depuis ici. Un autre administrateur doit s&apos;en charger.
        </Alert>
      ) : null}

      <form action={roleAction} className="space-y-3">
        {roleState.message ? (
          <Alert tone={roleState.tone === "danger" ? "danger" : "success"}>
            {roleState.message}
          </Alert>
        ) : null}

        <Field
          label="Rôle"
          htmlFor="role"
          hint="Le rôle donne le socle de droits. Le changer efface les droits attribués individuellement."
        >
          <Select
            id="role"
            name="role"
            defaultValue={role}
            disabled={!canManageRoles || isSelf || rolePending}
          >
            {roles.map((disponible) => (
              <option
                key={disponible.name}
                value={disponible.name}
                title={disponible.description ?? undefined}
              >
                {disponible.label}
              </option>
            ))}
          </Select>
        </Field>

        {canManageRoles && !isSelf ? (
          <Button type="submit" variant="outline" size="sm" disabled={rolePending}>
            <Check className="size-4" />
            {rolePending ? "Modification…" : "Changer le rôle"}
          </Button>
        ) : null}
      </form>

      <form action={statusAction} className="space-y-3 border-t border-surface-200 pt-5">
        {statusState.message ? (
          <Alert tone={statusState.tone === "danger" ? "danger" : "success"}>
            {statusState.message}
          </Alert>
        ) : null}

        <Field
          label="Statut du compte"
          htmlFor="status"
          hint="Un compte inactif ou suspendu ne peut plus se connecter, et ses sessions ouvertes cessent d'être valides."
        >
          <Select
            id="status"
            name="status"
            defaultValue={status}
            disabled={!canManageUsers || isSelf || statusPending}
          >
            {USER_STATUSES.map((valeur) => (
              <option key={valeur} value={valeur}>
                {USER_STATUS_LABELS[valeur]}
              </option>
            ))}
          </Select>
        </Field>

        {canManageUsers && !isSelf ? (
          <Button type="submit" variant="outline" size="sm" disabled={statusPending}>
            <Check className="size-4" />
            {statusPending ? "Modification…" : "Appliquer le statut"}
          </Button>
        ) : null}
      </form>
    </div>
  );
}
