/**
 * Port du moteur de ressources.
 *
 * Le domaine dit ce dont les ecrans ont besoin — lister, lire, ecrire, proposer
 * les options d'une liste deroulante — sans savoir que PostgreSQL est derriere.
 */

import type { Page, PaginationParams } from "@/shared/domain/pagination";
import type { Result } from "@/shared/domain/result";

import type { FieldDefinition, FieldOption } from "./field";
import type { ResourceDefinition } from "./resource";

/**
 * Ligne prete a afficher : valeurs deja converties en types serialisables
 * (nombres, chaines ISO, booleens). Les `Decimal` de Prisma ne franchissent
 * jamais cette frontiere — c'est la regle 4 du projet.
 */
export interface ResourceRow {
  id: string;
  [key: string]: unknown;
}

export interface ResourceFilters {
  /** Recherche libre sur les champs texte declares. */
  search?: string;
  /** Filtres d'egalite : enumerations et relations. */
  equals?: Record<string, string>;
}

export interface ResourceRepository {
  list(
    definition: ResourceDefinition,
    filters: ResourceFilters,
    pagination: PaginationParams,
  ): Promise<Page<ResourceRow>>;

  findById(definition: ResourceDefinition, id: string): Promise<ResourceRow | null>;

  create(
    definition: ResourceDefinition,
    data: Record<string, unknown>,
  ): Promise<Result<string>>;

  update(
    definition: ResourceDefinition,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Result<void>>;

  /** Suppression logique si la table a un `deletedAt`, physique sinon. */
  remove(definition: ResourceDefinition, id: string): Promise<Result<void>>;

  /** Contenu d'une liste deroulante pour un champ « relation ». */
  optionsFor(field: FieldDefinition): Promise<FieldOption[]>;

  /**
   * Prochaine valeur libre pour un champ auto-genere : reference horodatee
   * (CTR-2026-0007) ou code sequentiel (DEP-0007), selon le champ.
   */
  nextSequence(definition: ResourceDefinition, field: FieldDefinition): Promise<string>;

  /** Jeton aleatoire, pour les codes de verification. */
  newToken(): string;
}
