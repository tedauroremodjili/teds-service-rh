/**
 * Jeu de donnees initial de TED'S SERVICE.
 *
 * Ce script est idempotent : il utilise `upsert` partout, on peut donc le
 * relancer sans dupliquer quoi que ce soit.
 *
 * Il installe :
 *   - les 8 roles et leurs permissions (matrice du module auth) ;
 *   - les departements et postes de base ;
 *   - un compte super administrateur ;
 *   - quelques employes de demonstration ;
 *   - les regles de commission de l'exemple du cahier des charges ;
 *   - les parametres de l'entreprise.
 *
 * Lancement : npm run db:seed
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/infrastructure/database/generated/client";
import {
  ALL_PERMISSIONS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  SYSTEM_ROLES,
  WILDCARD,
} from "../src/modules/auth/domain/permissions";

// Prisma 7 ne charge plus .env tout seul.
if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const MOT_DE_PASSE_PAR_DEFAUT = "Teds@2026";

async function seedPermissions() {
  console.log("→ Permissions…");

  for (const code of ALL_PERMISSIONS) {
    const [module, action] = code.split(".");
    await prisma.permission.upsert({
      where: { code },
      update: { module, action },
      create: { code, module, action, description: `Permission ${code}` },
    });
  }

  console.log(`  ${ALL_PERMISSIONS.length} permissions enregistrées.`);
}

async function seedRoles() {
  console.log("→ Rôles et matrice RBAC…");

  for (const roleName of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { label: ROLE_LABELS[roleName], description: ROLE_DESCRIPTIONS[roleName] },
      create: {
        name: roleName,
        label: ROLE_LABELS[roleName],
        description: ROLE_DESCRIPTIONS[roleName],
        isSystem: true,
      },
    });

    const declarees = ROLE_PERMISSIONS[roleName];
    // Le super administrateur porte le joker : on lui rattache tout le catalogue.
    const codes = declarees.includes(WILDCARD)
      ? ALL_PERMISSIONS
      : (declarees as readonly string[]);

    const permissions = await prisma.permission.findMany({
      where: { code: { in: [...codes] } },
      select: { id: true },
    });

    // ATTENTION — on repart d'une table vide pour ce role.
    // Depuis que les roles s'editent depuis /roles, cette table est modifiee en
    // production : relancer le seed REINITIALISE les socles aux valeurs du
    // cahier des charges et efface les ajustements faits dans l'interface.
    // Les permissions attribuees compte par compte (user_permissions), elles,
    // ne sont pas touchees.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });

    console.log(`  ${ROLE_LABELS[roleName]} → ${permissions.length} permissions`);
  }
}

async function seedStructure() {
  console.log("→ Départements et postes…");

  const departements = [
    { code: "DIR", name: "Direction", description: "Direction générale et pilotage" },
    { code: "RH", name: "Ressources humaines", description: "Gestion du personnel" },
    { code: "FIN", name: "Comptabilité et finances", description: "Caisse, comptabilité, paie" },
    { code: "COM", name: "Commercial", description: "Ventes de formations et de documents" },
    { code: "FOR", name: "Formation", description: "Corps enseignant et pédagogie" },
    { code: "TEC", name: "Technique", description: "Prestations informatiques et maintenance" },
    { code: "ADM", name: "Administration", description: "Secrétariat et accueil" },
  ];

  for (const departement of departements) {
    await prisma.department.upsert({
      where: { code: departement.code },
      update: { name: departement.name, description: departement.description },
      create: departement,
    });
  }

  const postes = [
    { code: "DG", title: "Directeur général", departement: "DIR", baseSalary: 800_000 },
    { code: "RRH", title: "Responsable RH", departement: "RH", baseSalary: 450_000 },
    { code: "CPT", title: "Comptable", departement: "FIN", baseSalary: 400_000 },
    { code: "COM", title: "Agent commercial", departement: "COM", baseSalary: 250_000 },
    { code: "FORM", title: "Formateur", departement: "FOR", baseSalary: 300_000 },
    { code: "DEV", title: "Développeur", departement: "TEC", baseSalary: 350_000 },
    { code: "SEC", title: "Secrétaire", departement: "ADM", baseSalary: 200_000 },
  ];

  for (const poste of postes) {
    const departement = await prisma.department.findUnique({
      where: { code: poste.departement },
      select: { id: true },
    });

    await prisma.position.upsert({
      where: { code: poste.code },
      update: { title: poste.title, baseSalary: poste.baseSalary, departmentId: departement?.id },
      create: {
        code: poste.code,
        title: poste.title,
        baseSalary: poste.baseSalary,
        departmentId: departement?.id,
      },
    });
  }

  console.log(`  ${departements.length} départements, ${postes.length} postes.`);
}

async function seedCommissionRules() {
  console.log("→ Règles de commission…");

  /**
   * Les deux exemples du module 6 du cahier des charges :
   *   formation vendue 300 000 FCFA à 10 %  → 30 000 FCFA
   *   document vendu    15 000 FCFA à 20 %  →  3 000 FCFA
   */
  const regles = [
    {
      name: "Commission sur inscription à une formation",
      sourceType: "INSCRIPTION_FORMATION" as const,
      rate: 10,
      priority: 10,
    },
    {
      name: "Commission sur vente de document administratif",
      sourceType: "VENTE_DOCUMENT" as const,
      rate: 20,
      priority: 10,
    },
    {
      name: "Commission sur prestation de service",
      sourceType: "PRESTATION" as const,
      rate: 15,
      priority: 10,
    },
  ];

  for (const regle of regles) {
    const existante = await prisma.commissionRule.findFirst({
      where: { sourceType: regle.sourceType, name: regle.name },
      select: { id: true },
    });

    if (existante) {
      await prisma.commissionRule.update({
        where: { id: existante.id },
        data: { rate: regle.rate, priority: regle.priority, isActive: true },
      });
    } else {
      await prisma.commissionRule.create({ data: regle });
    }
  }

  console.log(`  ${regles.length} règles actives.`);
}

interface CompteDemo {
  email: string;
  role: (typeof SYSTEM_ROLES)[number];
  matricule: string;
  firstName: string;
  lastName: string;
  gender: "MASCULIN" | "FEMININ";
  poste: string;
  departement: string;
  baseSalary: number;
  commissionRate: number;
  phone: string;
}

async function seedUtilisateurs() {
  console.log("→ Comptes et employés de démonstration…");

  const passwordHash = await bcrypt.hash(MOT_DE_PASSE_PAR_DEFAUT, 12);

  const comptes: CompteDemo[] = [
    {
      email: "admin@tedsservice.cg",
      role: "SUPER_ADMIN",
      matricule: "TSS-0001",
      firstName: "Ted",
      lastName: "Administrateur",
      gender: "MASCULIN",
      poste: "DG",
      departement: "DIR",
      baseSalary: 800_000,
      commissionRate: 0,
      phone: "+242 06 000 00 01",
    },
    {
      email: "rh@tedsservice.cg",
      role: "RESPONSABLE_RH",
      matricule: "TSS-0002",
      firstName: "Grace",
      lastName: "Mabiala",
      gender: "FEMININ",
      poste: "RRH",
      departement: "RH",
      baseSalary: 450_000,
      commissionRate: 0,
      phone: "+242 06 000 00 02",
    },
    {
      email: "comptable@tedsservice.cg",
      role: "COMPTABLE",
      matricule: "TSS-0003",
      firstName: "Josué",
      lastName: "Nkodia",
      gender: "MASCULIN",
      poste: "CPT",
      departement: "FIN",
      baseSalary: 400_000,
      commissionRate: 0,
      phone: "+242 06 000 00 03",
    },
    {
      email: "commercial@tedsservice.cg",
      role: "COMMERCIAL",
      matricule: "TSS-0004",
      firstName: "Sarah",
      lastName: "Loubaki",
      gender: "FEMININ",
      poste: "COM",
      departement: "COM",
      baseSalary: 250_000,
      commissionRate: 10,
      phone: "+242 06 000 00 04",
    },
    {
      email: "formateur@tedsservice.cg",
      role: "FORMATEUR",
      matricule: "TSS-0005",
      firstName: "Aymar",
      lastName: "Ondongo",
      gender: "MASCULIN",
      poste: "FORM",
      departement: "FOR",
      baseSalary: 300_000,
      commissionRate: 0,
      phone: "+242 06 000 00 05",
    },
    {
      email: "secretaire@tedsservice.cg",
      role: "SECRETAIRE",
      matricule: "TSS-0006",
      firstName: "Divine",
      lastName: "Bouiti",
      gender: "FEMININ",
      poste: "SEC",
      departement: "ADM",
      baseSalary: 200_000,
      commissionRate: 5,
      phone: "+242 06 000 00 06",
    },
  ];

  for (const compte of comptes) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: compte.role } });
    const departement = await prisma.department.findUnique({
      where: { code: compte.departement },
      select: { id: true },
    });
    const poste = await prisma.position.findUnique({
      where: { code: compte.poste },
      select: { id: true },
    });

    const user = await prisma.user.upsert({
      where: { email: compte.email },
      update: { roleId: role.id, status: "ACTIF" },
      create: {
        email: compte.email,
        passwordHash,
        roleId: role.id,
        status: "ACTIF",
      },
    });

    // On repere la fiche employe par le compte utilisateur, pas par le
    // matricule : celui-ci n'est qu'une suggestion de depart. Une base ou des
    // fiches ont deja ete creees depuis l'interface (matricules attribues au
    // meme rythme TSS-0001, TSS-0002…) peut avoir pris le numero prevu ici
    // avant que ce script ne s'execute — chercher par matricule aurait alors
    // heurte la fiche de quelqu'un d'autre.
    const existant = await prisma.employee.findUnique({ where: { userId: user.id } });

    if (existant) {
      await prisma.employee.update({
        where: { id: existant.id },
        data: {
          departmentId: departement?.id,
          positionId: poste?.id,
          baseSalary: compte.baseSalary,
          commissionRate: compte.commissionRate,
        },
      });
      continue;
    }

    // Nouvelle fiche : le matricule suggere n'est utilisable que s'il n'a pas
    // deja ete pris par quelqu'un d'autre (typiquement une fiche creee a la
    // main). Le cas echeant, on repart du plus grand numero attribue en base,
    // comme le fait `suggestMatricule()` cote application.
    const pris = await prisma.employee.findUnique({
      where: { matricule: compte.matricule },
      select: { id: true },
    });

    let matricule = compte.matricule;
    if (pris) {
      const dernier = await prisma.employee.findFirst({
        orderBy: { matricule: "desc" },
        select: { matricule: true },
      });
      const dernierNumero = dernier ? Number.parseInt(dernier.matricule.replace(/^TSS-/, ""), 10) : 0;
      const suivant = Number.isFinite(dernierNumero) ? dernierNumero + 1 : 1;
      matricule = `TSS-${String(suivant).padStart(4, "0")}`;
    }

    await prisma.employee.create({
      data: {
        matricule,
        firstName: compte.firstName,
        lastName: compte.lastName,
        gender: compte.gender,
        birthDate: new Date("1992-01-15"),
        nationality: "Congolaise",
        phone: compte.phone,
        email: compte.email,
        hireDate: new Date("2024-01-08"),
        departmentId: departement?.id,
        positionId: poste?.id,
        baseSalary: compte.baseSalary,
        commissionRate: compte.commissionRate,
        status: "ACTIF",
        userId: user.id,
      },
    });
  }

  console.log(`  ${comptes.length} comptes créés (mot de passe : ${MOT_DE_PASSE_PAR_DEFAUT}).`);
}

async function seedParametres() {
  console.log("→ Paramètres de l'entreprise…");

  const parametres = [
    { key: "company.name", value: "TED'S SERVICE", label: "Raison sociale" },
    {
      key: "company.slogan",
      value: "Learning & Tech Solutions",
      label: "Slogan",
    },
    { key: "company.address", value: "Brazzaville, République du Congo", label: "Adresse" },
    { key: "company.phone", value: "+242 06 830 65 42", label: "Téléphone" },
    { key: "company.email", value: "contact@tedsservice.cg", label: "Email" },
    // Le PNG detoure, et non le JPEG d'origine : ce dernier porte un fond gris
    // qui dessine un rectangle visible sur le papier a en-tete (meme raison que
    // dans shared/ui/logo.tsx).
    { key: "company.logo", value: "/logo.png", label: "Logo" },
    // Mentions legales portees sur les factures et les recus. Vides a
    // l'installation : elles ne s'impriment que si elles sont renseignees.
    { key: "company.rccm", value: "", label: "Numéro RCCM" },
    { key: "company.niu", value: "", label: "Numéro d'identification unique (NIU)" },
    { key: "company.website", value: "", label: "Site web" },
    { key: "finance.currency", value: "FCFA", label: "Monnaie" },
    { key: "finance.vatRate", value: 18, label: "Taux de TVA (%)" },
    { key: "hr.workingHoursPerWeek", value: 40, label: "Heures hebdomadaires" },
    { key: "hr.annualLeaveDays", value: 26, label: "Jours de congé annuel" },
    { key: "hr.workDayStart", value: "08:00", label: "Heure d'arrivée théorique" },
    { key: "hr.workDayEnd", value: "17:00", label: "Heure de départ théorique" },
  ];

  for (const parametre of parametres) {
    await prisma.setting.upsert({
      where: { key: parametre.key },
      update: { value: parametre.value, label: parametre.label },
      create: {
        key: parametre.key,
        value: parametre.value,
        label: parametre.label,
        category: parametre.key.split(".")[0],
      },
    });
  }

  console.log(`  ${parametres.length} paramètres.`);
}

async function seedFaq() {
  console.log("→ FAQ de la vitrine…");

  const questions = [
    {
      question: "Faut-il installer un logiciel ?",
      answer:
        "Non. TED'S SERVICE ERP s'ouvre dans un navigateur, sur ordinateur comme sur téléphone. Il n'y a rien à installer ni à mettre à jour sur les postes.",
    },
    {
      question: "Comment sont calculées les commissions ?",
      answer:
        "Chaque employé possède un barème : un pourcentage ou un montant fixe, par activité et éventuellement par formation, document ou prestation précis. À chaque encaissement, la règle la plus spécifique s'applique et produit une ligne de rémunération. Le total du mois s'ajoute au salaire de base.",
    },
    {
      question: "Un apprenant peut-il payer en plusieurs fois ?",
      answer:
        "Oui. Les frais d'inscription et les frais de formation sont distincts, et chaque versement est enregistré séparément. La rémunération de l'encadrant est calculée au fil des paiements réellement reçus, jamais sur un montant attendu.",
    },
    {
      question: "Qui peut voir quoi ?",
      answer:
        "Le rôle donne un socle de droits, et chaque compte peut recevoir ou perdre des permissions individuellement. Un commercial ne voit pas la comptabilité ; un comptable ne modifie pas les fiches du personnel. Le contrôle est vérifié à chaque page et à chaque enregistrement, jamais seulement à l'affichage.",
    },
    {
      question: "Peut-on imprimer les documents officiels ?",
      answer:
        "Oui : bulletins de paie, factures, reçus, certificats et états de liste. L'impression et l'enregistrement en PDF passent par le navigateur, ce qui garantit que le fichier est identique à ce qui sort de l'imprimante.",
    },
    {
      question: "Les données sont-elles en sécurité ?",
      answer:
        "Les mots de passe sont chiffrés et jamais stockés en clair, les sessions expirent, les tentatives de connexion sont limitées, et un journal d'audit conserve la trace de chaque action sensible avec son auteur et sa date.",
    },
    {
      question: "L'application gère-t-elle plusieurs devises ?",
      answer:
        "Les montants sont tenus en francs CFA, la monnaie de fonctionnement de TED'S SERVICE. La gestion multi-devises fait partie des évolutions prévues.",
    },
    {
      question: "Comment obtenir un accès ?",
      answer:
        "Les comptes sont créés par l'administrateur depuis le module Utilisateurs, avec le rôle correspondant à la fonction. Adressez-vous à la direction ou au responsable des ressources humaines.",
    },
  ];

  // Pas de cle naturelle sur cette table : on repart de zero a chaque
  // lancement, comme les regles de commission. La FAQ se modifie ensuite
  // depuis /faq, jamais en relancant ce script en production.
  if ((await prisma.faqEntry.count()) === 0) {
    await prisma.faqEntry.createMany({
      data: questions.map((entree, index) => ({ ...entree, order: index })),
    });
  }

  console.log(`  ${questions.length} questions.`);
}

/**
 * Modules, arguments et etapes de la vitrine (module 18).
 *
 * Meme raisonnement que la FAQ ci-dessus : le contenu se modifie ensuite
 * depuis /modules-vitrine, /arguments-vitrine et /etapes-vitrine, jamais en
 * relancant ce script en production.
 */
async function seedLandingContent() {
  console.log("→ Modules, arguments et étapes de la vitrine…");

  const modules = [
    {
      title: "Ressources humaines",
      description:
        "Fiches du personnel, départements, postes et documents administratifs, réunis en un dossier par employé.",
      icon: "Users",
      famille: "RESSOURCES_HUMAINES",
    },
    {
      title: "Gestion des salaires",
      description:
        "Salaire de base, primes, retenues et avances. Le net à payer se calcule, il ne se saisit pas.",
      icon: "Banknote",
      famille: "RESSOURCES_HUMAINES",
    },
    {
      title: "Commissions",
      description:
        "Un barème par activité et par employé. Chaque encaissement produit sa ligne de rémunération, automatiquement.",
      icon: "Percent",
      famille: "RESSOURCES_HUMAINES",
    },
    {
      title: "Présences",
      description:
        "Pointage des arrivées et des départs, retards, absences et autorisations, avec leur historique.",
      icon: "CalendarClock",
      famille: "RESSOURCES_HUMAINES",
    },
    {
      title: "Contrats",
      description:
        "CDI, CDD, stages et prestations. Les échéances sont surveillées et signalées avant qu'il ne soit trop tard.",
      icon: "FileSignature",
      famille: "RESSOURCES_HUMAINES",
    },
    {
      title: "Vente de documents",
      description:
        "Attestations, certificats, duplicatas, cartes et badges. Chaque vente génère sa facture et son reçu.",
      icon: "FileText",
      famille: "ACTIVITE",
    },
    {
      title: "Gestion des formations",
      description:
        "Catalogue, sessions, formateurs et programmes. Le suivi pédagogique tient dans le même écran que la facturation.",
      icon: "GraduationCap",
      famille: "ACTIVITE",
    },
    {
      title: "Apprenants",
      description:
        "Inscriptions, réinscriptions, paiements échelonnés, notes et certificats — le parcours complet.",
      icon: "BadgeCheck",
      famille: "ACTIVITE",
    },
    {
      title: "Prestations",
      description:
        "Développement, maintenance, installation, graphisme : du devis à la livraison, puis à l'encaissement.",
      icon: "ShoppingCart",
      famille: "ACTIVITE",
    },
    {
      title: "Comptabilité",
      description:
        "Recettes, dépenses, journal et grand livre. Les écritures naissent des opérations, pas d'une double saisie.",
      icon: "ScrollText",
      famille: "FINANCES",
    },
    {
      title: "Caisse",
      description: "Entrées, sorties et solde en temps réel. Chaque mouvement porte sa pièce justificative.",
      icon: "Wallet",
      famille: "FINANCES",
    },
    {
      title: "Stock",
      description: "Livres, supports, badges et consommables, avec seuils d'alerte et inventaire.",
      icon: "Boxes",
      famille: "FINANCES",
    },
    {
      title: "Rapports",
      description:
        "Ventes, ressources humaines, salaires, formations et trésorerie. Filtrables, imprimables, exportables.",
      icon: "BarChart3",
      famille: "PILOTAGE",
    },
    {
      title: "Tableau de bord",
      description: "Effectif, recettes, dépenses, résultat et ventes. Les chiffres du jour, pas ceux du mois dernier.",
      icon: "LayoutDashboard",
      famille: "PILOTAGE",
    },
  ] as const;

  const argumentsVitrine = [
    {
      title: "Calcul automatique des salaires",
      description:
        "Base, primes, heures supplémentaires, retenues et commissions se combinent en un net à payer. Aucune addition à refaire à la main.",
      icon: "Banknote",
    },
    {
      title: "Commissions intelligentes",
      description:
        "Un pourcentage ou un forfait, par formation, par document ou par prestation. La règle la plus précise l'emporte, sans cumul involontaire.",
      icon: "Percent",
    },
    {
      title: "Suivi des ventes",
      description:
        "Chaque vente sait qui l'a réalisée, ce qu'elle a rapporté et ce qu'elle a généré en commission.",
      icon: "TrendingUp",
    },
    {
      title: "Formations et apprenants",
      description:
        "De l'inscription au certificat, en passant par les paiements échelonnés et les notes.",
      icon: "GraduationCap",
    },
    {
      title: "Statistiques en temps réel",
      description:
        "Les graphiques lisent la base à l'instant où vous ouvrez la page. Rien n'est mis en cache à votre insu.",
      icon: "BarChart3",
    },
    {
      title: "Documents imprimables",
      description:
        "Bulletins, factures, reçus et états s'impriment ou s'enregistrent en PDF depuis le navigateur, à l'identique.",
      icon: "Printer",
    },
    {
      title: "Sécurité et traçabilité",
      description:
        "Mots de passe chiffrés, droits attribués permission par permission, et un journal qui retient qui a fait quoi.",
      icon: "ShieldCheck",
    },
    {
      title: "Accessible partout",
      description:
        "Ordinateur, tablette ou téléphone : la même application, adaptée à chaque écran, sans rien à installer.",
      icon: "Smartphone",
    },
  ] as const;

  const etapes = [
    {
      title: "Créer un agent",
      description: "Sa fiche, son poste, son salaire de base et son barème de rémunération.",
      icon: "Users",
    },
    {
      title: "Enregistrer une vente",
      description: "Une formation, un document ou une prestation. La facture suit automatiquement.",
      icon: "ShoppingCart",
    },
    {
      title: "Calcul des commissions",
      description: "Le barème s'applique à l'encaissement. Une vente de 300 000 F à 10 % donne 30 000 F.",
      icon: "Coins",
    },
    {
      title: "Validation",
      description: "Le responsable contrôle le décompte du mois avant qu'il ne devienne une écriture.",
      icon: "BadgeCheck",
    },
    {
      title: "Paiement",
      description: "Le salaire est versé, la sortie de caisse est enregistrée, le reçu est édité.",
      icon: "Receipt",
    },
    {
      title: "Rapports",
      description: "L'opération alimente aussitôt le tableau de bord et les rapports de gestion.",
      icon: "BarChart3",
    },
  ] as const;

  if ((await prisma.landingModule.count()) === 0) {
    await prisma.landingModule.createMany({
      data: modules.map((module, index) => ({ ...module, order: index })),
    });
  }
  if ((await prisma.landingArgument.count()) === 0) {
    await prisma.landingArgument.createMany({
      data: argumentsVitrine.map((argument, index) => ({ ...argument, order: index })),
    });
  }
  if ((await prisma.landingWorkflowStep.count()) === 0) {
    await prisma.landingWorkflowStep.createMany({
      data: etapes.map((etape, index) => ({ ...etape, order: index })),
    });
  }

  console.log(
    `  ${modules.length} modules, ${argumentsVitrine.length} arguments, ${etapes.length} étapes.`,
  );
}

async function main() {
  console.log("\n=== TED'S SERVICE — initialisation des données ===\n");

  await seedPermissions();
  await seedRoles();
  await seedStructure();
  await seedCommissionRules();
  await seedUtilisateurs();
  await seedParametres();
  await seedFaq();
  await seedLandingContent();

  console.log("\n✔ Base initialisée.\n");
  console.log("  Connexion : admin@tedsservice.cg");
  console.log(`  Mot de passe : ${MOT_DE_PASSE_PAR_DEFAUT}\n`);
}

main()
  .catch((error) => {
    console.error("\n✘ Échec de l'initialisation :\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
