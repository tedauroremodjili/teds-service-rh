/**
 * Catalogue des ressources de l'ERP.
 *
 * Une entree = un ecran de liste, une fiche et deux formulaires, avec ses
 * permissions. C'est le seul endroit a modifier pour ouvrir un module : ni
 * page, ni action, ni requete a ecrire.
 *
 * Les permissions sont celles du module 1 : elles s'attribuent ensuite au
 * compte de son choix depuis /utilisateurs, ce qui rend chaque ecran ouvrable
 * ou fermable utilisateur par utilisateur.
 */

import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { LANDING_ICON_NAMES } from "@/modules/landing/domain/icon-names";

import { enumOptions, type FieldDefinition, type RelationTarget } from "./field";
import type { ResourceDefinition } from "./resource";

const P = PERMISSIONS;

/* -------------------------------------------------------------------------- */
/* Relations reutilisees                                                       */
/* -------------------------------------------------------------------------- */

const EMPLOYEE: RelationTarget = {
  model: "employee",
  property: "employee",
  labelFields: ["lastName", "firstName"],
  softDelete: true,
  orderBy: "lastName",
};

const seller = (property = "seller"): RelationTarget => ({ ...EMPLOYEE, property });

const STUDENT: RelationTarget = {
  model: "student",
  property: "student",
  labelFields: ["lastName", "firstName"],
  softDelete: true,
  orderBy: "lastName",
};

const TRAINING: RelationTarget = {
  model: "training",
  property: "training",
  labelFields: ["title"],
  softDelete: true,
  orderBy: "title",
};

/* -------------------------------------------------------------------------- */
/* Champs reutilises                                                           */
/* -------------------------------------------------------------------------- */

const reference = (prefix: string): FieldDefinition => ({
  name: "reference",
  label: "Référence",
  kind: "text",
  required: true,
  inList: true,
  autoValue: "reference",
  autoPrefix: prefix,
  hint: `Générée automatiquement (${prefix}-…) ; modifiable si votre numérotation diffère.`,
});

/**
 * Code ou matricule d'une fiche.
 *
 * Personne ne doit avoir a inventer un identifiant : le formulaire arrive avec
 * le prochain libre. Le champ reste modifiable — une entreprise qui a deja sa
 * codification doit pouvoir la conserver — et l'unicite est verifiee a
 * l'ecriture dans les deux cas.
 */
const code = (
  prefix: string,
  { name = "code", label = "Code" }: { name?: string; label?: string } = {},
): FieldDefinition => ({
  name,
  label,
  kind: "text",
  required: true,
  inList: true,
  autoValue: "code",
  autoPrefix: prefix,
  hint: `Généré automatiquement (${prefix}-0001) ; modifiable si votre codification diffère.`,
});

const employeeField = (
  label = "Employé",
  required = true,
  relation: RelationTarget = EMPLOYEE,
): FieldDefinition => ({
  name: `${relation.property}Id`,
  label,
  kind: "relation",
  required,
  inList: true,
  filterable: true,
  relation,
});

const notes: FieldDefinition = {
  name: "notes",
  label: "Notes",
  kind: "textarea",
};

const amount = (
  name: string,
  label: string,
  required = true,
  inList = false,
): FieldDefinition => ({
  name,
  label,
  kind: "money",
  required,
  inList,
  align: "right",
});

/**
 * Champ « icone » d'une carte vitrine : une liste fermee de noms Lucide,
 * traduite en composant par `modules/landing/presentation/landing-icons.ts`.
 */
const icon = (): FieldDefinition => ({
  name: "icon",
  label: "Icône",
  kind: "enum",
  required: true,
  options: enumOptions(LANDING_ICON_NAMES),
  hint: "Voir le nom exact de chaque icône sur lucide.dev/icons.",
});

/* -------------------------------------------------------------------------- */
/* Enumerations du schema                                                      */
/* -------------------------------------------------------------------------- */

const CONTRACT_TYPES = ["CDI", "CDD", "STAGE", "PRESTATION", "ESSAI", "APPRENTISSAGE"];
const CONTRACT_STATUSES = ["BROUILLON", "ACTIF", "SUSPENDU", "RENOUVELE", "EXPIRE", "RESILIE"];
const ATTENDANCE_STATUSES = [
  "PRESENT",
  "RETARD",
  "ABSENT",
  "ABSENCE_JUSTIFIEE",
  "CONGE",
  "AUTORISATION",
  "MISSION",
  "FERIE",
];
const LEAVE_TYPES = [
  "ANNUEL",
  "MALADIE",
  "MATERNITE",
  "PATERNITE",
  "SANS_SOLDE",
  "EXCEPTIONNEL",
  "AUTORISATION",
];
const LEAVE_STATUSES = ["EN_ATTENTE", "APPROUVE", "REFUSE", "ANNULE"];
const PAYROLL_STATUSES = ["BROUILLON", "CALCULE", "VALIDE", "PAYE", "ANNULE"];
const COMMISSION_SOURCES = ["VENTE_DOCUMENT", "INSCRIPTION_FORMATION", "PRESTATION"];
const COMMISSION_STATUSES = ["EN_ATTENTE", "VALIDEE", "INTEGREE_PAIE", "ANNULEE"];
const SALE_STATUSES = [
  "BROUILLON",
  "CONFIRMEE",
  "PAYEE",
  "PARTIELLEMENT_PAYEE",
  "ANNULEE",
];
const DOCUMENT_CATEGORIES = [
  "ATTESTATION",
  "CERTIFICAT",
  "DUPLICATA",
  "CARTE_ETUDIANT",
  "BADGE",
  "DOSSIER",
  "RELEVE_NOTES",
  "SUPPORT_COURS",
  "LIVRE",
];
const PRODUCT_STATUSES = ["DISPONIBLE", "RUPTURE", "ARCHIVE"];
const SERVICE_CATEGORIES = [
  "DEVELOPPEMENT_WEB",
  "DEVELOPPEMENT_MOBILE",
  "MAINTENANCE",
  "INSTALLATION_WINDOWS",
  "INSTALLATION_LOGICIELS",
  "GRAPHISME",
  "CREATION_LOGO",
  "CREATION_SITE",
  "CREATION_APPLICATION",
  "AUTRE",
];
const SERVICE_ORDER_STATUSES = [
  "DEVIS",
  "CONFIRMEE",
  "EN_COURS",
  "LIVREE",
  "FACTUREE",
  "ANNULEE",
];
const TRAINING_LEVELS = ["DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"];
const TRAINING_STATUSES = ["BROUILLON", "OUVERTE", "EN_COURS", "TERMINEE", "ANNULEE"];
const REGISTRATION_STATUSES = [
  "INSCRIT",
  "REINSCRIT",
  "EN_COURS",
  "TERMINE",
  "ABANDONNE",
  "ANNULE",
];
const GENDERS = ["MASCULIN", "FEMININ"];
const PAYMENT_METHODS = ["ESPECES", "MOBILE_MONEY", "VIREMENT", "CHEQUE", "CARTE"];
const PAYMENT_STATUSES = ["EN_ATTENTE", "CONFIRME", "ANNULE", "REMBOURSE"];
const PAYMENT_PURPOSES = [
  "FRAIS_INSCRIPTION",
  "FRAIS_FORMATION",
  "VENTE_DOCUMENT",
  "PRESTATION",
  "SALAIRE",
  "AUTRE",
];
const CASH_DIRECTIONS = ["ENTREE", "SORTIE"];
const REVENUE_SOURCES = ["VENTE_DOCUMENT", "FORMATION", "PRESTATION", "AUTRE"];
const EXPENSE_CATEGORIES = [
  "SALAIRE",
  "LOYER",
  "FOURNITURE",
  "TRANSPORT",
  "ELECTRICITE",
  "EAU",
  "INTERNET",
  "MAINTENANCE",
  "MARKETING",
  "IMPOT",
  "AUTRE",
];
const INVENTORY_CATEGORIES = [
  "LIVRE",
  "SUPPORT",
  "DOCUMENT",
  "BADGE",
  "CARTE",
  "CONSOMMABLE",
  "MATERIEL",
];
const STOCK_MOVEMENT_TYPES = ["ENTREE", "SORTIE", "INVENTAIRE", "PERTE"];

/* -------------------------------------------------------------------------- */
/* Le catalogue                                                                */
/* -------------------------------------------------------------------------- */

export const RESOURCES: readonly ResourceDefinition[] = [
  /* ---- Module 3 — Contrats ---- */
  {
    key: "contrats",
    summary: true,
    model: "contract",
    singular: "Contrat",
    plural: "Contrats",
    description: "Contrats de travail du personnel.",
    permissions: {
      read: P.CONTRACTS_READ,
      create: P.CONTRACTS_MANAGE,
      update: P.CONTRACTS_MANAGE,
      remove: P.CONTRACTS_MANAGE,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "notes"],
    orderBy: { field: "startDate", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "CTR",
    fields: [
      reference("CTR"),
      employeeField(),
      {
        name: "type",
        label: "Type",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(CONTRACT_TYPES),
      },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "BROUILLON",
        options: enumOptions(CONTRACT_STATUSES),
      },
      { name: "startDate", label: "Début", kind: "date", required: true, inList: true },
      {
        name: "endDate",
        label: "Fin",
        kind: "date",
        inList: true,
        hint: "Laisser vide pour un CDI.",
      },
      amount("baseSalary", "Salaire de base", true, true),
      { name: "trialMonths", label: "Période d'essai (mois)", kind: "integer" },
      {
        name: "workingHoursPerWeek",
        label: "Heures par semaine",
        kind: "integer",
        defaultValue: "40",
      },
      { name: "signedAt", label: "Signé le", kind: "date" },
      { name: "documentUrl", label: "Document (URL)", kind: "text" },
      { name: "terminationReason", label: "Motif de rupture", kind: "text" },
      notes,
    ],
  },

  /* ---- Module 4 — Presences ---- */
  {
    key: "presences",
    summary: true,
    model: "attendance",
    singular: "Pointage",
    plural: "Présences",
    description: "Pointage quotidien du personnel.",
    permissions: {
      read: P.ATTENDANCE_READ,
      create: P.ATTENDANCE_MANAGE,
      update: P.ATTENDANCE_MANAGE,
      remove: P.ATTENDANCE_MANAGE,
    },
    titleFields: ["date"],
    searchFields: ["notes"],
    orderBy: { field: "date", direction: "desc" },
    softDelete: false,
    deletable: true,
    fields: [
      employeeField(),
      { name: "date", label: "Jour", kind: "date", required: true, inList: true },
      { name: "checkIn", label: "Arrivée", kind: "datetime", inList: true },
      { name: "checkOut", label: "Départ", kind: "datetime", inList: true },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "PRESENT",
        options: enumOptions(ATTENDANCE_STATUSES),
      },
      {
        name: "lateMinutes",
        label: "Retard (minutes)",
        kind: "integer",
        inList: true,
        align: "right",
        defaultValue: "0",
      },
      {
        name: "overtimeMinutes",
        label: "Heures sup. (minutes)",
        kind: "integer",
        align: "right",
        defaultValue: "0",
      },
      notes,
    ],
  },

  /* ---- Module 4 — Conges ---- */
  {
    key: "conges",
    summary: true,
    model: "leave",
    singular: "Congé",
    plural: "Congés",
    description: "Demandes de congé et d'absence.",
    permissions: {
      read: P.LEAVES_READ,
      create: P.LEAVES_REQUEST,
      update: P.LEAVES_APPROVE,
      remove: P.LEAVES_APPROVE,
    },
    titleFields: ["type"],
    searchFields: ["reason"],
    orderBy: { field: "startDate", direction: "desc" },
    softDelete: false,
    deletable: true,
    fields: [
      employeeField(),
      {
        name: "type",
        label: "Type",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(LEAVE_TYPES),
      },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "EN_ATTENTE",
        options: enumOptions(LEAVE_STATUSES),
      },
      { name: "startDate", label: "Du", kind: "date", required: true, inList: true },
      { name: "endDate", label: "Au", kind: "date", required: true, inList: true },
      {
        name: "daysCount",
        label: "Jours décomptés",
        kind: "integer",
        required: true,
        inList: true,
        align: "right",
      },
      { name: "reason", label: "Motif", kind: "textarea" },
      { name: "rejectionReason", label: "Motif du refus", kind: "text" },
    ],
  },

  /* ---- Module 5 — Salaires ---- */
  {
    key: "salaires",
    summary: true,
    model: "payroll",
    singular: "Bulletin de paie",
    plural: "Salaires",
    description: "Bulletins de paie mensuels.",
    permissions: {
      read: P.PAYROLL_READ,
      create: P.PAYROLL_CALCULATE,
      update: P.PAYROLL_VALIDATE,
      remove: P.PAYROLL_VALIDATE,
    },
    titleFields: ["reference"],
    searchFields: ["reference"],
    orderBy: { field: "createdAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "PAY",
    compute: "payroll-totals",
    notice:
      "Le brut et le net sont calculés à partir des montants saisis. Les lignes détaillées du bulletin (primes, retenues) restent à saisir depuis le module Salaires dédié.",
    fields: [
      reference("PAY"),
      employeeField(),
      { name: "year", label: "Année", kind: "integer", required: true, inList: true },
      {
        name: "month",
        label: "Mois",
        kind: "integer",
        required: true,
        inList: true,
        hint: "1 = janvier, 12 = décembre.",
      },
      amount("baseSalary", "Salaire de base"),
      amount("totalBonuses", "Primes", false),
      amount("totalCommissions", "Commissions", false),
      amount("totalOvertime", "Heures supplémentaires", false),
      amount("totalDeductions", "Retenues", false),
      amount("totalAdvances", "Avances", false),
      {
        name: "grossSalary",
        label: "Salaire brut",
        kind: "money",
        inList: true,
        align: "right",
        computed: true,
      },
      {
        name: "netSalary",
        label: "Net à payer",
        kind: "money",
        inList: true,
        align: "right",
        computed: true,
      },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "BROUILLON",
        options: enumOptions(PAYROLL_STATUSES),
      },
    ],
  },

  /* ---- Module 6 — Commissions ---- */
  {
    key: "commissions",
    summary: true,
    model: "commission",
    singular: "Commission",
    plural: "Commissions",
    description: "Commissions dues aux agents sur les ventes et inscriptions.",
    permissions: {
      read: P.COMMISSIONS_READ,
      create: P.COMMISSIONS_MANAGE,
      update: P.COMMISSIONS_MANAGE,
      remove: P.COMMISSIONS_MANAGE,
    },
    titleFields: ["sourceType"],
    searchFields: ["sourceId"],
    orderBy: { field: "createdAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    fields: [
      employeeField("Agent"),
      {
        name: "sourceType",
        label: "Origine",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(COMMISSION_SOURCES),
      },
      {
        name: "sourceId",
        label: "Référence de l'opération",
        kind: "text",
        required: true,
        hint: "Identifiant de la vente, de l'inscription ou de la prestation concernée.",
      },
      amount("baseAmount", "Montant de base", true, true),
      {
        name: "rate",
        label: "Taux",
        kind: "percent",
        required: true,
        inList: true,
        align: "right",
      },
      amount("amount", "Commission", true, true),
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "EN_ATTENTE",
        options: enumOptions(COMMISSION_STATUSES),
      },
      {
        name: "ruleId",
        label: "Règle appliquée",
        kind: "relation",
        relation: { model: "commissionRule", property: "rule", labelFields: ["name"] },
      },
    ],
  },

  /* ---- Module 6 — Regles de commission ---- */
  {
    key: "regles-commission",
    model: "commissionRule",
    singular: "Règle de commission",
    plural: "Règles de commission",
    description: "Barèmes appliqués au calcul des commissions.",
    notice:
      "Ces règles sont globales (par type d'activité), sans employé ni formation précise. Pour attribuer une commission à un employé sur une formation donnée, utilisez plutôt l'écran « Rémunérations » (menu Ressources humaines).",
    permissions: {
      read: P.COMMISSIONS_READ,
      create: P.COMMISSIONS_MANAGE,
      update: P.COMMISSIONS_MANAGE,
      remove: P.COMMISSIONS_MANAGE,
    },
    titleFields: ["name"],
    searchFields: ["name"],
    orderBy: { field: "priority", direction: "desc" },
    softDelete: false,
    deletable: true,
    fields: [
      { name: "name", label: "Nom", kind: "text", required: true, inList: true },
      {
        name: "sourceType",
        label: "S'applique à",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(COMMISSION_SOURCES),
      },
      { name: "rate", label: "Taux", kind: "percent", required: true, inList: true, align: "right" },
      amount("fixedAmount", "Montant fixe", false),
      amount("minAmount", "Montant minimum", false),
      amount("maxAmount", "Montant maximum", false),
      { name: "isActive", label: "Active", kind: "boolean", inList: true, defaultValue: "on" },
      { name: "priority", label: "Priorité", kind: "integer", defaultValue: "0", align: "right" },
    ],
  },

  /* ---- Module 7 — Ventes de documents ---- */
  {
    key: "ventes",
    summary: true,
    model: "documentSale",
    singular: "Vente",
    plural: "Ventes",
    description: "Ventes de documents administratifs.",
    permissions: {
      read: P.SALES_READ,
      create: P.SALES_CREATE,
      update: P.SALES_CREATE,
      remove: P.SALES_CANCEL,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "customerName", "customerPhone"],
    orderBy: { field: "soldAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "VD",
    compute: "sale-totals",
    notice:
      "Le total est calculé : sous-total − remise + taxe. Le détail ligne par ligne des documents vendus se saisit depuis l'écran Documents.",
    fields: [
      reference("VD"),
      {
        ...employeeField("Vendeur", false, seller()),
        inList: false,
        inForm: false,
        hint: "TED'S SERVICE vend au prix fixe du document, sans notion de vendeur attitré.",
      },
      {
        name: "studentId",
        label: "Apprenant",
        kind: "relation",
        relation: STUDENT,
        hint: "À renseigner si le client est un apprenant enregistré.",
      },
      { name: "customerName", label: "Client", kind: "text", inList: true },
      { name: "customerPhone", label: "Téléphone", kind: "text" },
      amount("subtotal", "Sous-total"),
      amount("discount", "Remise", false),
      amount("taxAmount", "Taxe", false),
      {
        name: "totalAmount",
        label: "Total",
        kind: "money",
        inList: true,
        align: "right",
        computed: true,
      },
      amount("paidAmount", "Déjà payé", false, true),
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "BROUILLON",
        options: enumOptions(SALE_STATUSES),
      },
      { name: "soldAt", label: "Vendue le", kind: "datetime", required: true, inList: true },
    ],
  },

  /* ---- Module 7 — Catalogue de documents ---- */
  {
    key: "documents",
    summary: true,
    model: "documentProduct",
    singular: "Document",
    plural: "Documents",
    description: "Catalogue des documents administratifs vendus.",
    permissions: {
      read: P.SALES_READ,
      create: P.PRODUCTS_MANAGE,
      update: P.PRODUCTS_MANAGE,
      remove: P.PRODUCTS_MANAGE,
    },
    titleFields: ["name"],
    searchFields: ["code", "name", "description"],
    orderBy: { field: "name", direction: "asc" },
    softDelete: true,
    deletable: true,
    fields: [
      code("DOC"),
      { name: "name", label: "Libellé", kind: "text", required: true, inList: true },
      {
        name: "category",
        label: "Catégorie",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(DOCUMENT_CATEGORIES),
      },
      { name: "description", label: "Description", kind: "textarea" },
      amount("price", "Prix", true, true),
      {
        name: "stock",
        label: "Stock",
        kind: "integer",
        inList: true,
        align: "right",
        hint: "Laisser vide pour un document produit à la demande.",
      },
      { name: "alertStock", label: "Seuil d'alerte", kind: "integer", align: "right" },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "DISPONIBLE",
        options: enumOptions(PRODUCT_STATUSES),
      },
      { name: "commissionRate", label: "Taux de commission", kind: "percent", align: "right" },
    ],
  },

  /* ---- Module 10 — Prestations ---- */
  {
    key: "prestations",
    summary: true,
    model: "serviceOrder",
    singular: "Prestation",
    plural: "Prestations",
    description: "Commandes de prestations de services.",
    permissions: {
      read: P.SALES_READ,
      create: P.SALES_CREATE,
      update: P.SALES_CREATE,
      remove: P.SALES_CANCEL,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "customerName", "description"],
    orderBy: { field: "orderedAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "PRS",
    fields: [
      reference("PRS"),
      {
        name: "serviceId",
        label: "Prestation",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: { model: "service", property: "service", labelFields: ["name"], softDelete: true },
      },
      employeeField("Vendeur", true, seller()),
      { name: "studentId", label: "Apprenant", kind: "relation", relation: STUDENT },
      { name: "customerName", label: "Client", kind: "text", required: true, inList: true },
      { name: "customerPhone", label: "Téléphone", kind: "text" },
      { name: "customerEmail", label: "Email", kind: "text" },
      { name: "description", label: "Description", kind: "textarea" },
      amount("amount", "Montant", true, true),
      amount("paidAmount", "Déjà payé", false, true),
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "DEVIS",
        options: enumOptions(SERVICE_ORDER_STATUSES),
      },
      { name: "orderedAt", label: "Commandée le", kind: "datetime", required: true, inList: true },
      { name: "deliveredAt", label: "Livrée le", kind: "datetime" },
    ],
  },

  /* ---- Module 10 — Catalogue de prestations ---- */
  {
    key: "catalogue-prestations",
    model: "service",
    singular: "Service",
    plural: "Catalogue des prestations",
    description: "Services proposés et leur tarif indicatif.",
    permissions: {
      read: P.SALES_READ,
      create: P.SERVICES_MANAGE,
      update: P.SERVICES_MANAGE,
      remove: P.SERVICES_MANAGE,
    },
    titleFields: ["name"],
    searchFields: ["code", "name", "description"],
    orderBy: { field: "name", direction: "asc" },
    softDelete: true,
    deletable: true,
    fields: [
      code("SRV"),
      { name: "name", label: "Nom", kind: "text", required: true, inList: true },
      {
        name: "category",
        label: "Catégorie",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(SERVICE_CATEGORIES),
      },
      { name: "description", label: "Description", kind: "textarea" },
      amount("basePrice", "Prix indicatif", true, true),
      { name: "commissionRate", label: "Taux de commission", kind: "percent", align: "right" },
      { name: "isActive", label: "Actif", kind: "boolean", inList: true, defaultValue: "on" },
    ],
  },

  /* ---- Module 8 — Formations ---- */
  {
    key: "formations",
    summary: true,
    model: "training",
    singular: "Formation",
    plural: "Formations",
    description: "Sessions de formation proposées par le centre.",
    permissions: {
      read: P.TRAININGS_READ,
      create: P.TRAININGS_MANAGE,
      update: P.TRAININGS_MANAGE,
      remove: P.TRAININGS_MANAGE,
    },
    titleFields: ["title"],
    searchFields: ["code", "title", "description"],
    orderBy: { field: "startDate", direction: "desc" },
    softDelete: true,
    deletable: true,
    fields: [
      code("FOR"),
      { name: "title", label: "Intitulé", kind: "text", required: true, inList: true },
      { name: "description", label: "Description", kind: "textarea" },
      { name: "program", label: "Programme", kind: "textarea" },
      {
        name: "categoryId",
        label: "Catégorie",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: { model: "trainingCategory", property: "category", labelFields: ["name"] },
      },
      {
        name: "level",
        label: "Niveau",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "DEBUTANT",
        options: enumOptions(TRAINING_LEVELS),
      },
      {
        name: "durationHours",
        label: "Durée (heures)",
        kind: "integer",
        required: true,
        align: "right",
      },
      amount("price", "Prix", true, true),
      { name: "maxStudents", label: "Places", kind: "integer", align: "right" },
      { name: "startDate", label: "Début", kind: "date", inList: true },
      { name: "endDate", label: "Fin", kind: "date" },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "BROUILLON",
        options: enumOptions(TRAINING_STATUSES),
      },
      {
        name: "trainerId",
        label: "Formateur",
        kind: "relation",
        inList: true,
        relation: { ...EMPLOYEE, property: "trainer" },
      },
    ],
  },

  /* ---- Module 9 — Apprenants ---- */
  {
    key: "apprenants",
    summary: true,
    model: "student",
    singular: "Apprenant",
    plural: "Apprenants",
    description: "Fiches des apprenants inscrits au centre.",
    permissions: {
      read: P.STUDENTS_READ,
      create: P.STUDENTS_MANAGE,
      update: P.STUDENTS_MANAGE,
      remove: P.STUDENTS_MANAGE,
    },
    titleFields: ["firstName", "lastName"],
    searchFields: ["matricule", "firstName", "lastName", "phone", "email"],
    orderBy: { field: "lastName", direction: "asc" },
    softDelete: true,
    deletable: true,
    fields: [
      code("APP", { name: "matricule", label: "Matricule" }),
      { name: "lastName", label: "Nom", kind: "text", required: true, inList: true },
      { name: "firstName", label: "Prénom", kind: "text", required: true, inList: true },
      {
        name: "gender",
        label: "Sexe",
        kind: "enum",
        required: true,
        filterable: true,
        options: enumOptions(GENDERS, { MASCULIN: "Masculin", FEMININ: "Féminin" }),
      },
      { name: "birthDate", label: "Date de naissance", kind: "date" },
      { name: "phone", label: "Téléphone", kind: "text", required: true, inList: true },
      { name: "email", label: "Email", kind: "text", inList: true },
      { name: "address", label: "Adresse", kind: "textarea" },
      { name: "educationLevel", label: "Niveau d'études", kind: "text" },
    ],
  },

  /* ---- Module 9 — Inscriptions ---- */
  {
    key: "inscriptions",
    model: "studentRegistration",
    singular: "Inscription",
    plural: "Inscriptions",
    description: "Inscriptions des apprenants aux sessions de formation.",
    permissions: {
      read: P.STUDENTS_READ,
      create: P.STUDENTS_MANAGE,
      update: P.STUDENTS_MANAGE,
      remove: P.STUDENTS_MANAGE,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "evaluation"],
    orderBy: { field: "registeredAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "INS",
    notice:
      "« Déjà payé » se met à jour tout seul dès qu'un paiement « Frais de formation » est enregistré pour cette inscription depuis l'écran Paiements — ne le modifiez pas ici. Le paiement des frais d'inscription se saisit lui aussi depuis Paiements, avec l'objet « Frais d'inscription ».",
    fields: [
      reference("INS"),
      {
        name: "studentId",
        label: "Apprenant",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: STUDENT,
      },
      {
        name: "trainingId",
        label: "Formation",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: TRAINING,
      },
      {
        name: "sellerId",
        label: "Commercial",
        kind: "relation",
        relation: seller(),
      },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "INSCRIT",
        options: enumOptions(REGISTRATION_STATUSES),
      },
      {
        ...amount("registrationFee", "Frais d'inscription", true, true),
        defaultValue: "2000",
        hint: "Versé une fois à l'entrée. Se règle depuis Paiements, objet « Frais d'inscription ».",
      },
      amount("agreedAmount", "Montant convenu", true, true),
      amount("discount", "Remise", false),
      {
        ...amount("paidAmount", "Déjà payé", false, true),
        computed: true,
        hint: "Somme des paiements « Frais de formation » confirmés pour cette inscription. Automatique.",
      },
      { name: "registeredAt", label: "Inscrit le", kind: "datetime", required: true, inList: true },
      {
        name: "finalGrade",
        label: "Note finale /20",
        kind: "number",
        align: "right",
        inList: true,
      },
      { name: "evaluation", label: "Appréciation", kind: "textarea" },
    ],
  },

  /* ---- Module 9 — Notes ---- */
  {
    key: "notes",
    model: "grade",
    singular: "Note",
    plural: "Notes",
    description: "Évaluations saisies pour chaque inscription.",
    permissions: {
      read: P.STUDENTS_READ,
      create: P.GRADES_MANAGE,
      update: P.GRADES_MANAGE,
      remove: P.GRADES_MANAGE,
    },
    titleFields: ["label"],
    searchFields: ["label"],
    orderBy: { field: "gradedAt", direction: "desc" },
    softDelete: false,
    deletable: true,
    fields: [
      {
        name: "registrationId",
        label: "Inscription",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: {
          model: "studentRegistration",
          property: "registration",
          labelFields: ["reference"],
        },
      },
      { name: "label", label: "Évaluation", kind: "text", required: true, inList: true },
      { name: "score", label: "Note", kind: "number", required: true, inList: true, align: "right" },
      {
        name: "maxScore",
        label: "Barème",
        kind: "number",
        required: true,
        defaultValue: "20",
        align: "right",
      },
      { name: "weight", label: "Coefficient", kind: "number", defaultValue: "1", align: "right" },
      { name: "gradedAt", label: "Saisie le", kind: "datetime", required: true, inList: true },
    ],
  },

  /* ---- Module 9 — Certificats ---- */
  {
    key: "certificats",
    summary: true,
    model: "certificate",
    singular: "Certificat",
    plural: "Certificats",
    description: "Certificats délivrés aux apprenants.",
    permissions: {
      read: P.TRAININGS_READ,
      create: P.CERTIFICATES_ISSUE,
      update: P.CERTIFICATES_ISSUE,
      remove: P.CERTIFICATES_ISSUE,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "verificationCode", "mention"],
    orderBy: { field: "issuedAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "CERT",
    fields: [
      reference("CERT"),
      {
        name: "studentId",
        label: "Apprenant",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: STUDENT,
      },
      {
        name: "trainingId",
        label: "Formation",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: TRAINING,
      },
      {
        name: "registrationId",
        label: "Inscription",
        kind: "relation",
        relation: {
          model: "studentRegistration",
          property: "registration",
          labelFields: ["reference"],
        },
      },
      { name: "issuedAt", label: "Délivré le", kind: "datetime", required: true, inList: true },
      { name: "mention", label: "Mention", kind: "text", inList: true },
      {
        name: "verificationCode",
        label: "Code de vérification",
        kind: "text",
        required: true,
        autoValue: "token",
        hint: "Jeton unique permettant de vérifier l'authenticité du certificat.",
      },
      { name: "pdfUrl", label: "PDF (URL)", kind: "text" },
    ],
  },

  /* ---- Module 11 — Caisse ---- */
  {
    key: "caisse",
    summary: true,
    model: "cashTransaction",
    singular: "Mouvement de caisse",
    plural: "Caisse",
    description: "Journal des entrées et sorties d'espèces.",
    permissions: {
      read: P.CASH_READ,
      create: P.CASH_MANAGE,
      update: P.CASH_MANAGE,
      remove: P.CASH_MANAGE,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "label", "category"],
    orderBy: { field: "occurredAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "CAI",
    compute: "cash-balance",
    notice:
      "Le solde après opération est calculé à partir du dernier mouvement enregistré ; une sortie supérieure au solde est refusée.",
    fields: [
      reference("CAI"),
      {
        name: "direction",
        label: "Sens",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(CASH_DIRECTIONS, { ENTREE: "Entrée", SORTIE: "Sortie" }),
      },
      amount("amount", "Montant", true, true),
      {
        name: "balanceAfter",
        label: "Solde après",
        kind: "money",
        inList: true,
        align: "right",
        computed: true,
      },
      { name: "label", label: "Libellé", kind: "text", required: true, inList: true },
      { name: "category", label: "Catégorie", kind: "text" },
      { name: "occurredAt", label: "Date", kind: "datetime", required: true, inList: true },
      employeeField("Employé concerné", false),
    ],
  },

  /* ---- Modules 11-12 — Paiements ---- */
  {
    key: "paiements",
    model: "payment",
    singular: "Paiement",
    plural: "Paiements",
    description: "Encaissements et décaissements rattachés à une opération.",
    permissions: {
      read: P.CASH_READ,
      create: P.PAYMENTS_MANAGE,
      update: P.PAYMENTS_MANAGE,
      remove: P.PAYMENTS_MANAGE,
    },
    titleFields: ["reference"],
    searchFields: ["reference", "externalReference", "notes"],
    orderBy: { field: "paidAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "PMT",
    compute: "registration-payment",
    notice:
      "L'objet du paiement décide de la commission calculée (500 F sur une inscription, un pourcentage sur une formation...) : pour un versement lié à une inscription, choisissez « Frais d'inscription » la première fois, « Frais de formation » pour chaque tranche suivante.",
    fields: [
      reference("PMT"),
      amount("amount", "Montant", true, true),
      {
        name: "purpose",
        label: "Objet du paiement",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "FRAIS_FORMATION",
        options: enumOptions(PAYMENT_PURPOSES, {
          FRAIS_INSCRIPTION: "Frais d'inscription",
          FRAIS_FORMATION: "Frais de formation",
          VENTE_DOCUMENT: "Vente de document",
          PRESTATION: "Prestation",
          SALAIRE: "Salaire",
          AUTRE: "Autre",
        }),
        hint: "Une tranche de formation ? Choisissez « Frais de formation », même après la première.",
      },
      {
        name: "method",
        label: "Moyen",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "ESPECES",
        options: enumOptions(PAYMENT_METHODS, { MOBILE_MONEY: "Mobile Money" }),
      },
      {
        name: "status",
        label: "Statut",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        defaultValue: "CONFIRME",
        options: enumOptions(PAYMENT_STATUSES),
      },
      { name: "paidAt", label: "Payé le", kind: "datetime", required: true, inList: true },
      {
        name: "documentSaleId",
        label: "Vente de documents",
        kind: "relation",
        relation: {
          model: "documentSale",
          property: "documentSale",
          labelFields: ["reference"],
        },
      },
      {
        name: "registrationId",
        label: "Inscription",
        kind: "relation",
        relation: {
          model: "studentRegistration",
          property: "registration",
          labelFields: ["reference"],
        },
      },
      {
        name: "serviceOrderId",
        label: "Prestation",
        kind: "relation",
        relation: { model: "serviceOrder", property: "serviceOrder", labelFields: ["reference"] },
      },
      {
        name: "payrollId",
        label: "Bulletin de paie",
        kind: "relation",
        relation: { model: "payroll", property: "payroll", labelFields: ["reference"] },
      },
      { name: "externalReference", label: "Référence externe", kind: "text" },
      notes,
    ],
  },

  /* ---- Module 12 — Comptabilite ---- */
  {
    key: "comptabilite",
    summary: true,
    model: "accountingEntry",
    singular: "Écriture",
    plural: "Comptabilité",
    description: "Journal comptable : grand livre et balance.",
    permissions: {
      read: P.ACCOUNTING_READ,
      create: P.ACCOUNTING_MANAGE,
      update: P.ACCOUNTING_MANAGE,
      remove: P.ACCOUNTING_MANAGE,
    },
    titleFields: ["label"],
    searchFields: ["accountCode", "accountName", "label"],
    orderBy: { field: "entryDate", direction: "desc" },
    softDelete: false,
    deletable: false,
    fields: [
      { name: "entryDate", label: "Date", kind: "date", required: true, inList: true },
      { name: "accountCode", label: "Compte", kind: "text", required: true, inList: true },
      { name: "accountName", label: "Intitulé du compte", kind: "text", required: true, inList: true },
      { name: "label", label: "Libellé", kind: "text", required: true, inList: true },
      amount("debit", "Débit", false, true),
      amount("credit", "Crédit", false, true),
      { name: "sourceType", label: "Pièce", kind: "text" },
      { name: "sourceId", label: "Référence de la pièce", kind: "text" },
    ],
  },

  /* ---- Module 12 — Depenses ---- */
  {
    key: "depenses",
    model: "expense",
    singular: "Dépense",
    plural: "Dépenses",
    description: "Charges et dépenses de l'entreprise.",
    permissions: {
      read: P.ACCOUNTING_READ,
      create: P.ACCOUNTING_MANAGE,
      update: P.ACCOUNTING_MANAGE,
      remove: P.ACCOUNTING_MANAGE,
    },
    titleFields: ["label"],
    searchFields: ["reference", "label", "supplier"],
    orderBy: { field: "occurredAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "DEP",
    fields: [
      reference("DEP"),
      {
        name: "category",
        label: "Catégorie",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(EXPENSE_CATEGORIES),
      },
      { name: "label", label: "Libellé", kind: "text", required: true, inList: true },
      amount("amount", "Montant", true, true),
      { name: "occurredAt", label: "Date", kind: "datetime", required: true, inList: true },
      { name: "supplier", label: "Fournisseur", kind: "text", inList: true },
      { name: "receiptUrl", label: "Justificatif (URL)", kind: "text" },
      notes,
    ],
  },

  /* ---- Module 12 — Recettes ---- */
  {
    key: "recettes",
    model: "revenue",
    singular: "Recette",
    plural: "Recettes",
    description: "Produits encaissés par l'entreprise.",
    permissions: {
      read: P.ACCOUNTING_READ,
      create: P.ACCOUNTING_MANAGE,
      update: P.ACCOUNTING_MANAGE,
      remove: P.ACCOUNTING_MANAGE,
    },
    titleFields: ["label"],
    searchFields: ["reference", "label"],
    orderBy: { field: "occurredAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    referencePrefix: "REC",
    fields: [
      reference("REC"),
      {
        name: "source",
        label: "Origine",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(REVENUE_SOURCES),
      },
      { name: "label", label: "Libellé", kind: "text", required: true, inList: true },
      amount("amount", "Montant", true, true),
      { name: "occurredAt", label: "Date", kind: "datetime", required: true, inList: true },
      { name: "sourceId", label: "Référence de l'opération", kind: "text" },
      notes,
    ],
  },

  /* ---- Module 13 — Stock ---- */
  {
    key: "stock",
    summary: true,
    model: "inventoryItem",
    singular: "Article",
    plural: "Stock",
    description: "Fournitures et articles détenus par le centre.",
    permissions: {
      read: P.INVENTORY_READ,
      create: P.INVENTORY_MANAGE,
      update: P.INVENTORY_MANAGE,
      remove: P.INVENTORY_MANAGE,
    },
    titleFields: ["name"],
    searchFields: ["code", "name", "location"],
    orderBy: { field: "name", direction: "asc" },
    softDelete: true,
    deletable: true,
    notice:
      "La quantité se corrige par un mouvement de stock, qui laisse une trace ; la modifier directement ici ne crée aucun historique.",
    fields: [
      code("ART"),
      { name: "name", label: "Article", kind: "text", required: true, inList: true },
      {
        name: "category",
        label: "Catégorie",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(INVENTORY_CATEGORIES),
      },
      { name: "unit", label: "Unité", kind: "text", defaultValue: "unite" },
      {
        name: "quantity",
        label: "Quantité",
        kind: "integer",
        required: true,
        inList: true,
        align: "right",
        defaultValue: "0",
      },
      {
        name: "alertQuantity",
        label: "Seuil d'alerte",
        kind: "integer",
        inList: true,
        align: "right",
        defaultValue: "0",
      },
      amount("unitCost", "Coût unitaire", false, true),
      { name: "location", label: "Emplacement", kind: "text" },
    ],
  },

  /* ---- Module 13 — Mouvements de stock ---- */
  {
    key: "mouvements-stock",
    model: "stockMovement",
    singular: "Mouvement de stock",
    plural: "Mouvements de stock",
    description: "Entrées, sorties, pertes et inventaires.",
    permissions: {
      read: P.INVENTORY_READ,
      create: P.INVENTORY_MANAGE,
      update: P.INVENTORY_MANAGE,
      remove: P.INVENTORY_MANAGE,
    },
    titleFields: ["label"],
    searchFields: ["label"],
    orderBy: { field: "occurredAt", direction: "desc" },
    softDelete: false,
    deletable: false,
    compute: "stock-movement",
    notice:
      "Enregistrer un mouvement met à jour la quantité de l'article dans la même transaction.",
    fields: [
      {
        name: "itemId",
        label: "Article",
        kind: "relation",
        required: true,
        inList: true,
        filterable: true,
        relation: {
          model: "inventoryItem",
          property: "item",
          labelFields: ["name"],
          softDelete: true,
          orderBy: "name",
        },
      },
      {
        name: "type",
        label: "Type",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(STOCK_MOVEMENT_TYPES, { ENTREE: "Entrée" }),
      },
      {
        name: "quantity",
        label: "Quantité",
        kind: "integer",
        required: true,
        inList: true,
        align: "right",
      },
      {
        name: "quantityAfter",
        label: "Stock après",
        kind: "integer",
        inList: true,
        align: "right",
        computed: true,
      },
      { name: "label", label: "Motif", kind: "text", inList: true },
      { name: "occurredAt", label: "Date", kind: "datetime", required: true, inList: true },
    ],
  },

  /* ---- Module 2 — Departements ---- */
  {
    key: "departements",
    model: "department",
    singular: "Département",
    plural: "Départements",
    description: "Découpage de l'entreprise en départements.",
    permissions: {
      read: P.EMPLOYEES_READ,
      create: P.EMPLOYEES_UPDATE,
      update: P.EMPLOYEES_UPDATE,
      remove: P.EMPLOYEES_DELETE,
    },
    titleFields: ["name"],
    searchFields: ["code", "name"],
    orderBy: { field: "name", direction: "asc" },
    softDelete: true,
    deletable: true,
    fields: [
      code("DEP"),
      { name: "name", label: "Nom", kind: "text", required: true, inList: true },
      { name: "description", label: "Description", kind: "textarea" },
    ],
  },

  /* ---- Module 2 — Postes ---- */
  {
    key: "postes",
    model: "position",
    singular: "Poste",
    plural: "Postes",
    description: "Postes occupés dans l'entreprise et salaire de référence.",
    permissions: {
      read: P.EMPLOYEES_READ,
      create: P.EMPLOYEES_UPDATE,
      update: P.EMPLOYEES_UPDATE,
      remove: P.EMPLOYEES_DELETE,
    },
    titleFields: ["title"],
    searchFields: ["code", "title"],
    orderBy: { field: "title", direction: "asc" },
    softDelete: true,
    deletable: true,
    fields: [
      code("POS"),
      { name: "title", label: "Intitulé", kind: "text", required: true, inList: true },
      {
        name: "departmentId",
        label: "Département",
        kind: "relation",
        inList: true,
        filterable: true,
        relation: {
          model: "department",
          property: "department",
          labelFields: ["name"],
          softDelete: true,
          orderBy: "name",
        },
      },
      amount("baseSalary", "Salaire de référence", false, true),
      { name: "description", label: "Description", kind: "textarea" },
    ],
  },

  /* ---- Module 17 — Parametres ---- */
  {
    key: "parametres",
    summary: true,
    model: "setting",
    idField: "key",
    singular: "Paramètre",
    plural: "Paramètres",
    description: "Configuration de l'entreprise, une clé par réglage.",
    permissions: {
      read: P.SETTINGS_READ,
      create: P.SETTINGS_MANAGE,
      update: P.SETTINGS_MANAGE,
      remove: P.SETTINGS_MANAGE,
    },
    titleFields: ["label"],
    searchFields: ["key", "label", "category"],
    orderBy: { field: "key", direction: "asc" },
    softDelete: false,
    deletable: true,
    fields: [
      {
        name: "key",
        label: "Clé",
        kind: "text",
        required: true,
        inList: true,
        hint: "Identifiant technique du réglage (entreprise.nom, paie.taux_cnss…).",
      },
      { name: "label", label: "Libellé", kind: "text", required: true, inList: true },
      {
        name: "value",
        label: "Valeur (JSON)",
        kind: "json",
        required: true,
        hint: 'Exemples : "TED\'S SERVICE", 12.5, true, {"tva": 18}.',
      },
      {
        name: "category",
        label: "Catégorie",
        kind: "text",
        inList: true,
        filterable: false,
        defaultValue: "general",
      },
      { name: "description", label: "Description", kind: "textarea" },
    ],
  },

  /* ---- Module 18 — FAQ vitrine ---- */
  {
    key: "faq",
    model: "faqEntry",
    singular: "Question",
    plural: "FAQ",
    description: "Questions fréquentes affichées sur la page publique /questions.",
    permissions: {
      read: P.LANDING_READ,
      create: P.LANDING_MANAGE,
      update: P.LANDING_MANAGE,
      remove: P.LANDING_MANAGE,
    },
    titleFields: ["question"],
    searchFields: ["question", "answer"],
    orderBy: { field: "order", direction: "asc" },
    softDelete: false,
    deletable: true,
    fields: [
      { name: "question", label: "Question", kind: "text", required: true, inList: true },
      { name: "answer", label: "Réponse", kind: "textarea", required: true },
      {
        name: "order",
        label: "Ordre d'affichage",
        kind: "integer",
        inList: true,
        defaultValue: "0",
        align: "right",
        hint: "Les questions s'affichent du plus petit au plus grand numéro.",
      },
    ],
  },

  /* ---- Module 18 — Modules du produit (accueil, /fonctionnalites) ---- */
  {
    key: "modules-vitrine",
    model: "landingModule",
    singular: "Module",
    plural: "Modules vitrine",
    description: "Cartes « module du produit » affichées sur l'accueil et /fonctionnalites.",
    permissions: {
      read: P.LANDING_READ,
      create: P.LANDING_MANAGE,
      update: P.LANDING_MANAGE,
      remove: P.LANDING_MANAGE,
    },
    titleFields: ["title"],
    searchFields: ["title", "description"],
    orderBy: { field: "order", direction: "asc" },
    softDelete: false,
    deletable: true,
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true, inList: true },
      { name: "description", label: "Description", kind: "textarea", required: true },
      icon(),
      {
        name: "famille",
        label: "Famille",
        kind: "enum",
        required: true,
        inList: true,
        filterable: true,
        options: enumOptions(
          ["RESSOURCES_HUMAINES", "ACTIVITE", "FINANCES", "PILOTAGE"],
          {
            RESSOURCES_HUMAINES: "Ressources humaines",
            ACTIVITE: "Activité",
            FINANCES: "Finances",
            PILOTAGE: "Pilotage",
          },
        ),
        hint: "Regroupement affiché au-dessus des cartes.",
      },
      {
        name: "order",
        label: "Ordre d'affichage",
        kind: "integer",
        inList: true,
        defaultValue: "0",
        align: "right",
      },
    ],
  },

  /* ---- Module 18 — Arguments (« pourquoi choisir », /avantages) ---- */
  {
    key: "arguments-vitrine",
    model: "landingArgument",
    singular: "Argument",
    plural: "Arguments vitrine",
    description: "Cartes « pourquoi choisir TED'S SERVICE » affichées sur /avantages.",
    permissions: {
      read: P.LANDING_READ,
      create: P.LANDING_MANAGE,
      update: P.LANDING_MANAGE,
      remove: P.LANDING_MANAGE,
    },
    titleFields: ["title"],
    searchFields: ["title", "description"],
    orderBy: { field: "order", direction: "asc" },
    softDelete: false,
    deletable: true,
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true, inList: true },
      { name: "description", label: "Description", kind: "textarea", required: true },
      icon(),
      {
        name: "order",
        label: "Ordre d'affichage",
        kind: "integer",
        inList: true,
        defaultValue: "0",
        align: "right",
      },
    ],
  },

  /* ---- Module 18 — Étapes du parcours (/fonctionnement) ---- */
  {
    key: "etapes-vitrine",
    model: "landingWorkflowStep",
    singular: "Étape",
    plural: "Étapes vitrine",
    description: "Étapes du parcours affichées sur /fonctionnement, dans l'ordre choisi.",
    permissions: {
      read: P.LANDING_READ,
      create: P.LANDING_MANAGE,
      update: P.LANDING_MANAGE,
      remove: P.LANDING_MANAGE,
    },
    titleFields: ["title"],
    searchFields: ["title", "description"],
    orderBy: { field: "order", direction: "asc" },
    softDelete: false,
    deletable: true,
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true, inList: true },
      { name: "description", label: "Description", kind: "textarea", required: true },
      icon(),
      {
        name: "order",
        label: "Ordre d'affichage",
        kind: "integer",
        inList: true,
        defaultValue: "0",
        align: "right",
        hint: "Détermine aussi le numéro affiché (« Étape 1 », « Étape 2 »...).",
      },
    ],
  },
] as const;

/** Ressource correspondant a un segment d'URL, ou null si l'URL est inconnue. */
export function findResource(key: string): ResourceDefinition | null {
  return RESOURCES.find((resource) => resource.key === key) ?? null;
}

/**
 * Permission de lecture par route, pour le filtre optimiste du proxy.
 * Deriver cette table du catalogue evite qu'une ressource ajoutee reste
 * accessible en navigation directe faute d'entree correspondante.
 */
export function resourceRoutePermissions(): ReadonlyArray<{
  prefix: string;
  permission: ResourceDefinition["permissions"]["read"];
}> {
  return RESOURCES.map((resource) => ({
    prefix: `/${resource.key}`,
    permission: resource.permissions.read,
  }));
}
