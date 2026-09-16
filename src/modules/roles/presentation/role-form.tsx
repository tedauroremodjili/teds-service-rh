"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { IdCard, Save, ShieldCheck } from "lucide-react";

import { toRoleName } from "@/modules/auth/domain/permissions";
import { PermissionMatrix } from "@/modules/auth/presentation/permission-matrix";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Textarea } from "@/shared/ui/form";

import { createRoleAction, updateRoleInfoAction, type RoleFormState } from "./actions";

/**
 * Formulaire d'un role.
 *
 * Deux blocs bien distincts, meme s'ils partagent le meme formulaire : ce
 * qu'EST le role (nom, identifiant, description) d'un cote, ce qu'il DONNE
 * (les droits) de l'autre. Les melanger dans une seule carte les faisait lire
 * comme une seule longue liste de champs, alors que ce sont deux decisions
 * differentes.
 *
 * A la creation, les deux blocs sont presents : on choisit le nom ET le socle
 * en une fois, un seul geste, une seule Server Action. En modification, seul
 * le bloc identite reste ici — le socle a son propre formulaire sur la fiche,
 * parce qu'il touche tous les titulaires et merite son propre geste.
 */
export function RoleForm({
  role,
}: {
  /** Absent a la creation. */
  role?: { name: string; label: string; description: string | null };
}) {
  const action = role ? updateRoleInfoAction.bind(null, role.name) : createRoleAction;
  const [state, formAction, pending] = useActionState<RoleFormState, FormData>(action, {});

  const [label, setLabel] = useState(role?.label ?? state.values?.label ?? "");
  const identifiant = role?.name ?? toRoleName(label);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Card>
        <CardHeader
          title="Informations du rôle"
          description="Son nom et ce qu'il représente."
          icon={<IdCard className="size-4.5" />}
        />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nom du rôle"
              htmlFor="label"
              error={state.fieldErrors?.label}
              hint="Ce que verront les administrateurs : « Responsable caisse », « Stagiaire RH »…"
              required
            >
              <Input
                id="label"
                name="label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                hasError={Boolean(state.fieldErrors?.label)}
                required
              />
            </Field>

            <Field
              label="Identifiant technique"
              htmlFor="identifiant"
              hint={
                role
                  ? "Fixé à la création : il est cité dans le journal d'audit et dans les URL."
                  : "Déduit du nom ; il ne changera plus une fois le rôle créé."
              }
            >
              <Input
                id="identifiant"
                value={identifiant}
                readOnly
                disabled
                className="font-mono text-xs"
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              error={state.fieldErrors?.description}
              hint="À quoi sert ce rôle, en une phrase."
              className="md:col-span-2"
            >
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={role?.description ?? state.values?.description ?? ""}
              />
            </Field>
          </div>
        </CardBody>
      </Card>

      {role ? null : (
        <Card>
          <CardHeader
            title="Permissions du rôle"
            description="Ce que touchera tout compte qui portera ce rôle, module par module."
            icon={<ShieldCheck className="size-4.5" />}
          />
          <CardBody>
            {/*
              La matrice partage le formulaire du rôle : ses cases voyagent
              sous le nom « permissions » et sont lues par la même Server
              Action. Son bouton d'enregistrement est masqué — c'est celui du
              formulaire, en bas, qui crée le rôle et son socle d'un seul
              geste.
            */}
            <PermissionMatrix
              action={createRoleAction}
              current={[]}
              summary="Cochez les droits que ce rôle doit donner."
              editable
              embedded
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardFooter>
          <Link
            href={role ? `/roles/${role.name}` : "/roles"}
            className="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={pending}>
            <Save className="size-4" />
            {pending ? "Enregistrement…" : role ? "Enregistrer" : "Créer le rôle"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
