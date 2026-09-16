/**
 * Erreurs du domaine.
 *
 * Une DomainError decrit une regle metier violee, dans un langage que le
 * gestionnaire RH comprendrait. Elle ne contient jamais de detail technique
 * (requete SQL, pile d'appels) : ces informations restent dans la couche
 * infrastructure.
 *
 * Le `code` est stable et sert au typage / aux tests ; le `message` est
 * affiche a l'utilisateur, en francais.
 */

export type DomainErrorKind =
  /** Donnee invalide : format, borne, valeur interdite. */
  | "VALIDATION"
  /** La ressource demandee n'existe pas. */
  | "NON_TROUVE"
  /** Un enregistrement equivalent existe deja (unicite). */
  | "CONFLIT"
  /** L'operation est interdite dans l'etat actuel de l'agregat. */
  | "REGLE_METIER"
  /** L'utilisateur n'est pas authentifie. */
  | "NON_AUTHENTIFIE"
  /** L'utilisateur est authentifie mais n'a pas la permission requise. */
  | "NON_AUTORISE";

export class DomainError extends Error {
  readonly kind: DomainErrorKind;
  readonly code: string;
  /** Erreurs rattachees a un champ de formulaire precis. */
  readonly field?: string;

  constructor(kind: DomainErrorKind, code: string, message: string, field?: string) {
    super(message);
    this.name = "DomainError";
    this.kind = kind;
    this.code = code;
    this.field = field;
  }

  static validation(message: string, field?: string, code = "VALIDATION"): DomainError {
    return new DomainError("VALIDATION", code, message, field);
  }

  static notFound(message: string, code = "NON_TROUVE"): DomainError {
    return new DomainError("NON_TROUVE", code, message);
  }

  static conflict(message: string, field?: string, code = "CONFLIT"): DomainError {
    return new DomainError("CONFLIT", code, message, field);
  }

  static businessRule(message: string, code = "REGLE_METIER"): DomainError {
    return new DomainError("REGLE_METIER", code, message);
  }

  static unauthenticated(message = "Vous devez vous connecter pour continuer."): DomainError {
    return new DomainError("NON_AUTHENTIFIE", "NON_AUTHENTIFIE", message);
  }

  static forbidden(
    message = "Vous n'avez pas les droits necessaires pour cette action.",
  ): DomainError {
    return new DomainError("NON_AUTORISE", "NON_AUTORISE", message);
  }

  /** Forme serialisable, transmissible du serveur au client. */
  toJSON() {
    return {
      kind: this.kind,
      code: this.code,
      message: this.message,
      field: this.field,
    };
  }
}

export type SerializedDomainError = ReturnType<DomainError["toJSON"]>;
