/**
 * Catalogue des permissions et matrice des roles (module 1 — RBAC).
 *
 * Ce fichier est du DOMAINE : il ne depend ni de Prisma, ni de Next.js, ni
 * d'aucune bibliotheque. C'est la source de verite de « qui a le droit de faire
 * quoi » dans TED'S SERVICE. Les tables `permissions` et `role_permissions`
 * de la base ne font que refleter ce qui est declare ici (voir prisma/seed.ts).
 *
 * Convention : "<module>.<action>".
 */

/**
 * Les 8 roles du cahier des charges (section 3).
 *
 * Ce sont les roles « systeme » : ils existent a l'installation, ne se
 * suppriment pas, et servent de valeur par defaut au seed. D'autres roles se
 * creent depuis /roles — d'ou un identifiant en texte libre plutot qu'une
 * enumeration figee dans le code et dans PostgreSQL.
 */
export const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "DIRECTEUR",
  "RESPONSABLE_RH",
  "COMPTABLE",
  "COMMERCIAL",
  "FORMATEUR",
  "SECRETAIRE",
  "AGENT",
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number];

/**
 * Nom d'un role. Volontairement du texte : un role cree depuis l'interface est
 * un role comme un autre, et le code ne peut pas en connaitre la liste.
 */
export type RoleName = string;

export function isSystemRole(name: string): name is SystemRole {
  return (SYSTEM_ROLES as readonly string[]).includes(name);
}

/**
 * Normalise un nom saisi : « responsable caisse » devient
 * « RESPONSABLE_CAISSE ». C'est ce qui rend l'identifiant stable quel que soit
 * le soin apporte a la saisie.
 */
export function toRoleName(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    // Retire les accents une fois la chaine decomposee (e + accent aigu).
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Libelles des roles systeme. Un role cree porte son propre libelle en base. */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super administrateur",
  DIRECTEUR: "Directeur",
  RESPONSABLE_RH: "Responsable RH",
  COMPTABLE: "Comptable",
  COMMERCIAL: "Commercial",
  FORMATEUR: "Formateur",
  SECRETAIRE: "Secrétaire",
  AGENT: "Agent",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  SUPER_ADMIN: "Accès complet à toutes les fonctionnalités et aux paramètres.",
  DIRECTEUR: "Pilotage global, validation des salaires et accès aux rapports.",
  RESPONSABLE_RH: "Gestion du personnel, des contrats, des présences et des congés.",
  COMPTABLE: "Gestion financière : caisse, comptabilité, paiements et paie.",
  COMMERCIAL: "Vente des formations, des documents et des prestations.",
  FORMATEUR: "Gestion des cours, des notes et de l'évaluation des apprenants.",
  SECRETAIRE: "Gestion administrative, inscriptions et documents.",
  AGENT: "Consultation de son espace personnel.",
};

/* -------------------------------------------------------------------------- */
/* Catalogue des permissions                                                   */
/* -------------------------------------------------------------------------- */

export const PERMISSIONS = {
  // Module 2 — Employes
  EMPLOYEES_READ: "employees.read",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_UPDATE: "employees.update",
  EMPLOYEES_DELETE: "employees.delete",

  // Module 3 — Contrats
  CONTRACTS_READ: "contracts.read",
  CONTRACTS_MANAGE: "contracts.manage",

  // Module 4 — Presences et conges
  ATTENDANCE_READ: "attendance.read",
  ATTENDANCE_MANAGE: "attendance.manage",
  LEAVES_READ: "leaves.read",
  LEAVES_REQUEST: "leaves.request",
  LEAVES_APPROVE: "leaves.approve",

  // Module 5 — Salaires
  PAYROLL_READ: "payroll.read",
  PAYROLL_CALCULATE: "payroll.calculate",
  PAYROLL_VALIDATE: "payroll.validate",
  PAYROLL_PAY: "payroll.pay",

  // Module 6 — Commissions
  COMMISSIONS_READ: "commissions.read",
  COMMISSIONS_MANAGE: "commissions.manage",

  // Modules 7 et 10 — Ventes de documents et prestations
  SALES_READ: "sales.read",
  SALES_CREATE: "sales.create",
  SALES_CANCEL: "sales.cancel",
  PRODUCTS_MANAGE: "products.manage",
  SERVICES_MANAGE: "services.manage",

  // Modules 8 et 9 — Formations et apprenants
  TRAININGS_READ: "trainings.read",
  TRAININGS_MANAGE: "trainings.manage",
  STUDENTS_READ: "students.read",
  STUDENTS_MANAGE: "students.manage",
  GRADES_MANAGE: "grades.manage",
  CERTIFICATES_ISSUE: "certificates.issue",

  // Modules 11 et 12 — Caisse et comptabilite
  CASH_READ: "cash.read",
  CASH_MANAGE: "cash.manage",
  ACCOUNTING_READ: "accounting.read",
  ACCOUNTING_MANAGE: "accounting.manage",
  PAYMENTS_MANAGE: "payments.manage",

  // Module 13 — Stock
  INVENTORY_READ: "inventory.read",
  INVENTORY_MANAGE: "inventory.manage",

  // Modules 14 et 15 — Rapports et tableau de bord
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  DASHBOARD_GLOBAL: "dashboard.global",

  // Module 1 — Administration
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  AUDIT_READ: "audit.read",

  // Module 17 — Parametres
  SETTINGS_READ: "settings.read",
  SETTINGS_MANAGE: "settings.manage",

  // Module 18 — Vitrine publique
  LANDING_READ: "landing.read",
  LANDING_MANAGE: "landing.manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

/**
 * Joker reserve au super administrateur.
 * Le stocker explicitement evite d'avoir a re-attribuer toutes les permissions
 * a chaque fois qu'un module est ajoute.
 */
export const WILDCARD = "*" as const;

/* -------------------------------------------------------------------------- */
/* Matrice roles -> permissions                                                */
/* -------------------------------------------------------------------------- */

const P = PERMISSIONS;

/**
 * Socle initial des roles systeme.
 *
 * Ce n'est PLUS la source de verite a l'execution : les droits d'un role vivent
 * dans `role_permissions` et se modifient depuis /roles. Cette matrice sert
 * a l'installation (`prisma db seed`) et de repli pour le role joker.
 */
export const ROLE_PERMISSIONS: Record<string, readonly (Permission | typeof WILDCARD)[]> = {
  SUPER_ADMIN: [WILDCARD],

  // Le directeur voit tout et arbitre, mais ne saisit pas au quotidien.
  DIRECTEUR: [
    P.EMPLOYEES_READ,
    P.CONTRACTS_READ,
    P.ATTENDANCE_READ,
    P.LEAVES_READ,
    P.LEAVES_APPROVE,
    P.PAYROLL_READ,
    P.PAYROLL_VALIDATE,
    P.COMMISSIONS_READ,
    P.SALES_READ,
    P.TRAININGS_READ,
    P.STUDENTS_READ,
    P.CASH_READ,
    P.ACCOUNTING_READ,
    P.INVENTORY_READ,
    P.REPORTS_VIEW,
    P.REPORTS_EXPORT,
    P.DASHBOARD_GLOBAL,
    P.USERS_READ,
    P.AUDIT_READ,
    P.SETTINGS_READ,
    P.LANDING_READ,
  ],

  RESPONSABLE_RH: [
    P.EMPLOYEES_READ,
    P.EMPLOYEES_CREATE,
    P.EMPLOYEES_UPDATE,
    P.EMPLOYEES_DELETE,
    P.CONTRACTS_READ,
    P.CONTRACTS_MANAGE,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MANAGE,
    P.LEAVES_READ,
    P.LEAVES_REQUEST,
    P.LEAVES_APPROVE,
    P.PAYROLL_READ,
    P.PAYROLL_CALCULATE,
    P.COMMISSIONS_READ,
    P.REPORTS_VIEW,
    P.REPORTS_EXPORT,
    P.DASHBOARD_GLOBAL,
    P.USERS_READ,
  ],

  COMPTABLE: [
    P.EMPLOYEES_READ,
    P.PAYROLL_READ,
    P.PAYROLL_CALCULATE,
    P.PAYROLL_VALIDATE,
    P.PAYROLL_PAY,
    P.COMMISSIONS_READ,
    P.COMMISSIONS_MANAGE,
    P.SALES_READ,
    P.CASH_READ,
    P.CASH_MANAGE,
    P.ACCOUNTING_READ,
    P.ACCOUNTING_MANAGE,
    P.PAYMENTS_MANAGE,
    P.INVENTORY_READ,
    P.REPORTS_VIEW,
    P.REPORTS_EXPORT,
    P.DASHBOARD_GLOBAL,
  ],

  COMMERCIAL: [
    P.SALES_READ,
    P.SALES_CREATE,
    P.TRAININGS_READ,
    P.STUDENTS_READ,
    P.STUDENTS_MANAGE,
    P.COMMISSIONS_READ,
    P.INVENTORY_READ,
    P.LEAVES_REQUEST,
    P.PAYMENTS_MANAGE,
  ],

  FORMATEUR: [
    P.TRAININGS_READ,
    P.TRAININGS_MANAGE,
    P.STUDENTS_READ,
    P.GRADES_MANAGE,
    P.CERTIFICATES_ISSUE,
    P.ATTENDANCE_READ,
    P.LEAVES_REQUEST,
  ],

  SECRETAIRE: [
    P.EMPLOYEES_READ,
    P.STUDENTS_READ,
    P.STUDENTS_MANAGE,
    P.TRAININGS_READ,
    P.SALES_READ,
    P.SALES_CREATE,
    P.INVENTORY_READ,
    P.ATTENDANCE_READ,
    P.ATTENDANCE_MANAGE,
    P.LEAVES_REQUEST,
    P.PAYMENTS_MANAGE,
  ],

  // L'agent ne consulte que son espace personnel : aucune permission globale.
  AGENT: [P.LEAVES_REQUEST],
};

/* -------------------------------------------------------------------------- */
/* Catalogue par module — ce que voit l'ecran d'attribution des droits          */
/* -------------------------------------------------------------------------- */

/**
 * Le meme catalogue, regroupe par module fonctionnel et libelle en francais.
 *
 * C'est ce qui rend le systeme « modulaire » cote interface : l'administrateur
 * ne coche pas des codes techniques, il ouvre un module (Employes, Caisse,
 * Formations...) et attribue les droits qu'il veut a l'utilisateur de son
 * choix. Ajouter un module au produit revient a ajouter une entree ici.
 */
export interface PermissionModule {
  /** Prefixe des codes du module (« employees » pour employees.read). */
  key: string;
  label: string;
  description: string;
  permissions: ReadonlyArray<{ code: Permission; label: string }>;
}

export const PERMISSION_MODULES: readonly PermissionModule[] = [
  {
    key: "employees",
    label: "Employés",
    description: "Fiches du personnel (module 2).",
    permissions: [
      { code: P.EMPLOYEES_READ, label: "Consulter les fiches" },
      { code: P.EMPLOYEES_CREATE, label: "Créer une fiche" },
      { code: P.EMPLOYEES_UPDATE, label: "Modifier une fiche" },
      { code: P.EMPLOYEES_DELETE, label: "Archiver une fiche" },
    ],
  },
  {
    key: "contracts",
    label: "Contrats",
    description: "Contrats de travail (module 3).",
    permissions: [
      { code: P.CONTRACTS_READ, label: "Consulter les contrats" },
      { code: P.CONTRACTS_MANAGE, label: "Créer et modifier les contrats" },
    ],
  },
  {
    key: "attendance",
    label: "Présences et congés",
    description: "Pointage, absences et demandes de congé (module 4).",
    permissions: [
      { code: P.ATTENDANCE_READ, label: "Consulter les présences" },
      { code: P.ATTENDANCE_MANAGE, label: "Saisir et corriger les présences" },
      { code: P.LEAVES_READ, label: "Consulter les congés" },
      { code: P.LEAVES_REQUEST, label: "Demander un congé" },
      { code: P.LEAVES_APPROVE, label: "Approuver un congé" },
    ],
  },
  {
    key: "payroll",
    label: "Salaires",
    description: "Calcul, validation et paiement de la paie (module 5).",
    permissions: [
      { code: P.PAYROLL_READ, label: "Consulter les bulletins" },
      { code: P.PAYROLL_CALCULATE, label: "Calculer la paie" },
      { code: P.PAYROLL_VALIDATE, label: "Valider la paie" },
      { code: P.PAYROLL_PAY, label: "Payer les salaires" },
    ],
  },
  {
    key: "commissions",
    label: "Commissions",
    description: "Commissions sur ventes (module 6).",
    permissions: [
      { code: P.COMMISSIONS_READ, label: "Consulter les commissions" },
      { code: P.COMMISSIONS_MANAGE, label: "Calculer et ajuster les commissions" },
    ],
  },
  {
    key: "sales",
    label: "Ventes et prestations",
    description: "Documents vendus et prestations de service (modules 7 et 10).",
    permissions: [
      { code: P.SALES_READ, label: "Consulter les ventes" },
      { code: P.SALES_CREATE, label: "Enregistrer une vente" },
      { code: P.SALES_CANCEL, label: "Annuler une vente" },
      { code: P.PRODUCTS_MANAGE, label: "Gérer le catalogue de documents" },
      { code: P.SERVICES_MANAGE, label: "Gérer le catalogue de prestations" },
    ],
  },
  {
    key: "trainings",
    label: "Formations et apprenants",
    description: "Sessions, inscriptions, notes et certificats (modules 8 et 9).",
    permissions: [
      { code: P.TRAININGS_READ, label: "Consulter les formations" },
      { code: P.TRAININGS_MANAGE, label: "Gérer les formations" },
      { code: P.STUDENTS_READ, label: "Consulter les apprenants" },
      { code: P.STUDENTS_MANAGE, label: "Gérer les apprenants" },
      { code: P.GRADES_MANAGE, label: "Saisir les notes" },
      { code: P.CERTIFICATES_ISSUE, label: "Délivrer les certificats" },
    ],
  },
  {
    key: "cash",
    label: "Caisse et comptabilité",
    description: "Encaissements, écritures et paiements (modules 11 et 12).",
    permissions: [
      { code: P.CASH_READ, label: "Consulter la caisse" },
      { code: P.CASH_MANAGE, label: "Tenir la caisse" },
      { code: P.ACCOUNTING_READ, label: "Consulter la comptabilité" },
      { code: P.ACCOUNTING_MANAGE, label: "Passer les écritures" },
      { code: P.PAYMENTS_MANAGE, label: "Encaisser les paiements" },
    ],
  },
  {
    key: "inventory",
    label: "Stock",
    description: "Fournitures et mouvements de stock (module 13).",
    permissions: [
      { code: P.INVENTORY_READ, label: "Consulter le stock" },
      { code: P.INVENTORY_MANAGE, label: "Gérer les entrées et sorties" },
    ],
  },
  {
    key: "reports",
    label: "Rapports et pilotage",
    description: "Statistiques et exports (modules 14 et 15).",
    permissions: [
      { code: P.REPORTS_VIEW, label: "Consulter les rapports" },
      { code: P.REPORTS_EXPORT, label: "Exporter les rapports" },
      { code: P.DASHBOARD_GLOBAL, label: "Voir le tableau de bord global" },
    ],
  },
  {
    key: "administration",
    label: "Administration",
    description: "Comptes, droits et journal d'audit (module 1).",
    permissions: [
      { code: P.USERS_READ, label: "Consulter les comptes" },
      { code: P.USERS_MANAGE, label: "Créer et modifier les comptes" },
      { code: P.ROLES_MANAGE, label: "Attribuer rôles et permissions" },
      { code: P.AUDIT_READ, label: "Consulter le journal d'audit" },
    ],
  },
  {
    key: "settings",
    label: "Paramètres",
    description: "Configuration de l'entreprise (module 17).",
    permissions: [
      { code: P.SETTINGS_READ, label: "Consulter les paramètres" },
      { code: P.SETTINGS_MANAGE, label: "Modifier les paramètres" },
    ],
  },
  {
    key: "landing",
    label: "Vitrine publique",
    description: "Contenu du site public — page « Questions » (module 18).",
    permissions: [
      { code: P.LANDING_READ, label: "Consulter la FAQ publique" },
      { code: P.LANDING_MANAGE, label: "Modifier la FAQ publique" },
    ],
  },
] as const;

/** Libelle francais d'une permission, indexe par code. */
export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_MODULES.flatMap((module) =>
    module.permissions.map((permission) => [permission.code, permission.label]),
  ),
);

/** Vrai si le code correspond a une permission du catalogue. */
export function isPermission(code: string): code is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(code);
}

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

/** Vrai si la liste de permissions accordees couvre la permission demandee. */
export function hasPermission(
  granted: readonly string[],
  required: Permission | Permission[],
): boolean {
  if (granted.includes(WILDCARD)) return true;

  const requirements = Array.isArray(required) ? required : [required];
  // Une seule permission suffit : les listes exprimees ici sont des « ou ».
  return requirements.some((permission) => granted.includes(permission));
}

/** Socle d'installation d'un role systeme ; vide pour un role cree. */
export function permissionsForRole(role: RoleName): readonly string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Vrai si le role dispose du joker.
 *
 * Le joker n'est pas une permission comme les autres : il ne se stocke pas en
 * base et ne s'attribue pas. Il appartient au seul role fondateur, ce qui
 * garantit qu'aucune manipulation depuis l'interface ne peut laisser le systeme
 * sans administrateur.
 */
export function isWildcardRole(role: RoleName): boolean {
  return permissionsForRole(role).includes(WILDCARD);
}

/** Libelle d'un role : celui de la base s'il existe, sinon celui du code. */
export function roleLabel(name: RoleName, label?: string | null): string {
  return label ?? ROLE_LABELS[name] ?? name;
}

/* -------------------------------------------------------------------------- */
/* Permissions individuelles                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Ecart declare pour un compte : une permission accordee en plus du role
 * (`granted: true`) ou retiree malgre le role (`granted: false`).
 */
export interface PermissionOverride {
  permission: Permission;
  granted: boolean;
}

/**
 * Droits reellement detenus par un utilisateur.
 *
 * Ordre de resolution — et il compte :
 *   1. le role donne le socle ;
 *   2. les permissions accordees individuellement s'y ajoutent ;
 *   3. les permissions retirees individuellement sont soustraites en dernier.
 *
 * Le refus l'emporte donc toujours : c'est la regle prudente.
 *
 * Le socle (`rolePermissions`) est passe par l'appelant, qui le lit dans la
 * table `role_permissions` : les droits d'un role se modifient depuis
 * l'interface, la matrice de ce fichier ne servant plus que de valeur initiale
 * (voir prisma/seed.ts). Seul le role joker reste decide par le code — sans
 * quoi une manipulation malheureuse pourrait laisser le systeme sans
 * administrateur.
 */
export function resolvePermissions(
  role: RoleName,
  rolePermissions: readonly string[],
  overrides: readonly PermissionOverride[] = [],
): string[] {
  if (isWildcardRole(role)) return [WILDCARD];

  const effectives = new Set<string>(rolePermissions);

  for (const override of overrides) {
    if (override.granted) effectives.add(override.permission);
  }
  for (const override of overrides) {
    if (!override.granted) effectives.delete(override.permission);
  }

  return [...effectives];
}

/**
 * Traduit une selection complete de droits (les cases cochees a l'ecran) en
 * ecarts par rapport a un socle.
 *
 * On ne stocke que la difference : si demain le role COMPTABLE gagne
 * `cash.manage`, tous les comptables l'obtiennent sans qu'il faille repasser
 * sur chaque fiche. Une case cochee qui vient deja du role ne produit donc
 * aucune ligne en base.
 */
export function diffFromBase(
  base: readonly string[],
  desired: readonly string[],
): PermissionOverride[] {
  const socle = new Set(base);
  const souhaitees = new Set(desired.filter(isPermission));

  const overrides: PermissionOverride[] = [];

  for (const permission of ALL_PERMISSIONS) {
    const dansLeSocle = socle.has(permission);
    const souhaitee = souhaitees.has(permission);

    if (souhaitee && !dansLeSocle) overrides.push({ permission, granted: true });
    if (!souhaitee && dansLeSocle) overrides.push({ permission, granted: false });
  }

  return overrides;
}
