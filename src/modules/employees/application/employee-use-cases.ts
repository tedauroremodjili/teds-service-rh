/**
 * Cas d'usage du module employees (module 2 du cahier des charges).
 *
 * Chaque fonction represente une intention metier complete : « créer un
 * employé », « modifier un employé ». Elles ne connaissent que le port
 * EmployeeRepository, jamais Prisma — ce qui permet de les tester avec un
 * depot en memoire.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";
import type { Page, PaginationParams } from "@/shared/domain/pagination";

import { Employee, Matricule, type EmployeeInput } from "../domain/employee";
import type {
  EmployeeDetail,
  EmployeeFilters,
  EmployeeListItem,
  EmployeeRepository,
} from "../domain/employee-repository";

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

export async function listEmployees(
  repository: EmployeeRepository,
  filters: EmployeeFilters,
  pagination: PaginationParams,
): Promise<Page<EmployeeListItem>> {
  return repository.list(filters, pagination);
}

export async function getEmployee(
  repository: EmployeeRepository,
  id: string,
): Promise<Result<EmployeeDetail>> {
  const employee = await repository.findById(id);

  if (!employee) {
    return fail(DomainError.notFound("Cet employé n'existe pas ou a été supprimé."));
  }

  return ok(employee);
}

/** Propose le prochain matricule libre, pour pre-remplir le formulaire. */
export async function suggestMatricule(repository: EmployeeRepository): Promise<string> {
  const dernier = await repository.lastMatricule();
  return Matricule.next(dernier).value;
}

/* -------------------------------------------------------------------------- */
/* Ecriture                                                                    */
/* -------------------------------------------------------------------------- */

export async function createEmployee(
  repository: EmployeeRepository,
  input: EmployeeInput,
): Promise<Result<string>> {
  // 1. Le domaine valide la coherence interne de la fiche.
  const employeeResult = Employee.create(input);
  if (!employeeResult.ok) return employeeResult;

  const employee = employeeResult.value;

  // 2. L'unicite ne peut se verifier qu'en interrogeant l'ensemble des fiches :
  //    c'est une regle de contexte, pas une regle d'agregat. Elle appartient
  //    donc au cas d'usage.
  if (await repository.existsByMatricule(employee.matricule)) {
    return fail(
      DomainError.conflict("Ce matricule est déjà attribué à un autre employé.", "matricule"),
    );
  }
  if (await repository.existsByEmail(employee.email)) {
    return fail(
      DomainError.conflict("Cette adresse email est déjà utilisée par un autre employé.", "email"),
    );
  }

  // La base reste l'arbitre final : elle peut refuser l'insertion si une autre
  // requete a insere la meme valeur entre-temps.
  return repository.save(employee);
}

export async function updateEmployee(
  repository: EmployeeRepository,
  id: string,
  input: EmployeeInput,
): Promise<Result<string>> {
  const existant = await repository.findById(id);
  if (!existant) {
    return fail(DomainError.notFound("Cet employé n'existe pas ou a été supprimé."));
  }

  const employeeResult = Employee.create(input, id);
  if (!employeeResult.ok) return employeeResult;

  const employee = employeeResult.value;

  if (await repository.existsByMatricule(employee.matricule, id)) {
    return fail(
      DomainError.conflict("Ce matricule est déjà attribué à un autre employé.", "matricule"),
    );
  }
  if (await repository.existsByEmail(employee.email, id)) {
    return fail(
      DomainError.conflict("Cette adresse email est déjà utilisée par un autre employé.", "email"),
    );
  }

  const enregistrement = await repository.update(id, employee);
  if (!enregistrement.ok) return enregistrement;

  return ok(id);
}

export async function archiveEmployee(
  repository: EmployeeRepository,
  id: string,
): Promise<Result<string>> {
  const existant = await repository.findById(id);
  if (!existant) {
    return fail(DomainError.notFound("Cet employé n'existe pas ou a déjà été archivé."));
  }

  // Un compte utilisateur actif rattache doit d'abord etre traite : sinon la
  // personne archivee pourrait encore se connecter.
  if (existant.hasUserAccount) {
    return fail(
      DomainError.businessRule(
        "Cet employé possède un compte utilisateur. Désactivez d'abord le compte dans le module Utilisateurs.",
        "COMPTE_ACTIF",
      ),
    );
  }

  await repository.softDelete(id);
  return ok(id);
}
