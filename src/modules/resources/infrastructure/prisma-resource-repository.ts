import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/infrastructure/database/prisma";
import { uniqueConstraintFields } from "@/infrastructure/database/prisma-errors";
import { DomainError } from "@/shared/domain/errors";
import { buildPage, toSkip, type PaginationParams } from "@/shared/domain/pagination";
import { fail, ok, type Result } from "@/shared/domain/result";

import {
  nextCashBalance,
  nextStockQuantity,
  type CashDirection,
  type StockMovementType,
} from "../domain/derivations";
import type { FieldDefinition, FieldOption } from "../domain/field";
import { idFieldOf, type ResourceDefinition } from "../domain/resource";
import type {
  ResourceFilters,
  ResourceRepository,
  ResourceRow,
} from "../domain/resource-repository";

/**
 * Pont generique entre le catalogue de ressources et Prisma.
 *
 * Le client Prisma expose un delegue par modele (`prisma.contract`,
 * `prisma.payroll`...). Comme la ressource ne connait son modele que sous forme
 * de chaine, on adresse le client par index. C'est le seul endroit de
 * l'application ou l'on renonce au typage genere : en echange, quinze modules
 * partagent la meme implementation. Les valeurs qui en sortent sont
 * re-typees par `toRow` a partir de la definition, donc le reste du code
 * retrouve des types surs.
 */

type Args = Record<string, unknown>;
type Record_ = Record<string, unknown>;

interface Delegate {
  findMany(args?: Args): Promise<Record_[]>;
  findFirst(args?: Args): Promise<Record_ | null>;
  count(args?: Args): Promise<number>;
  create(args: Args): Promise<Record_>;
  update(args: Args): Promise<Record_>;
  delete(args: Args): Promise<Record_>;
}

type Client = Record<string, Delegate>;

function delegateFor(model: string, client: Client = prisma as unknown as Client): Delegate {
  const delegate = client[model];

  if (!delegate) {
    // Une definition qui cite un modele inexistant est une erreur de
    // programmation, pas une erreur metier : elle doit exploser bruyamment.
    throw new Error(`Modèle Prisma inconnu : « ${model} ».`);
  }

  return delegate;
}

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

/** Colonnes a charger : les champs declares, plus le libelle des relations. */
function buildSelect(definition: ResourceDefinition): Args {
  const select: Args = { [idFieldOf(definition)]: true };

  for (const field of definition.fields) {
    select[field.name] = true;

    if (field.kind === "relation" && field.relation) {
      select[field.relation.property] = {
        select: Object.fromEntries(field.relation.labelFields.map((name) => [name, true])),
      };
    }
  }

  return select;
}

function labelOf(value: Record_ | null | undefined, labelFields: string[]): string | null {
  if (!value) return null;

  const parts = labelFields
    .map((name) => value[name])
    .filter((part) => part !== null && part !== undefined && part !== "")
    .map(String);

  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Convertit une ligne brute en valeurs serialisables, guidee par le type
 * declare de chaque champ.
 *
 * Deux pieges evites ici : les `Decimal` de Prisma, qui ne traversent pas la
 * frontiere serveur/client, et les `Date`, qu'on normalise en chaine ISO pour
 * que la meme ligne alimente indifferemment un tableau serveur et un
 * formulaire client.
 */
function toRow(definition: ResourceDefinition, raw: Record_): ResourceRow {
  const row: ResourceRow = { id: String(raw[idFieldOf(definition)]) };

  for (const field of definition.fields) {
    const value = raw[field.name];

    if (value === null || value === undefined) {
      row[field.name] = null;
    } else {
      switch (field.kind) {
        case "money":
        case "percent":
        case "number":
        case "integer":
          row[field.name] = Number(value as never);
          break;

        case "date":
        case "datetime":
          row[field.name] = (value as Date).toISOString();
          break;

        case "boolean":
          row[field.name] = Boolean(value);
          break;

        case "json":
          row[field.name] = JSON.stringify(value);
          break;

        default:
          row[field.name] = String(value);
      }
    }

    if (field.kind === "relation" && field.relation) {
      row[`${field.name}__label`] = labelOf(
        raw[field.relation.property] as Record_ | null,
        field.relation.labelFields,
      );
    }
  }

  return row;
}

function buildWhere(definition: ResourceDefinition, filters: ResourceFilters): Args {
  const where: Args = {};

  if (definition.softDelete) {
    where.deletedAt = null;
  }

  for (const [name, value] of Object.entries(filters.equals ?? {})) {
    if (!value) continue;
    const field = definition.fields.find((candidate) => candidate.name === name);
    // On n'accepte comme filtre que ce que la definition declare : le reste
    // vient de l'URL, donc de l'utilisateur, et n'a rien a faire dans un WHERE.
    if (!field || !field.filterable) continue;
    where[name] = value;
  }

  const search = filters.search?.trim();
  if (search && definition.searchFields.length > 0) {
    where.OR = definition.searchFields.map((name) => ({
      [name]: { contains: search },
    }));
  }

  return where;
}

/* -------------------------------------------------------------------------- */
/* Ecriture                                                                    */
/* -------------------------------------------------------------------------- */

/** Traduit une violation d'unicite PostgreSQL en erreur lisible. */
function toWriteError(definition: ResourceDefinition, error: unknown): DomainError {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: string }).code;

    if (code === "P2002") {
      const cites = uniqueConstraintFields(error);
      const champ = definition.fields.find((field) =>
        cites.some((cite) => cite === field.name || cite.includes(field.name)),
      );

      return DomainError.conflict(
        champ
          ? `Cette valeur de « ${champ.label} » est déjà utilisée.`
          : `Un enregistrement identique existe déjà pour « ${definition.singular} ».`,
        champ?.name,
      );
    }

    if (code === "P2003") {
      return DomainError.validation(
        "Un élément lié n'existe pas ou a été supprimé. Vérifiez les listes déroulantes.",
      );
    }

    if (code === "P2025") {
      return DomainError.notFound(`Ce ${definition.singular.toLowerCase()} n'existe plus.`);
    }
  }

  console.error(`[resources] écriture impossible sur ${definition.model}`, error);
  return DomainError.businessRule(
    "L'enregistrement a échoué. Réessayez dans un instant.",
    "ECRITURE_IMPOSSIBLE",
  );
}

/**
 * Calculs qui exigent l'etat precedent.
 *
 * La regle est dans le domaine (`derivations.ts`) ; l'infrastructure se limite
 * a lire la valeur d'avant. Pour le stock, lecture et ecriture partagent une
 * transaction : sans elle, deux sorties simultanees liraient la meme quantite
 * et le stock deviendrait faux.
 */
async function derive(
  definition: ResourceDefinition,
  data: Record_,
  client: Client,
): Promise<Result<Record_>> {
  switch (definition.compute) {
    case "cash-balance": {
      const dernier = await delegateFor("cashTransaction", client).findFirst({
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        select: { balanceAfter: true },
      });

      const solde = dernier ? Number(dernier.balanceAfter as never) : 0;
      const calcule = nextCashBalance(
        solde,
        data.direction as CashDirection,
        Number(data.amount ?? 0),
      );
      if (!calcule.ok) return calcule;

      return ok({ ...data, balanceAfter: calcule.value });
    }

    case "stock-movement": {
      const article = await delegateFor("inventoryItem", client).findFirst({
        where: { id: data.itemId },
        select: { quantity: true },
      });

      if (!article) {
        return fail(DomainError.notFound("Cet article de stock n'existe pas."));
      }

      const calcule = nextStockQuantity(
        Number(article.quantity ?? 0),
        data.type as StockMovementType,
        Number(data.quantity ?? 0),
      );
      if (!calcule.ok) return calcule;

      return ok({ ...data, quantityAfter: calcule.value });
    }

    // Le paiement lui-meme ne calcule rien sur SES propres champs : ce qu'il
    // repercute vise une AUTRE ressource (l'inscription), fait dans
    // `applySideEffects` / `applyRegistrationPaymentDelta`.
    case "registration-payment":
      return ok(data);

    default:
      return ok(data);
  }
}

/**
 * Retire du payload les champs optionnels dont la valeur vaut `null`.
 *
 * Un champ facultatif laisse vide se resout en `null` (voir `coerceField`),
 * quel que soit son type. Deux raisons imposent de ne PAS ecrire ce `null`
 * explicitement :
 *
 * 1. Un champ « relation » optionnel present ET nul rend le payload ambigu
 *    pour Prisma : il hesite entre la forme « checked » (relations
 *    imbriquees, `student: {...}`) et la forme « unchecked » (cles etrangeres
 *    brutes, `studentId`) utilisee ici, et rejette alors une AUTRE cle
 *    pourtant valide avec un message trompeur (« Unknown argument studentId.
 *    Did you mean student? »).
 * 2. Une colonne non nullable dotee d'un `@default(...)` (une remise a 0, un
 *    statut par defaut) refuse un `null` explicite (« Argument discount must
 *    not be null ») — seule une cle ABSENTE declenche sa valeur par defaut.
 *
 * Omettre la cle resout les deux cas d'un coup : Prisma retombe sur le
 * defaut de la colonne (souvent NULL ou 0), sans qu'on ait besoin de l'ecrire.
 *
 * Consequence acceptee sur `update` : ce chemin generique ne permet pas
 * encore de VIDER un champ deja renseigne (la cle omise laisse la valeur
 * actuelle inchangee plutot que de l'effacer). Un ecran qui en aurait besoin
 * devra le faire explicitement — aucune ressource du catalogue ne le demande
 * aujourd'hui.
 */
function sansValeursNullesOmissibles(definition: ResourceDefinition, data: Record_): Record_ {
  const facultatifs = new Set(
    definition.fields.filter((field) => !field.required).map((field) => field.name),
  );

  return Object.fromEntries(
    Object.entries(data).filter(([cle, valeur]) => !(facultatifs.has(cle) && valeur === null)),
  );
}

/** Repercussion du mouvement sur l'article, dans la meme transaction. */
async function applySideEffects(
  definition: ResourceDefinition,
  data: Record_,
  client: Client,
): Promise<void> {
  if (definition.compute === "stock-movement") {
    await delegateFor("inventoryItem", client).update({
      where: { id: data.itemId },
      data: { quantity: data.quantityAfter },
    });
  }

  if (definition.compute === "registration-payment") {
    const contribution = contributionInscription(data);
    if (contribution) {
      await delegateFor("studentRegistration", client).update({
        where: { id: contribution.registrationId },
        data: { paidAmount: { increment: contribution.montant } },
      });
    }
  }
}

/**
 * Part d'un paiement qui compte dans le solde d'une inscription.
 *
 * Seuls les paiements CONFIRMES, dont l'objet est « frais de formation » et
 * qui visent une inscription precise, alimentent `paidAmount` — les frais
 * d'inscription (une somme forfaitaire versee une fois) n'en font pas partie :
 * `paidAmount` se compare au montant convenu de la FORMATION, pas au total
 * general de ce que l'apprenant a verse.
 */
function contributionInscription(
  data: Record_,
): { registrationId: string; montant: number } | null {
  if (data.purpose !== "FRAIS_FORMATION") return null;
  if (data.status !== "CONFIRME") return null;

  const registrationId = data.registrationId;
  if (typeof registrationId !== "string" || registrationId.length === 0) return null;

  return { registrationId, montant: Number(data.amount ?? 0) };
}

/**
 * Repercute la MODIFICATION d'un paiement sur le solde de l'inscription
 * visee : retire l'ancienne part (si elle comptait), ajoute la nouvelle (si
 * elle compte desormais) — dans la meme transaction que l'ecriture.
 *
 * C'est ce qui garde `paidAmount` juste quand on corrige un montant, qu'on
 * annule un paiement (statut → ANNULE) ou qu'on reclasse un versement mal
 * categorise (« frais de formation » repointe en « frais d'inscription »).
 */
async function applyRegistrationPaymentDelta(
  avant: Record_ | null,
  apres: Record_,
  client: Client,
): Promise<void> {
  const ancienne = avant ? contributionInscription(avant) : null;
  const nouvelle = contributionInscription(apres);

  if (ancienne && (!nouvelle || nouvelle.registrationId !== ancienne.registrationId)) {
    await delegateFor("studentRegistration", client).update({
      where: { id: ancienne.registrationId },
      data: { paidAmount: { decrement: ancienne.montant } },
    });
  }

  if (nouvelle) {
    const delta =
      ancienne && ancienne.registrationId === nouvelle.registrationId
        ? nouvelle.montant - ancienne.montant
        : nouvelle.montant;

    if (delta !== 0) {
      await delegateFor("studentRegistration", client).update({
        where: { id: nouvelle.registrationId },
        data: { paidAmount: { increment: delta } },
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Repository                                                                  */
/* -------------------------------------------------------------------------- */

export const prismaResourceRepository: ResourceRepository = {
  async list(
    definition: ResourceDefinition,
    filters: ResourceFilters,
    pagination: PaginationParams,
  ) {
    const delegate = delegateFor(definition.model);
    const where = buildWhere(definition, filters);

    const [rows, total] = await Promise.all([
      delegate.findMany({
        where,
        select: buildSelect(definition),
        orderBy: { [definition.orderBy.field]: definition.orderBy.direction },
        skip: toSkip(pagination),
        take: pagination.pageSize,
      }),
      delegate.count({ where }),
    ]);

    return buildPage(
      rows.map((row) => toRow(definition, row)),
      total,
      pagination,
    );
  },

  async findById(definition: ResourceDefinition, id: string) {
    const row = await delegateFor(definition.model).findFirst({
      where: {
        [idFieldOf(definition)]: id,
        ...(definition.softDelete ? { deletedAt: null } : {}),
      },
      select: buildSelect(definition),
    });

    return row ? toRow(definition, row) : null;
  },

  async create(definition: ResourceDefinition, data: Record<string, unknown>) {
    try {
      const created = await prisma.$transaction(async (transaction) => {
        const client = transaction as unknown as Client;

        const derived = await derive(definition, data, client);
        if (!derived.ok) throw derived.error;

        const row = await delegateFor(definition.model, client).create({
          data: sansValeursNullesOmissibles(definition,derived.value),
          select: { [idFieldOf(definition)]: true },
        });

        await applySideEffects(definition, derived.value, client);

        return row;
      });

      return ok(String(created[idFieldOf(definition)]));
    } catch (error) {
      // Une regle metier levee dans la transaction remonte telle quelle : elle
      // est deja formulee pour l'utilisateur.
      if (error instanceof DomainError) return fail(error);
      return fail(toWriteError(definition, error));
    }
  },

  async update(definition: ResourceDefinition, id: string, data: Record<string, unknown>) {
    try {
      // Un paiement modifie (montant corrige, objet reclasse, statut passe a
      // ANNULE...) doit rejouer sa repercussion sur le solde de l'inscription
      // visee — d'ou la lecture de l'etat d'avant, dans la meme transaction.
      if (definition.compute === "registration-payment") {
        await prisma.$transaction(async (transaction) => {
          const client = transaction as unknown as Client;
          const delegate = delegateFor(definition.model, client);

          const avant = await delegate.findFirst({
            where: { [idFieldOf(definition)]: id },
            select: { purpose: true, status: true, registrationId: true, amount: true },
          });

          await delegate.update({
            where: { [idFieldOf(definition)]: id },
            data: sansValeursNullesOmissibles(definition, data),
          });

          await applyRegistrationPaymentDelta(avant, data, client);
        });
        return ok(undefined);
      }

      await delegateFor(definition.model).update({
        where: { [idFieldOf(definition)]: id },
        data: sansValeursNullesOmissibles(definition,data),
      });
      return ok(undefined);
    } catch (error) {
      return fail(toWriteError(definition, error));
    }
  },

  async remove(definition: ResourceDefinition, id: string) {
    if (!definition.deletable) {
      return fail(
        DomainError.businessRule(
          `Un ${definition.singular.toLowerCase()} ne se supprime pas : il fait partie de l'historique comptable. Changez plutôt son statut.`,
          "SUPPRESSION_INTERDITE",
        ),
      );
    }

    try {
      const delegate = delegateFor(definition.model);
      const where = { [idFieldOf(definition)]: id };

      if (definition.softDelete) {
        await delegate.update({ where, data: { deletedAt: new Date() } });
      } else {
        await delegate.delete({ where });
      }

      return ok(undefined);
    } catch (error) {
      return fail(toWriteError(definition, error));
    }
  },

  async optionsFor(field: FieldDefinition): Promise<FieldOption[]> {
    if (!field.relation) return [];

    const { model, labelFields, softDelete, orderBy } = field.relation;

    const rows = await delegateFor(model).findMany({
      where: softDelete ? { deletedAt: null } : {},
      select: {
        id: true,
        ...Object.fromEntries(labelFields.map((name) => [name, true])),
      },
      orderBy: { [orderBy ?? labelFields[0]]: "asc" },
      // Au-dela, une liste deroulante n'est plus utilisable : il faudra un
      // champ de recherche dedie pour ces volumes.
      take: 300,
    });

    return rows.map((row) => ({
      value: String(row.id),
      label: labelOf(row, labelFields) ?? String(row.id),
    }));
  },

  async nextSequence(
    definition: ResourceDefinition,
    field: FieldDefinition,
  ): Promise<string> {
    const prefix =
      field.autoPrefix ?? definition.referencePrefix ?? definition.key.slice(0, 3).toUpperCase();
    const delegate = delegateFor(definition.model);

    // Une reference porte l'annee d'emission ; un code accompagne la fiche toute
    // sa vie et n'a pas a vieillir avec le millesime.
    const segment = field.autoValue === "reference" ? `${new Date().getFullYear()}-` : "";

    // Le compteur part du nombre de lignes, archives comprises : c'est le
    // perimetre de la contrainte d'unicite SQL.
    const total = await delegate.count({});

    // On verifie la disponibilite plutot que de faire confiance au compteur :
    // des suppressions ou des valeurs saisies a la main creeraient des doublons,
    // refuses par la base au pire moment — a l'enregistrement du formulaire.
    for (let essai = 0; essai < 30; essai += 1) {
      const candidate = `${prefix}-${segment}${String(total + 1 + essai).padStart(4, "0")}`;
      const existe = await delegate.count({ where: { [field.name]: candidate } });
      if (existe === 0) return candidate;
    }

    return `${prefix}-${segment}${randomUUID().slice(0, 6).toUpperCase()}`;
  },

  newToken(): string {
    return randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  },
};
