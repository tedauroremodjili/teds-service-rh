"use client";

import { useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";

import { formatMoney, formatNumber } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/form";

import {
  ACTIVITES,
  ACTIVITE_LABELS,
  ASSIETTES,
  ASSIETTE_LABELS,
  MAX_REGLES_INITIALES,
  MODE_LABELS,
  MODES_PAR_ACTIVITE,
  PORTEES,
  PORTEE_DESCRIPTIONS,
  PORTEE_LABELS,
  type Activite,
  type Assiette,
  type Mode,
  type Portee,
} from "../domain/rule";
import type { CiblesDisponibles } from "./rule-form";

/**
 * Bareme de remuneration saisi PENDANT la creation d'un employe.
 *
 * Le probleme resolu : chez TED'S SERVICE, ce que touche une personne ne se
 * resume pas a un taux. Tomo touche 85 % des paiements des enfants, 1 000 F par
 * document vendu, 5 % sur les prestations. Jusqu'ici il fallait creer la fiche,
 * puis rouvrir son ecran Rémunération pour poser ces lignes — deux etapes pour
 * une seule decision, et un employe qui existait un moment sans savoir ce qu'il
 * gagne.
 *
 * Composant CLIENT, et il ne peut pas etre autre chose : les regles s'empilent
 * avant qu'il y ait un employe a qui les rattacher. Elles vivent donc en etat
 * local, puis partent serialisees dans un champ cache que la Server Action
 * revalide integralement — la saisie du navigateur n'est jamais crue sur parole.
 */

/** Une regle en attente : les champs bruts, tels que le domaine les validera. */
export interface RegleBrouillon {
  label: string;
  activity: Activite;
  mode: Mode;
  portee: Portee;
  rate: string;
  fixedAmount: string;
  fixedBasis: Assiette;
  trainingId: string;
  trainingCategoryId: string;
  documentProductId: string;
  serviceId: string;
}

const REGLE_VIDE: RegleBrouillon = {
  label: "",
  activity: "FRAIS_FORMATION",
  mode: "POURCENTAGE",
  // Le cas courant chez TED'S SERVICE est l'animatrice payee sur les paiements
  // des enfants qu'elle encadre, quel qu'en soit le vendeur.
  portee: "TOUTE_ACTIVITE",
  rate: "",
  fixedAmount: "",
  fixedBasis: "PAR_OPERATION",
  trainingId: "",
  trainingCategoryId: "",
  documentProductId: "",
  serviceId: "",
};

export function BaremeInitial({
  cibles,
  erreur,
}: {
  cibles: CiblesDisponibles;
  /** Message renvoyé par la Server Action si le barème a été refusé. */
  erreur?: string;
}) {
  const [regles, setRegles] = useState<RegleBrouillon[]>([]);
  const [brouillon, setBrouillon] = useState<RegleBrouillon>(REGLE_VIDE);
  const [ouvert, setOuvert] = useState(false);
  const [probleme, setProbleme] = useState<string | null>(null);

  const nomDeCible = indexerCibles(cibles);

  const modifier = <K extends keyof RegleBrouillon>(champ: K, valeur: RegleBrouillon[K]) =>
    setBrouillon((precedent) => ({ ...precedent, [champ]: valeur }));

  const surFormation =
    brouillon.activity === "FRAIS_FORMATION" || brouillon.activity === "FRAIS_INSCRIPTION";
  const surDocument = brouillon.activity === "VENTE_DOCUMENT";
  const surPrestation = brouillon.activity === "PRESTATION";

  const modesDisponibles = MODES_PAR_ACTIVITE[brouillon.activity];

  function changerActivite(nouvelle: Activite) {
    modifier("activity", nouvelle);
    if (!MODES_PAR_ACTIVITE[nouvelle].includes(brouillon.mode)) {
      modifier("mode", MODES_PAR_ACTIVITE[nouvelle][0]);
    }
  }

  function ajouter() {
    const verdict = verifierBrouillon(brouillon);
    if (verdict) {
      setProbleme(verdict);
      return;
    }

    // Le ciblage n'a de sens que pour l'activite choisie : on repart des champs
    // vides pour les autres, sinon un document selectionne puis abandonne au
    // profit d'une formation partirait quand meme au serveur, qui le refuserait.
    setRegles((precedentes) => [
      ...precedentes,
      {
        ...brouillon,
        label: brouillon.label.trim(),
        trainingId: surFormation ? brouillon.trainingId : "",
        trainingCategoryId: surFormation ? brouillon.trainingCategoryId : "",
        documentProductId: surDocument ? brouillon.documentProductId : "",
        serviceId: surPrestation ? brouillon.serviceId : "",
      },
    ]);

    setBrouillon(REGLE_VIDE);
    setProbleme(null);
    setOuvert(false);
  }

  const plein = regles.length >= MAX_REGLES_INITIALES;

  return (
    <div className="space-y-4">
      {/* Le champ que lit la Server Action. Tout le reste n'est qu'assistance
          a la saisie : sans JavaScript, l'employé se crée sans barème, et
          l'écran Rémunération reste le chemin normal pour le composer. */}
      <input type="hidden" name="bareme" value={JSON.stringify(regles)} />

      {erreur ? <Alert tone="danger">{erreur}</Alert> : null}

      {regles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-surface-300 px-4 py-6 text-center text-sm text-surface-500">
          Aucune règle pour l&apos;instant. Sans barème, l&apos;employé ne touchera que son
          salaire de base — ce qui convient à un poste non commercial.
        </p>
      ) : (
        <ul className="space-y-2">
          {regles.map((regle, index) => (
            <li
              key={`${regle.label}-${index}`}
              className="flex items-start justify-between gap-3 rounded-lg border border-surface-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-surface-800">{regle.label}</p>
                <p className="mt-0.5 text-xs text-surface-500">
                  {ACTIVITE_LABELS[regle.activity]} · {decrire(regle)} ·{" "}
                  {cibleLisible(regle, nomDeCible)}
                </p>
                <p className="text-xs text-surface-400">{PORTEE_LABELS[regle.portee]}</p>
              </div>

              <button
                type="button"
                onClick={() => setRegles((liste) => liste.filter((_, rang) => rang !== index))}
                aria-label={`Retirer « ${regle.label} »`}
                title="Retirer cette règle"
                className="shrink-0 rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {ouvert ? (
        <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-4">
          {probleme ? (
            <Alert tone="danger" className="mb-4">
              {probleme}
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Libellé"
              htmlFor="bareme-label"
              hint="Ce que verra le gestionnaire de paie."
              className="sm:col-span-2"
            >
              <Input
                id="bareme-label"
                value={brouillon.label}
                onChange={(event) => modifier("label", event.target.value)}
                placeholder="85 % sur les paiements des enfants"
              />
            </Field>

            <Field label="Activité concernée" htmlFor="bareme-activity">
              <Select
                id="bareme-activity"
                value={brouillon.activity}
                onChange={(event) => changerActivite(event.target.value as Activite)}
              >
                {ACTIVITES.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {ACTIVITE_LABELS[valeur]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Mode de calcul" htmlFor="bareme-mode">
              <Select
                id="bareme-mode"
                value={brouillon.mode}
                onChange={(event) => modifier("mode", event.target.value as Mode)}
              >
                {modesDisponibles.map((valeur) => (
                  <option key={valeur} value={valeur}>
                    {MODE_LABELS[valeur]}
                  </option>
                ))}
              </Select>
            </Field>

            {brouillon.mode === "POURCENTAGE" || brouillon.mode === "MARGE" ? (
              <Field
                label={brouillon.mode === "MARGE" ? "Part de la marge (%)" : "Taux (%)"}
                htmlFor="bareme-rate"
                hint={
                  brouillon.mode === "MARGE"
                    ? "Part du bénéfice net (prix de vente − prix de revient) reversée."
                    : "Part de chaque somme encaissée."
                }
              >
                <Input
                  id="bareme-rate"
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.5}
                  value={brouillon.rate}
                  onChange={(event) => modifier("rate", event.target.value)}
                  placeholder="85"
                />
              </Field>
            ) : (
              <>
                <Field label="Montant (FCFA)" htmlFor="bareme-fixedAmount">
                  <Input
                    id="bareme-fixedAmount"
                    type="number"
                    min={1}
                    step={100}
                    value={brouillon.fixedAmount}
                    onChange={(event) => modifier("fixedAmount", event.target.value)}
                    placeholder="1000"
                  />
                </Field>

                <Field label="Compté" htmlFor="bareme-fixedBasis">
                  <Select
                    id="bareme-fixedBasis"
                    value={brouillon.fixedBasis}
                    onChange={(event) => modifier("fixedBasis", event.target.value as Assiette)}
                  >
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
              htmlFor="bareme-portee"
              hint={PORTEE_DESCRIPTIONS[brouillon.portee]}
              className="sm:col-span-2"
            >
              <Select
                id="bareme-portee"
                value={brouillon.portee}
                onChange={(event) => modifier("portee", event.target.value as Portee)}
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
              <>
                <Field
                  label="Formation précise"
                  htmlFor="bareme-trainingId"
                  hint="Laisser vide pour toutes."
                >
                  <Select
                    id="bareme-trainingId"
                    value={brouillon.trainingId}
                    onChange={(event) => modifier("trainingId", event.target.value)}
                  >
                    <option value="">— Toutes les formations —</option>
                    {cibles.formations.map((formation) => (
                      <option key={formation.id} value={formation.id}>
                        {formation.title}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Ou catégorie de formation" htmlFor="bareme-trainingCategoryId">
                  <Select
                    id="bareme-trainingCategoryId"
                    value={brouillon.trainingCategoryId}
                    onChange={(event) => modifier("trainingCategoryId", event.target.value)}
                  >
                    <option value="">— Toutes les catégories —</option>
                    {cibles.categoriesFormation.map((categorie) => (
                      <option key={categorie.id} value={categorie.id}>
                        {categorie.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {surDocument ? (
              <Field
                label="Document précis"
                htmlFor="bareme-documentProductId"
                hint="Laisser vide pour tous les documents."
                className="sm:col-span-2"
              >
                <Select
                  id="bareme-documentProductId"
                  value={brouillon.documentProductId}
                  onChange={(event) => modifier("documentProductId", event.target.value)}
                >
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
                htmlFor="bareme-serviceId"
                hint="Laisser vide pour toutes les prestations."
                className="sm:col-span-2"
              >
                <Select
                  id="bareme-serviceId"
                  value={brouillon.serviceId}
                  onChange={(event) => modifier("serviceId", event.target.value)}
                >
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

          <div className="mt-4 flex items-center gap-2">
            {/* `type="button"` est indispensable : dans un formulaire, un bouton
                sans type soumettrait la fiche employé au lieu d'ajouter la règle. */}
            <Button type="button" size="sm" onClick={ajouter}>
              <Plus className="size-4" />
              Ajouter au barème
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setBrouillon(REGLE_VIDE);
                setProbleme(null);
                setOuvert(false);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={plein}
          onClick={() => setOuvert(true)}
        >
          <Scale className="size-4" />
          {regles.length === 0 ? "Définir une règle de rémunération" : "Ajouter une autre règle"}
        </Button>
      )}

      {plein ? (
        <p className="text-xs text-surface-500">
          Limite de {MAX_REGLES_INITIALES} règles atteinte à la création. Les suivantes
          s&apos;ajoutent depuis l&apos;écran Rémunération de la fiche.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Controle de surface, avant d'empiler la regle.
 *
 * Il double celui du domaine — qui reste seul juge a l'ecriture — mais evite de
 * decouvrir a l'enregistrement de la fiche qu'une regle saisie dix minutes plus
 * tot n'avait pas de taux.
 */
function verifierBrouillon(regle: RegleBrouillon): string | null {
  if (regle.label.trim().length < 3) {
    return "Donnez un libellé à cette règle (au moins 3 caractères).";
  }

  if (regle.mode === "POURCENTAGE" || regle.mode === "MARGE") {
    const taux = Number(regle.rate);
    if (!Number.isFinite(taux) || taux <= 0) return "Indiquez un taux supérieur à zéro.";
    if (taux > 100) return "Le taux ne peut pas dépasser 100 %.";
    return null;
  }

  const montant = Number(regle.fixedAmount);
  if (!Number.isFinite(montant) || montant <= 0) {
    return "Indiquez un montant supérieur à zéro.";
  }

  return null;
}

function decrire(regle: RegleBrouillon): string {
  if (regle.mode === "POURCENTAGE") {
    return `${formatNumber(Number(regle.rate) || 0)} % du montant encaissé`;
  }

  if (regle.mode === "MARGE") {
    return `${formatNumber(Number(regle.rate) || 0)} % de la marge sur documents`;
  }

  const montant = formatMoney(Number(regle.fixedAmount) || 0);
  return regle.fixedBasis === "PAR_ARTICLE"
    ? `${montant} par article`
    : `${montant} par opération`;
}

/** Un index identifiant → nom, pour afficher « Anglais enfants » et non un cuid. */
function indexerCibles(cibles: CiblesDisponibles): Record<string, string> {
  const index: Record<string, string> = {};
  for (const formation of cibles.formations) index[formation.id] = formation.title;
  for (const categorie of cibles.categoriesFormation) index[categorie.id] = categorie.name;
  for (const document of cibles.documents) index[document.id] = document.name;
  for (const prestation of cibles.prestations) index[prestation.id] = prestation.name;
  return index;
}

function cibleLisible(regle: RegleBrouillon, noms: Record<string, string>): string {
  const cible =
    regle.trainingId ||
    regle.trainingCategoryId ||
    regle.documentProductId ||
    regle.serviceId;

  return cible ? (noms[cible] ?? "cible inconnue") : "toute l'activité";
}
