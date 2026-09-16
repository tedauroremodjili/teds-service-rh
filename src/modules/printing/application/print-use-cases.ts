import "server-only";

import type { FieldOption } from "@/modules/resources/domain/field";
import {
  filterFields,
  listFields,
  type ResourceDefinition,
} from "@/modules/resources/domain/resource";
import type {
  ResourceFilters,
  ResourceRepository,
  ResourceRow,
} from "@/modules/resources/domain/resource-repository";
import { listOrientation, MAX_LIGNES_IMPRIMEES } from "../domain/printable";
import {
  getCashReceipt,
  getCertificate,
  getPaymentReceipt,
  getPayslip,
  getRegistrationInvoice,
  getSaleInvoice,
  getServiceInvoice,
  type CertificateData,
  type InvoiceData,
  type PayslipData,
  type ReceiptData,
} from "../infrastructure/print-queries";

/**
 * Cas d'usage de l'impression.
 *
 * Ils repondent a une seule question : « que faut-il charger pour imprimer
 * cette ressource ? ». Le gabarit est declare dans le domaine
 * (`domain/printable.ts`), la lecture riche est faite par l'infrastructure, et
 * ces fonctions font le lien — de sorte que les pages n'aient jamais a
 * connaitre ni l'un ni l'autre.
 */

/** Donnees prêtes a peindre, discriminees par gabarit. */
export type PrintedRecord =
  | { template: "bulletin"; data: PayslipData }
  | { template: "facture"; data: InvoiceData }
  | { template: "recu"; data: ReceiptData }
  | { template: "certificat"; data: CertificateData }
  | { template: "fiche"; row: ResourceRow };

/**
 * Chargeurs des pieces dediees, par cle de ressource.
 *
 * Le tableau reste ferme volontairement : une ressource qu'on n'a pas prevue
 * s'imprime en fiche generique plutot que d'echouer. Ajouter une piece revient
 * a declarer son gabarit dans `domain/printable.ts` et son chargeur ici.
 */
const CHARGEURS: Readonly<
  Record<string, (id: string) => Promise<PrintedRecord | null>>
> = {
  salaires: async (id) => {
    const data = await getPayslip(id);
    return data ? { template: "bulletin", data } : null;
  },
  ventes: async (id) => {
    const data = await getSaleInvoice(id);
    return data ? { template: "facture", data } : null;
  },
  prestations: async (id) => {
    const data = await getServiceInvoice(id);
    return data ? { template: "facture", data } : null;
  },
  inscriptions: async (id) => {
    const data = await getRegistrationInvoice(id);
    return data ? { template: "facture", data } : null;
  },
  paiements: async (id) => {
    const data = await getPaymentReceipt(id);
    return data ? { template: "recu", data } : null;
  },
  caisse: async (id) => {
    const data = await getCashReceipt(id);
    return data ? { template: "recu", data } : null;
  },
  certificats: async (id) => {
    const data = await getCertificate(id);
    return data ? { template: "certificat", data } : null;
  },
};

/**
 * Charge la piece d'un enregistrement.
 *
 * Renvoie `null` quand l'enregistrement n'existe pas — la page en fait un 404,
 * jamais une piece vide a en-tete de l'entreprise.
 */
export async function loadPrintedRecord(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  id: string,
): Promise<PrintedRecord | null> {
  const chargeur = CHARGEURS[definition.key];

  if (chargeur) {
    const piece = await chargeur(id);
    if (piece) return piece;
    // Piece dediee introuvable : l'enregistrement peut malgre tout exister
    // (une jointure obligatoire manquante, par exemple). On retombe alors sur
    // la fiche generique plutot que de refuser l'impression.
  }

  const row = await repository.findById(definition, id);
  return row ? { template: "fiche", row } : null;
}

/* -------------------------------------------------------------------------- */
/* Listes                                                                      */
/* -------------------------------------------------------------------------- */

export interface PrintedList {
  rows: ResourceRow[];
  /** Nombre total d'enregistrements correspondant aux criteres. */
  total: number;
  /** Criteres retenus, mis en forme pour etre imprimes avec la liste. */
  criteria: string[];
  orientation: "portrait" | "landscape";
}

/**
 * Charge une liste a imprimer.
 *
 * Elle reprend exactement les criteres de l'ecran de liste — c'est ce que
 * l'utilisateur voit, donc ce qu'il s'attend a obtenir sur papier. La
 * pagination, elle, ne suit pas : on imprime l'etat complet, plafonne a
 * `MAX_LIGNES_IMPRIMEES` pour ne pas figer le navigateur.
 */
export async function loadPrintedList(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  searchParams: Record<string, string | undefined>,
): Promise<PrintedList> {
  const filtres = filterFields(definition);

  const equals: Record<string, string> = {};
  for (const field of filtres) {
    const valeur = searchParams[field.name];
    if (valeur) equals[field.name] = valeur;
  }

  const criteres: ResourceFilters = { search: searchParams.recherche, equals };

  const page = await repository.list(definition, criteres, {
    page: 1,
    pageSize: MAX_LIGNES_IMPRIMEES,
  });

  return {
    rows: page.items,
    total: page.total,
    criteria: await describeCriteria(repository, definition, criteres),
    orientation: listOrientation(listFields(definition).length),
  };
}

/**
 * Traduit les criteres en phrases lisibles (« Statut : Payé »).
 *
 * Les filtres sur relation stockent un identifiant : imprimer « employeeId :
 * clx3f… » n'apprendrait rien. On recharge donc les libelles de la liste
 * deroulante, exactement comme l'ecran de liste le fait pour ses selecteurs.
 */
async function describeCriteria(
  repository: ResourceRepository,
  definition: ResourceDefinition,
  filters: ResourceFilters,
): Promise<string[]> {
  const phrases: string[] = [];

  if (filters.search) {
    phrases.push(`Recherche : « ${filters.search} »`);
  }

  for (const field of filterFields(definition)) {
    const valeur = filters.equals?.[field.name];
    if (!valeur) continue;

    let libelle = valeur;

    if (field.kind === "enum") {
      libelle = field.options?.find((option) => option.value === valeur)?.label ?? valeur;
    } else if (field.kind === "relation") {
      const options: FieldOption[] = await repository.optionsFor(field);
      libelle = options.find((option) => option.value === valeur)?.label ?? valeur;
    }

    phrases.push(`${field.label} : ${libelle}`);
  }

  return phrases;
}
