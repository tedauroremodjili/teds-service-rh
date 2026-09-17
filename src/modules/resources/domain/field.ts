/**
 * Champs d'une ressource — la brique du CRUD generique.
 *
 * Toute la partie « saisie » de l'ERP se decrit ici : un champ porte son type
 * metier (montant, taux, date, enumeration, relation), et c'est ce type qui
 * decide de la validation, du controle affiche et du formatage. Ecrire un
 * nouvel ecran revient donc a declarer une liste de champs, pas a recopier un
 * formulaire.
 *
 * Fichier de DOMAINE : ni Prisma, ni React, ni Next.js.
 */

import { Money, Percentage } from "@/shared/domain/money";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

export type FieldKind =
  /** Texte court sur une ligne. */
  | "text"
  /** Texte long, sur plusieurs lignes. */
  | "textarea"
  /** Nombre decimal libre (note, coefficient). */
  | "number"
  /** Nombre entier (jours, heures, quantite). */
  | "integer"
  /** Montant en FCFA — passe par `Money`, jamais par un `number` nu. */
  | "money"
  /** Taux en pourcentage, borne a [0, 100]. */
  | "percent"
  /** Date sans heure. */
  | "date"
  /** Date et heure. */
  | "datetime"
  | "boolean"
  /** Valeur parmi une liste fermee (enumeration Prisma). */
  | "enum"
  /** Cle etrangere vers une autre table. */
  | "relation"
  /** Valeur JSON libre (parametres). */
  | "json";

export interface FieldOption {
  value: string;
  label: string;
}

/** Cible d'un champ « relation » : de quoi construire la liste deroulante. */
export interface RelationTarget {
  /** Modele Prisma vise (« employee », « training »...). */
  model: string;
  /** Nom de la propriete de relation dans le modele courant (« employee »). */
  property: string;
  /** Colonnes concatenees pour former le libelle affiche. */
  labelFields: string[];
  /** Le modele cible connait-il la suppression logique ? */
  softDelete?: boolean;
  /** Colonne de tri de la liste deroulante. */
  orderBy?: string;
}

export interface FieldDefinition {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Colonne du tableau de liste. */
  inList?: boolean;
  /** Present dans le formulaire. Faux pour les champs calcules. */
  inForm?: boolean;
  /** Propose comme filtre en tete de liste (enum et relation). */
  filterable?: boolean;
  options?: FieldOption[];
  relation?: RelationTarget;
  hint?: string;
  /** Valeur proposee a la creation. */
  defaultValue?: string;
  /**
   * Valeur produite par le serveur a la creation, pour que l'utilisateur n'ait
   * jamais a inventer un identifiant :
   * - « reference » : sequence horodatee (CTR-2026-0007), pour les pieces
   *   dont on veut retrouver l'annee d'emission ;
   * - « code »      : sequence simple (DEP-0007), pour les codes et matricules
   *   qui accompagnent la fiche toute sa vie ;
   * - « token »     : jeton aleatoire (code de verification d'un certificat).
   *
   * La valeur reste modifiable : une entreprise qui a deja sa codification
   * doit pouvoir la saisir. L'unicite est verifiee a l'ecriture dans tous les cas.
   */
  autoValue?: "reference" | "code" | "token";
  /** Prefixe de la sequence ; a defaut, celui de la ressource. */
  autoPrefix?: string;
  /** Calcule a partir des autres champs : affiche, jamais saisi. */
  computed?: boolean;
  align?: "left" | "right";
  /**
   * Cle d'une ressource dont on peut creer une fiche SANS quitter cet ecran
   * (« + Nouvel apprenant » a cote du champ « Apprenant »). Reserve aux champs
   * « relation » : le formulaire rapide ne propose que les champs obligatoires
   * de la ressource visee, et seulement s'ils sont eux-memes simples (texte,
   * nombre, date, enumeration) — pas une autre relation, pour ne pas ouvrir un
   * formulaire rapide dans un formulaire rapide.
   */
  quickCreate?: string;
}

/** Raccourci : transforme une enumeration Prisma en options lisibles. */
export function enumOptions(
  values: readonly string[],
  labels: Record<string, string> = {},
): FieldOption[] {
  return values.map((value) => ({
    value,
    label: labels[value] ?? humanize(value),
  }));
}

function humanize(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const OBLIGATOIRE = (label: string) => `Le champ « ${label} » est obligatoire.`;

/**
 * Convertit la valeur brute d'un formulaire (toujours une chaine) vers le type
 * attendu par la base, en refusant ce qui n'a pas de sens.
 *
 * Un formulaire HTML ne transmet que du texte : c'est ici, et nulle part
 * ailleurs, que « 300000 » devient un montant et que « 2026-08-03 » devient une
 * date. Les messages sont en francais et nomment le champ concerne, pour que le
 * formulaire puisse les afficher au bon endroit.
 */
export function coerceField(field: FieldDefinition, raw: string | undefined): Result<unknown> {
  const value = (raw ?? "").trim();
  const absent = value.length === 0;

  if (absent) {
    if (field.required) {
      return fail(DomainError.validation(OBLIGATOIRE(field.label), field.name));
    }
    // Un booleen non coche vaut « faux », pas « non renseigne ».
    return ok(field.kind === "boolean" ? false : null);
  }

  switch (field.kind) {
    case "text":
    case "textarea":
      return ok(value);

    case "money": {
      const montant = Money.create(Number(value));
      if (!montant.ok) {
        return fail(
          DomainError.validation(`${field.label} : ${montant.error.message}`, field.name),
        );
      }
      return ok(montant.value.amount);
    }

    case "percent": {
      const taux = Percentage.create(Number(value));
      if (!taux.ok) {
        return fail(DomainError.validation(`${field.label} : ${taux.error.message}`, field.name));
      }
      return ok(taux.value.rate);
    }

    case "number": {
      const nombre = Number(value);
      if (!Number.isFinite(nombre)) {
        return fail(
          DomainError.validation(`${field.label} doit être un nombre.`, field.name),
        );
      }
      return ok(nombre);
    }

    case "integer": {
      const entier = Number(value);
      if (!Number.isInteger(entier)) {
        return fail(
          DomainError.validation(`${field.label} doit être un nombre entier.`, field.name),
        );
      }
      return ok(entier);
    }

    case "date":
    case "datetime": {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return fail(DomainError.validation(`${field.label} n'est pas une date valide.`, field.name));
      }
      return ok(date);
    }

    case "boolean":
      // Une case cochee arrive sous la forme « on » ; decochee, elle n'arrive pas.
      return ok(value === "on" || value === "true" || value === "1");

    case "enum": {
      const connue = field.options?.some((option) => option.value === value);
      if (!connue) {
        return fail(
          DomainError.validation(`${field.label} : valeur inconnue.`, field.name),
        );
      }
      return ok(value);
    }

    case "relation":
      return ok(value);

    case "json":
      try {
        return ok(JSON.parse(value));
      } catch {
        return fail(
          DomainError.validation(`${field.label} doit être du JSON valide.`, field.name),
        );
      }

    default:
      return ok(value);
  }
}
