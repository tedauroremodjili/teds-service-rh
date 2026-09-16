/**
 * Port du module roles.
 *
 * Un role est un socle de droits partage par plusieurs comptes. Le modifier a
 * un effet immediat sur tous ses titulaires — c'est precisement ce qu'on lui
 * demande, et ce qui le distingue d'une attribution individuelle.
 *
 * Les roles se creent depuis l'interface : les 8 du cahier des charges sont
 * marques « systeme » et ne se suppriment pas, les autres sont libres.
 */

import type { RoleName } from "@/modules/auth/domain/permissions";
import type { Result } from "@/shared/domain/result";

export interface RoleSummary {
  name: RoleName;
  label: string;
  description: string | null;
  /** Un role systeme ne se supprime pas depuis l'interface. */
  isSystem: boolean;
  /** Nombre de comptes portant ce role. */
  userCount: number;
  /** Codes de permissions du socle, lus dans `role_permissions`. */
  permissions: string[];
}

/** Vue allegee, pour les listes deroulantes et les filtres. */
export interface RoleOption {
  name: RoleName;
  label: string;
  isSystem: boolean;
}

export interface NewRole {
  name: RoleName;
  label: string;
  description: string | null;
  permissions: readonly string[];
}

export interface RoleRepository {
  list(): Promise<RoleSummary[]>;
  findByName(name: RoleName): Promise<RoleSummary | null>;

  /** Tous les roles, sans les compteurs : de quoi remplir un `<select>`. */
  options(): Promise<RoleOption[]>;

  create(role: NewRole): Promise<Result<RoleName>>;

  /** Libelle et description seulement : le socle passe par replacePermissions. */
  updateInfo(
    name: RoleName,
    info: { label: string; description: string | null },
  ): Promise<Result<void>>;

  /**
   * Remplace l'integralite du socle. Transactionnel : un role a moitie
   * reecrit priverait ses titulaires de droits le temps de l'operation.
   */
  replacePermissions(
    name: RoleName,
    codes: readonly string[],
    updatedById: string | null,
  ): Promise<Result<void>>;

  remove(name: RoleName): Promise<Result<void>>;
}
