/**
 * Port du module users.
 * Le domaine declare ses besoins ; Prisma les satisfait dans la couche
 * infrastructure (src/modules/users/infrastructure).
 */

import type { PermissionOverride, RoleName } from "@/modules/auth/domain/permissions";
import type { Page, PaginationParams } from "@/shared/domain/pagination";
import type { Result } from "@/shared/domain/result";

import type { UserStatus } from "./user-account";

/** Vue destinee a la liste des comptes. */
export interface UserListItem {
  id: string;
  email: string;
  displayName: string;
  role: RoleName;
  status: UserStatus;
  employeeId: string | null;
  matricule: string | null;
  lastLoginAt: Date | null;
  /** Nombre de droits accordes / retires en propre — la colonne « Droits ». */
  grantedCount: number;
  revokedCount: number;
}

export interface UserDetail extends UserListItem {
  /** Socle du role, lu en base : il se modifie depuis /roles. */
  rolePermissions: string[];
  /** Ecarts declares pour ce compte, tels que stockes. */
  overrides: PermissionOverride[];
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  lockedUntil: Date | null;
  createdAt: Date;
}

export interface UserFilters {
  /** Recherche libre sur l'email ou le nom de l'employe rattache. */
  search?: string;
  role?: RoleName;
  status?: UserStatus;
  /** Ne garder que les comptes ayant des droits attribues en propre. */
  onlyCustomized?: boolean;
}

/** Compte a creer. Le mot de passe arrive deja hache : le domaine ne le voit jamais en clair. */
export interface NewUserAccount {
  email: string;
  passwordHash: string;
  role: RoleName;
  employeeId: string | null;
  mustChangePassword: boolean;
}

export interface UserRepository {
  list(filters: UserFilters, pagination: PaginationParams): Promise<Page<UserListItem>>;
  findById(id: string): Promise<UserDetail | null>;

  create(account: NewUserAccount): Promise<Result<string>>;

  /** Coordonnees du compte : email, rattachement, exigence de mot de passe. */
  updateAccount(
    id: string,
    account: { email: string; employeeId: string | null; mustChangePassword: boolean },
  ): Promise<Result<void>>;

  /** Remplace le mot de passe (deja hache) et deverrouille le compte. */
  replacePassword(id: string, passwordHash: string): Promise<Result<void>>;

  /**
   * Suppression logique : le compte disparait des listes et ne peut plus se
   * connecter, mais son identifiant reste cite dans le journal d'audit et dans
   * l'historique des ventes. L'effacer physiquement rendrait ces traces muettes.
   */
  archive(id: string): Promise<Result<void>>;

  /**
   * Employes sans compte, pour proposer le rattachement.
   * La relation est 1-1 : un employe deja rattache ne doit pas reapparaitre,
   * sous peine d'un echec d'unicite au moment de l'enregistrement.
   */
  employeesWithoutAccount(): Promise<Array<{ id: string; label: string }>>;

  /**
   * Remplace l'integralite des ecarts du compte.
   *
   * Remplacer plutot que fusionner : l'ecran envoie l'etat complet souhaite, et
   * une ecriture partielle laisserait des lignes orphelines impossibles a
   * retirer depuis l'interface. L'operation doit etre transactionnelle — un
   * retrait applique sans son ajout donnerait un compte a moitie configure.
   */
  replaceOverrides(
    userId: string,
    overrides: readonly PermissionOverride[],
    grantedById: string | null,
  ): Promise<Result<void>>;

  changeRole(userId: string, role: RoleName): Promise<Result<void>>;
  setStatus(userId: string, status: UserStatus): Promise<Result<void>>;
}
