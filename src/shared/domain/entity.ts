/**
 * Briques de base du modele tactique DDD.
 *
 * - Entity      : objet defini par son identite, qui vit dans le temps
 *                 (un employe reste le meme employe apres un changement de nom).
 * - ValueObject : objet defini par ses valeurs, immuable et interchangeable
 *                 (un montant de 30 000 FCFA en vaut un autre).
 */

export abstract class Entity<TId extends string = string> {
  protected constructor(public readonly id: TId) {}

  /** Deux entites sont egales si elles ont la meme identite. */
  equals(other?: Entity<TId>): boolean {
    if (other === undefined || other === null) return false;
    if (this === other) return true;
    if (!(other instanceof Entity)) return false;
    return this.id === other.id;
  }
}

/**
 * Racine d'agregat : point d'entree unique d'un groupe d'objets qui doivent
 * rester coherents ensemble. Seule la racine est chargee et sauvegardee par un
 * repository. Exemple : Payroll est racine, PayrollItem ne se modifie qu'a
 * travers elle, ce qui garantit que le salaire net reste toujours juste.
 */
export abstract class AggregateRoot<TId extends string = string> extends Entity<TId> {}

export abstract class ValueObject<TProps extends object> {
  protected constructor(protected readonly props: Readonly<TProps>) {
    Object.freeze(this.props);
  }

  /** Deux objets-valeurs sont egaux si toutes leurs proprietes le sont. */
  equals(other?: ValueObject<TProps>): boolean {
    if (other === undefined || other === null) return false;
    if (this === other) return true;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
