/**
 * Money — objet-valeur representant un montant en francs CFA.
 *
 * Deux raisons d'exister :
 *
 * 1. Le franc CFA (XAF) n'a pas de sous-unite en circulation. On travaille donc
 *    en francs entiers, ce qui evite les erreurs de virgule flottante du type
 *    0.1 + 0.2 = 0.30000000000000004 sur des calculs de salaires.
 * 2. Un `number` nu ne dit pas s'il s'agit d'un montant, d'un taux ou d'une
 *    quantite. `Money` rend l'intention explicite et interdit les operations
 *    qui n'ont pas de sens (additionner un montant et un pourcentage).
 */

import { DomainError } from "./errors";
import { fail, ok, type Result } from "./result";

/** Plafond de securite : au-dela, c'est forcement une saisie erronee. */
const MONTANT_MAX = 1_000_000_000_000;

export class Money {
  /** Montant en francs CFA entiers. */
  private constructor(private readonly francs: number) {}

  static readonly ZERO = new Money(0);

  /** Cree un montant a partir d'un nombre de francs. Arrondi au franc. */
  static create(value: number): Result<Money> {
    if (!Number.isFinite(value)) {
      return fail(DomainError.validation("Le montant n'est pas un nombre valide."));
    }
    if (value < 0) {
      return fail(DomainError.validation("Un montant ne peut pas etre negatif."));
    }
    if (value > MONTANT_MAX) {
      return fail(DomainError.validation("Le montant saisi depasse la limite autorisee."));
    }

    return ok(new Money(Math.round(value)));
  }

  /**
   * Variante sans validation, reservee a la reconstitution depuis la base :
   * les donnees deja persistees sont considerees comme valides.
   */
  static fromPersistence(value: number | string): Money {
    return new Money(Math.round(Number(value)));
  }

  get amount(): number {
    return this.francs;
  }

  add(other: Money): Money {
    return new Money(this.francs + other.francs);
  }

  /** Soustraction bornee a zero : un net a payer ne devient jamais negatif. */
  subtract(other: Money): Money {
    return new Money(Math.max(0, this.francs - other.francs));
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.francs * factor));
  }

  /**
   * Applique un pourcentage. C'est le calcul du module 6 :
   * 300 000 FCFA a 10 % donnent 30 000 FCFA de commission.
   */
  percentage(rate: number): Money {
    return new Money(Math.round((this.francs * rate) / 100));
  }

  isZero(): boolean {
    return this.francs === 0;
  }

  isGreaterThan(other: Money): boolean {
    return this.francs > other.francs;
  }

  isLessThan(other: Money): boolean {
    return this.francs < other.francs;
  }

  equals(other: Money): boolean {
    return this.francs === other.francs;
  }

  static sum(amounts: Money[]): Money {
    return amounts.reduce((total, current) => total.add(current), Money.ZERO);
  }

  /** Format d'affichage : « 300 000 FCFA ». */
  format(): string {
    return `${this.francs.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
  }

  toString(): string {
    return this.format();
  }

  toJSON(): number {
    return this.francs;
  }
}

/**
 * Percentage — objet-valeur pour les taux de commission (module 6).
 * Borne a [0, 100] pour empecher une commission de 1 000 %.
 */
export class Percentage {
  private constructor(private readonly value: number) {}

  static readonly ZERO = new Percentage(0);

  static create(value: number): Result<Percentage> {
    if (!Number.isFinite(value)) {
      return fail(DomainError.validation("Le taux n'est pas un nombre valide."));
    }
    if (value < 0 || value > 100) {
      return fail(DomainError.validation("Le taux doit être compris entre 0 et 100 %."));
    }

    // Deux decimales suffisent pour un taux de commission.
    return ok(new Percentage(Math.round(value * 100) / 100));
  }

  static fromPersistence(value: number | string): Percentage {
    return new Percentage(Number(value));
  }

  get rate(): number {
    return this.value;
  }

  applyTo(amount: Money): Money {
    return amount.percentage(this.value);
  }

  format(): string {
    return `${this.value.toLocaleString("fr-FR")} %`;
  }

  toJSON(): number {
    return this.value;
  }
}
