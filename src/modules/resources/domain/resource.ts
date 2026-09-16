/**
 * Definition d'une ressource : ce qu'il faut savoir pour en generer l'index, la
 * fiche et les formulaires — permissions comprises.
 *
 * L'idee directrice : les 15 modules restants du cahier des charges manipulent
 * tous des tables plates (contrats, presences, ventes, ecritures...). Plutot que
 * de recopier quinze fois la meme liste paginee et le meme formulaire, on decrit
 * chaque table une fois et on laisse un moteur unique produire les ecrans. Un
 * module qui demande une regle metier propre (comme employees) garde son propre
 * dossier `src/modules/<nom>/` : le moteur ne remplace pas la Clean
 * Architecture, il evite d'en payer le cout sur du CRUD sans regle.
 */

import type { Permission } from "@/modules/auth/domain/permissions";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import { coerceField, type FieldDefinition } from "./field";

/**
 * Calculs appliques avant ecriture.
 * - « payroll-totals » et « sale-totals » sont de l'arithmetique pure ;
 * - « cash-balance » et « stock-movement » ont besoin de l'etat precedent, lu
 *   en base : la regle reste ici (voir derivations.ts), seule la lecture est
 *   faite par l'infrastructure ;
 * - « registration-payment » repercute un paiement de frais de formation sur
 *   le solde de l'inscription visee (`StudentRegistration.paidAmount`) : c'est
 *   une ressource qui met a jour une AUTRE ressource, pas elle-meme — voir
 *   `applySideEffects` dans `prisma-resource-repository.ts`.
 */
export type ComputeStrategy =
  | "payroll-totals"
  | "sale-totals"
  | "cash-balance"
  | "stock-movement"
  | "registration-payment";

export interface ResourcePermissions {
  read: Permission;
  create: Permission;
  update: Permission;
  remove: Permission;
}

export interface ResourceDefinition {
  /** Segment d'URL : /contrats, /presences... */
  key: string;
  /** Delegue Prisma correspondant (`prisma.contract` → « contract »). */
  model: string;
  /** Colonne identifiante ; « id » partout sauf pour les parametres (« key »). */
  idField?: string;
  singular: string;
  plural: string;
  description: string;
  permissions: ResourcePermissions;
  fields: FieldDefinition[];
  /** Champs concatenes pour titrer une fiche. */
  titleFields: string[];
  /** Champs texte balayes par la recherche libre. */
  searchFields: string[];
  orderBy: { field: string; direction: "asc" | "desc" };
  /** Le modele porte-t-il un `deletedAt` ? */
  softDelete: boolean;
  /** Faux pour tout ce qui a valeur comptable : on n'efface pas l'historique. */
  deletable: boolean;
  compute?: ComputeStrategy;
  /** Prefixe des references auto-generees (CTR-2026-0007). */
  referencePrefix?: string;
  /**
   * Vue de synthese dediee (statistiques, echeances), quand le module en a une.
   * Elle vit sous /<ressource>/synthese : la liste sert la saisie quotidienne,
   * la synthese sert le pilotage, et l'index renvoie vers elle.
   */
  summary?: boolean;
  /** Note affichee en tete d'ecran (limites connues du CRUD generique). */
  notice?: string;
}

export function idFieldOf(definition: ResourceDefinition): string {
  return definition.idField ?? "id";
}

export function fieldByName(
  definition: ResourceDefinition,
  name: string,
): FieldDefinition | undefined {
  return definition.fields.find((field) => field.name === name);
}

/** Champs affiches dans le tableau de la liste. */
export function listFields(definition: ResourceDefinition): FieldDefinition[] {
  return definition.fields.filter((field) => field.inList);
}

/** Champs proposes a la saisie : ni calcules, ni auto-generes en modification. */
export function formFields(definition: ResourceDefinition): FieldDefinition[] {
  return definition.fields.filter((field) => field.inForm !== false && !field.computed);
}

/** Champs proposant un filtre en tete de liste. */
export function filterFields(definition: ResourceDefinition): FieldDefinition[] {
  return definition.fields.filter((field) => field.filterable);
}

/* -------------------------------------------------------------------------- */
/* Validation d'un formulaire complet                                          */
/* -------------------------------------------------------------------------- */

/**
 * Valide et convertit tout le formulaire.
 *
 * On s'arrete a la premiere erreur : le formulaire l'affiche sous le champ
 * concerne et l'utilisateur corrige. Les champs calcules sont ignores — ils
 * sont produits par `applyComputations`, jamais saisis.
 */
export function parseResourceInput(
  definition: ResourceDefinition,
  values: Record<string, string | undefined>,
): Result<Record<string, unknown>> {
  const data: Record<string, unknown> = {};

  for (const field of formFields(definition)) {
    const converted = coerceField(field, values[field.name]);
    if (!converted.ok) return converted;
    data[field.name] = converted.value;
  }

  return ok(data);
}

/* -------------------------------------------------------------------------- */
/* Calculs purs                                                                */
/* -------------------------------------------------------------------------- */

function nombre(value: unknown): number {
  const converted = Number(value ?? 0);
  return Number.isFinite(converted) ? converted : 0;
}

/**
 * Applique les calculs qui ne dependent que des valeurs saisies.
 *
 * Le brut et le net d'un bulletin, le total d'une vente : ce sont des regles du
 * cahier des charges, pas des details d'affichage. Les laisser a la saisie
 * ouvrirait la porte a un bulletin dont le net ne correspond pas aux lignes.
 */
export function applyComputations(
  definition: ResourceDefinition,
  data: Record<string, unknown>,
): Record<string, unknown> {
  switch (definition.compute) {
    case "payroll-totals": {
      const brut =
        nombre(data.baseSalary) +
        nombre(data.totalBonuses) +
        nombre(data.totalCommissions) +
        nombre(data.totalOvertime);
      const net = Math.max(0, brut - nombre(data.totalDeductions) - nombre(data.totalAdvances));
      return { ...data, grossSalary: brut, netSalary: net };
    }

    case "sale-totals": {
      const total = Math.max(
        0,
        nombre(data.subtotal) - nombre(data.discount) + nombre(data.taxAmount),
      );
      return { ...data, totalAmount: total };
    }

    default:
      return data;
  }
}

/* -------------------------------------------------------------------------- */
/* Coherence                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Controles transverses valables pour toutes les ressources : une periode qui
 * se termine avant d'avoir commence est une erreur de saisie frequente, et
 * aucune table de l'ERP n'y echappe.
 */
export function checkConsistency(data: Record<string, unknown>): Result<void> {
  const paires: Array<[string, string, string]> = [
    ["startDate", "endDate", "La date de fin doit suivre la date de début."],
    ["orderedAt", "deliveredAt", "La date de livraison doit suivre la date de commande."],
  ];

  for (const [debut, fin, message] of paires) {
    const from = data[debut];
    const to = data[fin];
    if (from instanceof Date && to instanceof Date && to < from) {
      return fail(DomainError.validation(message, fin));
    }
  }

  return ok(undefined);
}
