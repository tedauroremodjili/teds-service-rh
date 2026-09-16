/**
 * Agregat Employee — le cœur du module 2.
 *
 * Cette classe garantit qu'un employe ne peut jamais exister dans un etat
 * incoherent : pas de salaire negatif, pas d'embauche a 12 ans, pas de taux de
 * commission a 300 %. Les verifications sont faites a la construction, si bien
 * qu'une instance d'Employee est, par definition, valide.
 *
 * Aucun import de Prisma, de Next.js ou de React ici : ce fichier se teste sans
 * base de donnees ni serveur.
 */

import { AggregateRoot } from "@/shared/domain/entity";
import { DomainError } from "@/shared/domain/errors";
import { Money, Percentage } from "@/shared/domain/money";
import { fail, ok, type Result } from "@/shared/domain/result";

export const GENDERS = ["MASCULIN", "FEMININ"] as const;
export type Gender = (typeof GENDERS)[number];

export const MARITAL_STATUSES = ["CELIBATAIRE", "MARIE", "DIVORCE", "VEUF"] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const EMPLOYEE_STATUSES = [
  "ACTIF",
  "SUSPENDU",
  "CONGE",
  "DEMISSIONNE",
  "LICENCIE",
  "RETRAITE",
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/** Age minimum legal a l'embauche. */
export const AGE_MINIMUM = 16;

/* -------------------------------------------------------------------------- */
/* Objet-valeur : matricule                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Matricule au format TSS-0001.
 * Un objet-valeur plutot qu'une chaine : impossible de passer par erreur un
 * numero de telephone la ou un matricule est attendu.
 */
export class Matricule {
  private constructor(public readonly value: string) {}

  private static readonly FORMAT = /^TSS-\d{4,6}$/;

  static create(raw: string): Result<Matricule> {
    const normalized = raw.trim().toUpperCase();

    if (normalized.length === 0) {
      return fail(DomainError.validation("Le matricule est obligatoire.", "matricule"));
    }
    if (!Matricule.FORMAT.test(normalized)) {
      return fail(
        DomainError.validation(
          "Le matricule doit suivre le format TSS-0001.",
          "matricule",
        ),
      );
    }

    return ok(new Matricule(normalized));
  }

  static fromPersistence(value: string): Matricule {
    return new Matricule(value);
  }

  /** Construit le matricule suivant a partir du dernier attribue. */
  static next(dernierMatricule: string | null): Matricule {
    const dernierNumero = dernierMatricule
      ? Number.parseInt(dernierMatricule.replace("TSS-", ""), 10)
      : 0;
    const suivant = Number.isFinite(dernierNumero) ? dernierNumero + 1 : 1;
    return new Matricule(`TSS-${String(suivant).padStart(4, "0")}`);
  }

  toString(): string {
    return this.value;
  }
}

/* -------------------------------------------------------------------------- */
/* Agregat                                                                     */
/* -------------------------------------------------------------------------- */

export interface EmployeeProps {
  matricule: Matricule;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: Date;
  birthPlace: string | null;
  nationality: string;
  maritalStatus: MaritalStatus;
  address: string | null;
  phone: string;
  email: string;
  photoUrl: string | null;
  hireDate: Date;
  departmentId: string | null;
  positionId: string | null;
  baseSalary: Money;
  commissionRate: Percentage;
  status: EmployeeStatus;
}

/** Donnees brutes acceptees en entree, avant validation. */
export interface EmployeeInput {
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string | Date;
  birthPlace?: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  address?: string | null;
  phone: string;
  email: string;
  photoUrl?: string | null;
  hireDate: string | Date;
  departmentId?: string | null;
  positionId?: string | null;
  baseSalary: number;
  commissionRate?: number | null;
  status?: string | null;
}

export class Employee extends AggregateRoot {
  private constructor(
    id: string,
    private props: EmployeeProps,
  ) {
    super(id);
  }

  /* --- Lecture --------------------------------------------------------- */

  get matricule(): string {
    return this.props.matricule.value;
  }
  get firstName(): string {
    return this.props.firstName;
  }
  get lastName(): string {
    return this.props.lastName;
  }
  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }
  get email(): string {
    return this.props.email;
  }
  get status(): EmployeeStatus {
    return this.props.status;
  }
  get baseSalary(): Money {
    return this.props.baseSalary;
  }
  get commissionRate(): Percentage {
    return this.props.commissionRate;
  }

  /** Vue plate, destinee a la persistance. */
  toPersistence() {
    return {
      matricule: this.props.matricule.value,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      gender: this.props.gender,
      birthDate: this.props.birthDate,
      birthPlace: this.props.birthPlace,
      nationality: this.props.nationality,
      maritalStatus: this.props.maritalStatus,
      address: this.props.address,
      phone: this.props.phone,
      email: this.props.email,
      photoUrl: this.props.photoUrl,
      hireDate: this.props.hireDate,
      departmentId: this.props.departmentId,
      positionId: this.props.positionId,
      baseSalary: this.props.baseSalary.amount,
      commissionRate: this.props.commissionRate.rate,
      status: this.props.status,
    };
  }

  /* --- Construction ---------------------------------------------------- */

  static create(input: EmployeeInput, id = ""): Result<Employee> {
    const matriculeResult = Matricule.create(input.matricule);
    if (!matriculeResult.ok) return matriculeResult;

    const firstName = input.firstName.trim();
    if (firstName.length < 2) {
      return fail(DomainError.validation("Le prénom est obligatoire.", "firstName"));
    }

    const lastName = input.lastName.trim();
    if (lastName.length < 2) {
      return fail(DomainError.validation("Le nom est obligatoire.", "lastName"));
    }

    if (!GENDERS.includes(input.gender as Gender)) {
      return fail(DomainError.validation("Le sexe est obligatoire.", "gender"));
    }

    const birthDate = toDate(input.birthDate);
    if (!birthDate) {
      return fail(DomainError.validation("La date de naissance est invalide.", "birthDate"));
    }

    const hireDate = toDate(input.hireDate);
    if (!hireDate) {
      return fail(DomainError.validation("La date d'embauche est invalide.", "hireDate"));
    }

    // Regle metier : on ne recrute pas un mineur de moins de 16 ans.
    const ageALEmbauche = yearsBetween(birthDate, hireDate);
    if (ageALEmbauche < AGE_MINIMUM) {
      return fail(
        DomainError.businessRule(
          `L'employé doit avoir au moins ${AGE_MINIMUM} ans à la date d'embauche.`,
          "AGE_MINIMUM",
        ),
      );
    }
    if (ageALEmbauche > 80) {
      return fail(
        DomainError.validation(
          "La date de naissance semble erronée : vérifiez la saisie.",
          "birthDate",
        ),
      );
    }

    const phone = input.phone.trim();
    if (phone.length < 6) {
      return fail(DomainError.validation("Le numéro de téléphone est obligatoire.", "phone"));
    }

    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return fail(DomainError.validation("L'adresse email n'est pas valide.", "email"));
    }

    // Zero est une valeur volontaire, pas un oubli : un employe remunere en
    // totalite par un bareme (formateur paye sur ce que versent les
    // apprenants, commercial paye a la commission...) porte un salaire de
    // base a zero. Voir `salaireTotal()` du module remuneration, qui repose
    // sur ce cas.
    const salaryResult = Money.create(input.baseSalary);
    if (!salaryResult.ok) {
      return fail(
        DomainError.validation(
          salaryResult.error.message,
          "baseSalary",
        ),
      );
    }

    const rateResult = Percentage.create(input.commissionRate ?? 0);
    if (!rateResult.ok) {
      return fail(DomainError.validation(rateResult.error.message, "commissionRate"));
    }

    const status = (input.status ?? "ACTIF") as EmployeeStatus;
    if (!EMPLOYEE_STATUSES.includes(status)) {
      return fail(DomainError.validation("Le statut est invalide.", "status"));
    }

    const maritalStatus = (input.maritalStatus ?? "CELIBATAIRE") as MaritalStatus;
    if (!MARITAL_STATUSES.includes(maritalStatus)) {
      return fail(DomainError.validation("L'état civil est invalide.", "maritalStatus"));
    }

    return ok(
      new Employee(id, {
        matricule: matriculeResult.value,
        firstName,
        lastName,
        gender: input.gender as Gender,
        birthDate,
        birthPlace: emptyToNull(input.birthPlace),
        nationality: input.nationality?.trim() || "Congolaise",
        maritalStatus,
        address: emptyToNull(input.address),
        phone,
        email,
        photoUrl: emptyToNull(input.photoUrl),
        hireDate,
        departmentId: emptyToNull(input.departmentId),
        positionId: emptyToNull(input.positionId),
        baseSalary: salaryResult.value,
        commissionRate: rateResult.value,
        status,
      }),
    );
  }

  /* --- Comportements --------------------------------------------------- */

  /**
   * Commission due sur une vente, selon le taux propre a l'employe.
   * Exemple du module 6 : 300 000 FCFA a 10 % donnent 30 000 FCFA.
   */
  commissionOn(saleAmount: Money): Money {
    return this.props.commissionRate.applyTo(saleAmount);
  }

  /** Un employe suspendu ou parti ne doit plus apparaitre dans une paie. */
  isEligibleForPayroll(): boolean {
    return this.props.status === "ACTIF" || this.props.status === "CONGE";
  }

  /**
   * Changement de statut. Certaines transitions n'ont pas de sens : on ne
   * reactive pas quelqu'un qui a demissionne sans repasser par une embauche.
   */
  changeStatus(nouveauStatut: EmployeeStatus): Result<Employee> {
    const definitifs: EmployeeStatus[] = ["DEMISSIONNE", "LICENCIE", "RETRAITE"];

    if (definitifs.includes(this.props.status) && nouveauStatut === "ACTIF") {
      return fail(
        DomainError.businessRule(
          "Un employé sorti des effectifs ne peut pas être réactivé : créez un nouveau contrat.",
          "TRANSITION_INTERDITE",
        ),
      );
    }

    this.props = { ...this.props, status: nouveauStatut };
    return ok(this);
  }
}

/* -------------------------------------------------------------------------- */
/* Utilitaires internes                                                        */
/* -------------------------------------------------------------------------- */

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function yearsBetween(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const monthDiff = to.getMonth() - from.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && to.getDate() < from.getDate())) {
    years -= 1;
  }
  return years;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
