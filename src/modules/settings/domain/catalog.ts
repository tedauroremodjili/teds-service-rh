/**
 * Catalogue des parametres du systeme (module 17).
 *
 * La table `settings` stocke des couples cle/valeur JSON — c'est souple, mais
 * illisible a la saisie : personne ne doit taper `{"vatRate": 18}` pour changer
 * un taux. Ce catalogue donne a chaque cle connue son libelle, sa categorie et
 * surtout son TYPE, ce qui permet d'afficher le bon controle (email, telephone,
 * taux, interrupteur) et de valider la saisie.
 *
 * Les cles inconnues du catalogue restent modifiables : elles apparaissent en
 * fin d'ecran, traitees comme du texte. On n'enferme donc personne.
 *
 * Fichier de DOMAINE : ni Prisma, ni React.
 */

import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

export type SettingKind =
  | "text"
  | "email"
  | "phone"
  | "url"
  | "textarea"
  | "number"
  | "percent"
  | "boolean"
  | "time"
  /** Chemin d'une image servie par l'application (`/logo.png`). */
  | "image";

export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  category: string;
  kind: SettingKind;
  placeholder?: string;
}

/**
 * Parametres connus.
 *
 * Les cles `company.*` sont celles que lisent les documents imprimes
 * (`modules/printing`) : les renommer viderait silencieusement l'en-tete des
 * factures et des bulletins.
 */
export const SETTINGS: readonly SettingDefinition[] = [
  /* ---- Identite de l'entreprise ---- */
  {
    key: "company.name",
    label: "Raison sociale",
    description: "Nom imprimé en tête des factures, reçus et certificats.",
    category: "company",
    kind: "text",
    placeholder: "TED'S SERVICE",
  },
  {
    key: "company.slogan",
    label: "Slogan",
    category: "company",
    kind: "text",
    placeholder: "Learning & Tech Solutions",
  },
  {
    key: "company.email",
    label: "Adresse email",
    description: "Contact affiché sur les documents.",
    category: "company",
    kind: "email",
    placeholder: "contact@tedsservice.cg",
  },
  {
    key: "company.phone",
    label: "Téléphone",
    category: "company",
    kind: "phone",
    placeholder: "+242 06 830 65 42",
  },
  {
    key: "company.address",
    label: "Adresse",
    description: "La ville en est extraite pour la mention « Fait à… ».",
    category: "company",
    kind: "textarea",
    placeholder: "Brazzaville, République du Congo",
  },
  {
    key: "company.website",
    label: "Site web",
    category: "company",
    kind: "url",
    placeholder: "https://tedsservice.cg",
  },
  {
    key: "company.logo",
    label: "Logo",
    description: "Chemin de l'image dans le dossier public (ex. /logo.png).",
    category: "company",
    kind: "image",
    placeholder: "/logo.png",
  },
  {
    key: "company.rccm",
    label: "Numéro RCCM",
    description: "Laissé vide, il ne s'imprime pas.",
    category: "company",
    kind: "text",
  },
  {
    key: "company.niu",
    label: "Numéro d'identification unique (NIU)",
    description: "Laissé vide, il ne s'imprime pas.",
    category: "company",
    kind: "text",
  },

  /* ---- Finances ---- */
  {
    key: "finance.currency",
    label: "Monnaie",
    description: "Symbole affiché après les montants.",
    category: "finance",
    kind: "text",
    placeholder: "FCFA",
  },
  {
    key: "finance.vatRate",
    label: "Taux de TVA",
    description: "Appliqué au calcul des factures.",
    category: "finance",
    kind: "percent",
  },

  /* ---- Ressources humaines ---- */
  {
    key: "hr.workingHoursPerWeek",
    label: "Heures hebdomadaires",
    description: "Base de calcul des heures supplémentaires.",
    category: "hr",
    kind: "number",
  },
  {
    key: "hr.annualLeaveDays",
    label: "Jours de congé annuel",
    category: "hr",
    kind: "number",
  },
  {
    key: "hr.workDayStart",
    label: "Heure d'arrivée théorique",
    description: "Au-delà, le pointage compte un retard.",
    category: "hr",
    kind: "time",
  },
  {
    key: "hr.workDayEnd",
    label: "Heure de départ théorique",
    category: "hr",
    kind: "time",
  },
];

export function findSetting(key: string): SettingDefinition | null {
  return SETTINGS.find((setting) => setting.key === key) ?? null;
}

/**
 * Type d'un parametre absent du catalogue, deduit de la valeur stockee.
 * Une cle ajoutee a la main reste ainsi modifiable, avec un controle plausible.
 */
export function inferKind(value: unknown): SettingKind {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "text";
}

/* -------------------------------------------------------------------------- */
/* Conversion                                                                  */
/* -------------------------------------------------------------------------- */

/** Valeur telle que l'attend le controle HTML correspondant. */
export function toInputValue(kind: SettingKind, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (kind === "boolean") return value === true ? "on" : "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Convertit la saisie en valeur JSON typee.
 *
 * Un taux reste un nombre, pas la chaine « 18 » : c'est ce qui permet aux
 * calculs de s'en servir sans reconversion, et au reste du code de faire
 * confiance a ce qu'il lit.
 */
export function parseSettingValue(
  definition: SettingDefinition,
  raw: string | undefined,
): Result<unknown> {
  const valeur = (raw ?? "").trim();

  switch (definition.kind) {
    case "boolean":
      return ok(valeur === "on" || valeur === "true");

    case "number":
    case "percent": {
      if (valeur.length === 0) return ok(0);

      const nombre = Number(valeur.replace(",", "."));
      if (!Number.isFinite(nombre)) {
        return fail(
          DomainError.validation(`${definition.label} doit être un nombre.`, definition.key),
        );
      }
      if (nombre < 0) {
        return fail(
          DomainError.validation(
            `${definition.label} ne peut pas être négatif.`,
            definition.key,
          ),
        );
      }
      if (definition.kind === "percent" && nombre > 100) {
        return fail(
          DomainError.validation(
            `${definition.label} doit être compris entre 0 et 100 %.`,
            definition.key,
          ),
        );
      }

      return ok(nombre);
    }

    case "email": {
      // Vide est accepte : un parametre facultatif doit pouvoir le rester.
      if (valeur.length > 0 && !EMAIL.test(valeur)) {
        return fail(
          DomainError.validation(
            `${definition.label} n'est pas une adresse email valide.`,
            definition.key,
          ),
        );
      }
      return ok(valeur);
    }

    case "url": {
      if (valeur.length > 0 && !/^https?:\/\//i.test(valeur)) {
        return fail(
          DomainError.validation(
            `${definition.label} doit commencer par http:// ou https://.`,
            definition.key,
          ),
        );
      }
      return ok(valeur);
    }

    case "time": {
      if (valeur.length > 0 && !/^\d{2}:\d{2}$/.test(valeur)) {
        return fail(
          DomainError.validation(
            `${definition.label} doit être une heure au format 08:00.`,
            definition.key,
          ),
        );
      }
      return ok(valeur);
    }

    case "image": {
      if (valeur.length > 0 && !valeur.startsWith("/") && !/^https?:\/\//i.test(valeur)) {
        return fail(
          DomainError.validation(
            `${definition.label} doit être un chemin commençant par « / » ou une adresse http.`,
            definition.key,
          ),
        );
      }
      return ok(valeur);
    }

    default:
      return ok(valeur);
  }
}
