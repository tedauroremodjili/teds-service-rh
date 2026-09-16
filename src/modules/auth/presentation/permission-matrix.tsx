"use client";

import { useActionState, useMemo, useState } from "react";
import { RotateCcw, Save, ShieldCheck } from "lucide-react";

import { PERMISSION_MODULES } from "@/modules/auth/domain/permissions";
import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";

/**
 * Matrice d'attribution des droits, module par module.
 *
 * Un seul composant pour les deux echelles du systeme : les droits d'un ROLE
 * (socle partage par plusieurs comptes) et ceux d'un COMPTE precis (ecart par
 * rapport a son role). Dans les deux cas le formulaire envoie la liste complete
 * des droits souhaites, et c'est le domaine qui en deduit ce qu'il faut ecrire.
 *
 * La Server Action arrive en prop : React n'envoie au navigateur qu'une
 * reference, appelee ensuite par une requete POST. C'est ce qui permet de
 * partager l'ecran entre `/roles` et `/utilisateurs` sans dupliquer une ligne.
 */

export interface PermissionMatrixState {
  message?: string;
  tone?: "success" | "danger";
}

interface PermissionMatrixProps {
  action: (state: PermissionMatrixState, formData: FormData) => Promise<PermissionMatrixState>;
  /** Droits coches a l'ouverture. */
  current: string[];
  /**
   * Socle de reference, quand il en existe un (les droits du role, sur la fiche
   * d'un compte). Absent pour un role : il EST le socle.
   */
  base?: string[];
  /** Phrase affichee en tete, qui rappelle ce qu'on est en train de modifier. */
  summary: string;
  editable: boolean;
  /** Libelle du bouton de remise a zero, quand un socle existe. */
  resetLabel?: string;
  /**
   * Insere dans un formulaire existant (creation d'un role) : la matrice ne
   * porte alors ni balise `form`, ni bouton d'enregistrement — un formulaire
   * imbrique dans un autre n'est pas du HTML valide, et le navigateur en
   * abandonnerait silencieusement une partie a la soumission.
   */
  embedded?: boolean;
}

export function PermissionMatrix({
  action,
  current,
  base,
  summary,
  editable,
  resetLabel = "Revenir au socle",
  embedded = false,
}: PermissionMatrixProps) {
  const socle = useMemo(() => new Set(base ?? []), [base]);
  const initial = useMemo(() => new Set(current), [current]);

  const [selection, setSelection] = useState<Set<string>>(() => new Set(current));
  const [state, formAction, pending] = useActionState<PermissionMatrixState, FormData>(
    action,
    {},
  );

  const basculer = (code: string) => {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      if (suivante.has(code)) suivante.delete(code);
      else suivante.add(code);
      return suivante;
    });
  };

  const basculerModule = (codes: string[], tout: boolean) => {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      for (const code of codes) {
        if (tout) suivante.add(code);
        else suivante.delete(code);
      }
      return suivante;
    });
  };

  const modifie =
    selection.size !== initial.size || [...selection].some((code) => !initial.has(code));

  const accordees = [...selection].filter((code) => !socle.has(code)).length;
  const retirees = [...socle].filter((code) => !selection.has(code)).length;

  const Enveloppe = embedded ? "div" : "form";
  const proprietesForm = embedded ? {} : { action: formAction };

  return (
    <Enveloppe {...proprietesForm} className="space-y-4">
      {state.message ? (
        <Alert tone={state.tone === "danger" ? "danger" : "success"}>{state.message}</Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-200 bg-surface-50 px-4 py-3 text-sm">
        <p className="flex items-center gap-2 text-surface-600">
          <ShieldCheck className="size-4 shrink-0 text-primary-700" />
          <span>
            {summary}{" "}
            <span className="text-surface-500">
              {base
                ? `${accordees} accordé${accordees > 1 ? "s" : ""} en plus, ${retirees} retiré${retirees > 1 ? "s" : ""}.`
                : `${selection.size} droit${selection.size > 1 ? "s" : ""} coché${selection.size > 1 ? "s" : ""}.`}
            </span>
          </span>
        </p>

        {editable && !embedded ? (
          <div className="flex items-center gap-2">
            {base ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelection(new Set(socle))}
                disabled={pending}
              >
                <RotateCcw className="size-4" />
                {resetLabel}
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={pending || !modifie}>
              <Save className="size-4" />
              {pending ? "Enregistrement…" : "Enregistrer les droits"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PERMISSION_MODULES.map((module) => {
          const codes = module.permissions.map((permission) => permission.code as string);
          const cochees = codes.filter((code) => selection.has(code)).length;

          return (
            <fieldset
              key={module.key}
              className="rounded-lg border border-surface-200 bg-white p-4"
            >
              <legend className="flex w-full items-baseline justify-between gap-2 px-1">
                <span className="text-sm font-semibold text-surface-800">{module.label}</span>
                <span className="text-xs text-surface-500">
                  {cochees}/{codes.length}
                </span>
              </legend>

              <p className="mb-3 text-xs text-surface-500">{module.description}</p>

              <ul className="space-y-1.5">
                {module.permissions.map((permission) => {
                  const code = permission.code as string;
                  const venuDuSocle = socle.has(code);
                  const coche = selection.has(code);

                  return (
                    <li key={code}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1 hover:bg-surface-50">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={code}
                          checked={coche}
                          onChange={() => basculer(code)}
                          disabled={!editable || pending}
                          className="mt-0.5 size-4 shrink-0 rounded border-surface-300 text-primary-700 accent-primary-700 disabled:opacity-50"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-surface-700">
                            {permission.label}
                          </span>
                          <span className="block font-mono text-[11px] text-surface-400">
                            {code}
                          </span>
                        </span>
                        {/* Repere visuel : d'ou vient ce droit ? Sans socle de
                            reference (edition d'un role), la question n'a pas
                            lieu d'etre. */}
                        {base && venuDuSocle && coche ? (
                          <span className="mt-0.5 shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-medium text-surface-600">
                            rôle
                          </span>
                        ) : null}
                        {base && venuDuSocle && !coche ? (
                          <span className="mt-0.5 shrink-0 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-medium text-danger-700">
                            retiré
                          </span>
                        ) : null}
                        {base && !venuDuSocle && coche ? (
                          <span className="mt-0.5 shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-[10px] font-medium text-success-700">
                            ajouté
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>

              {editable ? (
                <div className="mt-3 flex gap-3 border-t border-surface-100 pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => basculerModule(codes, true)}
                    className="text-primary-700 hover:underline"
                    disabled={pending}
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={() => basculerModule(codes, false)}
                    className="text-surface-500 hover:underline"
                    disabled={pending}
                  >
                    Tout décocher
                  </button>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </Enveloppe>
  );
}
