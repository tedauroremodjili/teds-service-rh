"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/form";

import {
  ACTIVITES,
  ACTIVITE_LABELS,
  ASSIETTES,
  ASSIETTE_LABELS,
  MODES,
  MODE_LABELS,
  PORTEES,
  PORTEE_DESCRIPTIONS,
  PORTEE_LABELS,
  type Activite,
  type Mode,
  type Portee,
} from "../domain/rule";
import { ajouterRegleAction, type RegleFormState } from "./actions";
import { cibleVersChamps, grouperFormationsParCategorie } from "./training-options";

export interface CiblesDisponibles {
  formations: Array<{ id: string; title: string; categoryId: string | null }>;
  categoriesFormation: Array<{ id: string; name: string }>;
  documents: Array<{ id: string; name: string }>;
  prestations: Array<{ id: string; name: string }>;
}

/**
 * Formulaire d'ajout d'une regle de remuneration.
 *
 * Composant CLIENT : les champs proposes dependent des choix faits. Demander
 * un taux quand on a coche « montant fixe », ou proposer de cibler une
 * formation sur une regle de vente de documents, produirait des saisies
 * impossibles — le domaine les refuserait, mais le formulaire ne doit pas les
 * proposer.
 */
export function RuleForm({
  employeeId,
  cibles,
  initialCible = "",
}: {
  employeeId: string;
  cibles: CiblesDisponibles;
  /**
   * Pre-selectionne la formation ciblee, au format `formation:<id>` ou
   * `categorie:<id>` — arrivee depuis le raccourci d'accès rapide
   * (`commission-quick-access.tsx`), qui a deja fait choisir la formation.
   */
  initialCible?: string;
}) {
  const [state, formAction, pending] = useActionState<RegleFormState, FormData>(
    ajouterRegleAction.bind(null, employeeId),
    {},
  );

  const [activity, setActivity] = useState<Activite>("FRAIS_FORMATION");
  const [mode, setMode] = useState<Mode>("POURCENTAGE");
  const [portee, setPortee] = useState<Portee>("TOUTE_ACTIVITE");
  // "" | `formation:<id>` | `categorie:<id>` — un seul choix, jamais les deux
  // en meme temps : c'est ce qui rendait le ciblage ambigu avant (une
  // formation precise ET sa categorie pouvaient etre cochees ensemble, sans
  // que rien ne dise laquelle l'emportait).
  const [cibleFormation, setCibleFormation] = useState(initialCible);

  const erreur = (nom: string) => state.fieldErrors?.[nom];
  const surFormation = activity === "FRAIS_FORMATION" || activity === "FRAIS_INSCRIPTION";
  const surDocument = activity === "VENTE_DOCUMENT";
  const surPrestation = activity === "PRESTATION";

  // Regroupement des formations par categorie (Anglais, Informatique, ...) :
  // la liste vient du catalogue reel et suit ses categories telles qu'elles
  // existent en base, sans rien coder en dur — une categorie ajoutee demain
  // apparait ici le jour meme.
  const { categoriesAvecFormations, formationsSansCategorie } = grouperFormationsParCategorie(
    cibles.formations,
    cibles.categoriesFormation,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.success ? <Alert tone="success">Règle ajoutée au barème.</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Libellé"
          htmlFor="label"
          error={erreur("label")}
          hint="Ce que verra le gestionnaire de paie."
          required
          className="sm:col-span-2"
        >
          <Input
            id="label"
            name="label"
            placeholder="85 % sur les paiements des enfants"
            defaultValue={state.values?.label}
            hasError={Boolean(erreur("label"))}
            required
          />
        </Field>

        <Field label="Activité concernée" htmlFor="activity" error={erreur("activity")} required>
          <Select
            id="activity"
            name="activity"
            value={activity}
            onChange={(event) => setActivity(event.target.value as Activite)}
          >
            {ACTIVITES.map((valeur) => (
              <option key={valeur} value={valeur}>
                {ACTIVITE_LABELS[valeur]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Mode de calcul" htmlFor="mode" error={erreur("mode")} required>
          <Select
            id="mode"
            name="mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as Mode)}
          >
            {MODES.map((valeur) => (
              <option key={valeur} value={valeur}>
                {MODE_LABELS[valeur]}
              </option>
            ))}
          </Select>
        </Field>

        {mode === "POURCENTAGE" ? (
          <Field
            label="Taux (%)"
            htmlFor="rate"
            error={erreur("rate")}
            hint="Part de chaque somme encaissée."
            required
          >
            <Input
              id="rate"
              name="rate"
              type="number"
              min={0.01}
              max={100}
              step="any"
              placeholder="85"
              defaultValue={state.values?.rate}
              hasError={Boolean(erreur("rate"))}
              required
            />
          </Field>
        ) : (
          <>
            <Field
              label="Montant (FCFA)"
              htmlFor="fixedAmount"
              error={erreur("fixedAmount")}
              required
            >
              <Input
                id="fixedAmount"
                name="fixedAmount"
                type="number"
                min={1}
                step={1}
                placeholder="1000"
                defaultValue={state.values?.fixedAmount}
                hasError={Boolean(erreur("fixedAmount"))}
                required
              />
            </Field>

            <Field label="Compté" htmlFor="fixedBasis" error={erreur("fixedBasis")}>
              <Select id="fixedBasis" name="fixedBasis" defaultValue="PAR_OPERATION">
                {ASSIETTES.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {ASSIETTE_LABELS[valeur]}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        <Field
          label="Portée"
          htmlFor="portee"
          error={erreur("portee")}
          hint={PORTEE_DESCRIPTIONS[portee]}
          className="sm:col-span-2"
        >
          <Select
            id="portee"
            name="portee"
            value={portee}
            onChange={(event) => setPortee(event.target.value as Portee)}
          >
            {PORTEES.map((valeur) => (
              <option key={valeur} value={valeur}>
                {PORTEE_LABELS[valeur]}
              </option>
            ))}
          </Select>
        </Field>

        {/* --- Ciblage, propre a l'activite choisie --------------------- */}
        {surFormation ? (
          <Field
            label="Formation"
            htmlFor="cibleFormation"
            hint="Une formation precise, ou toute une categorie (Anglais, Informatique...) pour qu'elle s'applique aussi aux formations qui y seront ajoutees plus tard. Laisser sur « Toutes » sinon."
            className="sm:col-span-2"
          >
            <Select
              id="cibleFormation"
              value={cibleFormation}
              onChange={(event) => setCibleFormation(event.target.value)}
            >
              <option value="">— Toutes les formations —</option>
              {categoriesAvecFormations.map((categorie) => (
                <optgroup key={categorie.id} label={categorie.name}>
                  <option value={`categorie:${categorie.id}`}>
                    Toute la catégorie « {categorie.name} »
                  </option>
                  {categorie.formations.map((formation) => (
                    <option key={formation.id} value={`formation:${formation.id}`}>
                      {formation.title}
                    </option>
                  ))}
                </optgroup>
              ))}
              {formationsSansCategorie.length > 0 ? (
                <optgroup label="Sans catégorie">
                  {formationsSansCategorie.map((formation) => (
                    <option key={formation.id} value={`formation:${formation.id}`}>
                      {formation.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </Select>
            <input type="hidden" name="trainingId" value={cibleVersChamps(cibleFormation).trainingId} />
            <input
              type="hidden"
              name="trainingCategoryId"
              value={cibleVersChamps(cibleFormation).trainingCategoryId}
            />
          </Field>
        ) : null}

        {surDocument ? (
          <Field
            label="Document précis"
            htmlFor="documentProductId"
            hint="Laisser vide pour tous les documents."
            className="sm:col-span-2"
          >
            <Select id="documentProductId" name="documentProductId" defaultValue="">
              <option value="">— Tous les documents —</option>
              {cibles.documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        {surPrestation ? (
          <Field
            label="Prestation précise"
            htmlFor="serviceId"
            hint="Laisser vide pour toutes les prestations."
            className="sm:col-span-2"
          >
            <Select id="serviceId" name="serviceId" defaultValue="">
              <option value="">— Toutes les prestations —</option>
              {cibles.prestations.map((prestation) => (
                <option key={prestation.id} value={prestation.id}>
                  {prestation.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        {pending ? "Ajout…" : "Ajouter au barème"}
      </Button>
    </form>
  );
}
