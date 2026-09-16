/**
 * Port du module employees.
 * Le domaine declare ses besoins ; Prisma les satisfait dans la couche
 * infrastructure.
 */

import type { Page, PaginationParams } from "@/shared/domain/pagination";
import type { Result } from "@/shared/domain/result";

import type { Employee, EmployeeStatus } from "./employee";

/** Vue destinee aux listes et fiches : deja aplatie pour l'affichage. */
export interface EmployeeListItem {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string | null;
  status: EmployeeStatus;
  hireDate: Date;
  baseSalary: number;
  commissionRate: number;
  departmentName: string | null;
  positionTitle: string | null;
}

export interface EmployeeDetail extends EmployeeListItem {
  gender: string;
  birthDate: Date;
  birthPlace: string | null;
  nationality: string;
  maritalStatus: string;
  address: string | null;
  departmentId: string | null;
  positionId: string | null;
  hasUserAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeFilters {
  /** Recherche libre sur le nom, le matricule ou l'email. */
  search?: string;
  status?: EmployeeStatus;
  departmentId?: string;
}

export interface EmployeeRepository {
  list(filters: EmployeeFilters, pagination: PaginationParams): Promise<Page<EmployeeListItem>>;
  findById(id: string): Promise<EmployeeDetail | null>;

  /**
   * Unicite verifiee sur TOUTES les fiches, y compris archivees.
   * Un matricule et une adresse email identifient une personne dans
   * l'historique de paie et de ventes : les reattribuer rendrait les archives
   * ambigues. C'est aussi ce qu'impose la contrainte SQL, qui ne connait pas
   * la notion d'archive.
   */
  existsByMatricule(matricule: string, exceptId?: string): Promise<boolean>;
  existsByEmail(email: string, exceptId?: string): Promise<boolean>;

  /** Dernier matricule attribue, pour calculer le suivant. */
  lastMatricule(): Promise<string | null>;

  /**
   * L'ecriture renvoie un Result : entre la verification d'unicite et
   * l'insertion, une autre requete a pu inserer la meme valeur. La base
   * tranche, et le conflit doit remonter comme une erreur metier lisible,
   * pas comme une exception Prisma brute.
   */
  save(employee: Employee): Promise<Result<string>>;
  update(id: string, employee: Employee): Promise<Result<void>>;

  /** Suppression logique : on conserve l'historique de paie et de ventes. */
  softDelete(id: string): Promise<void>;
}
