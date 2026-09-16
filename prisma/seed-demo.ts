/**
 * Donnees de DEMONSTRATION — douze mois d'activite simulee.
 *
 * Objectif : donner de la matiere aux tableaux de bord et aux rapports. Sans
 * mouvements, un graphique est une boite vide et l'on ne peut ni juger la
 * lisibilite, ni verifier les calculs.
 *
 * ATTENTION — ce script VIDE les tables transactionnelles (ventes, paiements,
 * commissions, depenses, caisse, inscriptions, apprenants, formations,
 * prestations) avant de les regenerer. Il est destine a un environnement de
 * developpement, jamais a une base de production.
 *
 * Le tirage est deterministe : le meme generateur pseudo-aleatoire est amorce
 * avec une graine fixe, donc deux executions produisent les memes chiffres.
 * Une demonstration reproductible vaut mieux qu'une demonstration jolie.
 *
 * Lancement : npm run db:seed:demo
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/infrastructure/database/generated/client";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

/* -------------------------------------------------------------------------- */
/* Generateur pseudo-aleatoire deterministe                                    */
/* -------------------------------------------------------------------------- */

let graine = 20260803;

/** Congruence lineaire : suffisant pour une demonstration, et reproductible. */
function alea(): number {
  graine = (graine * 1103515245 + 12345) % 2147483648;
  return graine / 2147483648;
}

function entre(min: number, max: number): number {
  return Math.floor(alea() * (max - min + 1)) + min;
}

function choisir<T>(liste: readonly T[]): T {
  return liste[Math.floor(alea() * liste.length)];
}

/** Date tiree au hasard dans le mois situe `recul` mois avant aujourd'hui. */
function dateDansLeMois(recul: number): Date {
  const reference = new Date();
  const premier = new Date(reference.getFullYear(), reference.getMonth() - recul, 1);
  const dernierJour = new Date(premier.getFullYear(), premier.getMonth() + 1, 0).getDate();
  // Pour le mois en cours, on ne depasse pas la date du jour.
  const plafond = recul === 0 ? reference.getDate() : dernierJour;

  return new Date(premier.getFullYear(), premier.getMonth(), entre(1, Math.max(1, plafond)), 10);
}

/**
 * Coefficient de saisonnalite d'un centre de formation : rentree chargee,
 * creux en fin d'annee. Sans cela, les courbes seraient plates et l'on ne
 * verrait pas si le graphique sait representer une variation.
 */
function saisonnalite(mois: number): number {
  const COEFFICIENTS = [0.9, 1.0, 1.15, 1.05, 0.95, 0.8, 0.7, 1.1, 1.35, 1.25, 1.1, 0.85];
  return COEFFICIENTS[mois];
}

const MOIS_SIMULES = 12;

/* -------------------------------------------------------------------------- */

async function viderTransactions() {
  console.log("→ Nettoyage des données transactionnelles…");

  // L'ordre respecte les dependances : les enfants avant les parents.
  await prisma.receipt.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.cashTransaction.deleteMany();
  await prisma.documentSaleLine.deleteMany();
  await prisma.documentSale.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.studentRegistration.deleteMany();
  await prisma.student.deleteMany();
  await prisma.training.deleteMany();
  await prisma.trainingCategory.deleteMany();
  await prisma.service.deleteMany();
  await prisma.documentProduct.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
}

async function creerEquipeCommerciale() {
  console.log("→ Renfort de l'effectif…");

  const departements = await prisma.department.findMany({ select: { id: true, code: true } });
  const postes = await prisma.position.findMany({ select: { id: true, code: true } });

  const parCode = (liste: { id: string; code: string }[], code: string) =>
    liste.find((ligne) => ligne.code === code)?.id ?? null;

  const RECRUES = [
    { prenom: "Merveille", nom: "Ngoma", genre: "FEMININ", dep: "COM", poste: "COM", salaire: 240_000, taux: 12 },
    { prenom: "Prince", nom: "Makaya", genre: "MASCULIN", dep: "COM", poste: "COM", salaire: 235_000, taux: 12 },
    { prenom: "Naomie", nom: "Bikindou", genre: "FEMININ", dep: "COM", poste: "COM", salaire: 250_000, taux: 15 },
    { prenom: "Ruth", nom: "Massamba", genre: "FEMININ", dep: "FOR", poste: "FORM", salaire: 310_000, taux: 0 },
    { prenom: "Gloire", nom: "Tchibinda", genre: "MASCULIN", dep: "FOR", poste: "FORM", salaire: 295_000, taux: 0 },
    { prenom: "Christ", nom: "Malonga", genre: "MASCULIN", dep: "TEC", poste: "DEV", salaire: 360_000, taux: 8 },
    { prenom: "Exaucée", nom: "Kimbembé", genre: "FEMININ", dep: "TEC", poste: "DEV", salaire: 345_000, taux: 8 },
    { prenom: "Bénite", nom: "Ondzé", genre: "FEMININ", dep: "ADM", poste: "SEC", salaire: 195_000, taux: 5 },
  ] as const;

  let numero = 100;

  for (const recrue of RECRUES) {
    numero += 1;
    const matricule = `TSS-0${numero}`;
    const email = `${recrue.prenom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${recrue.nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@tedsservice.cg`;

    // Cle sur l'email, pas le matricule : une fiche deja creee lors d'une
    // execution precedente (sous un autre schema de numerotation) doit etre
    // retrouvee et mise a jour, pas dupliquee au prix d'un email en double.
    await prisma.employee.upsert({
      where: { email },
      update: {},
      create: {
        matricule,
        firstName: recrue.prenom,
        lastName: recrue.nom,
        gender: recrue.genre,
        birthDate: new Date(entre(1988, 2000), entre(0, 11), entre(1, 28)),
        nationality: "Congolaise",
        phone: `+242 06 ${entre(100, 999)} ${entre(10, 99)} ${entre(10, 99)}`,
        email,
        hireDate: dateDansLeMois(entre(1, MOIS_SIMULES - 1)),
        departmentId: parCode(departements, recrue.dep),
        positionId: parCode(postes, recrue.poste),
        baseSalary: recrue.salaire,
        commissionRate: recrue.taux,
        status: "ACTIF",
      },
    });
  }

  console.log(`  ${RECRUES.length} recrues ajoutées.`);
}

async function creerCatalogues() {
  console.log("→ Catalogues (formations, documents, prestations)…");

  const categories = [
    { code: "BUR", name: "Bureautique" },
    { code: "DEV", name: "Développement" },
    { code: "RES", name: "Réseaux et systèmes" },
    { code: "GRA", name: "Infographie" },
  ];

  for (const categorie of categories) {
    await prisma.trainingCategory.create({ data: categorie });
  }

  const categoriesCreees = await prisma.trainingCategory.findMany({
    select: { id: true, code: true },
  });
  const formateurs = await prisma.employee.findMany({
    where: { position: { code: "FORM" }, deletedAt: null },
    select: { id: true },
  });

  const FORMATIONS = [
    { code: "F-BUR-01", titre: "Bureautique complète (Word, Excel, PowerPoint)", cat: "BUR", heures: 60, prix: 150_000, niveau: "DEBUTANT" },
    { code: "F-DEV-01", titre: "Développement web — HTML, CSS, JavaScript", cat: "DEV", heures: 120, prix: 300_000, niveau: "INTERMEDIAIRE" },
    { code: "F-DEV-02", titre: "Développement mobile Android", cat: "DEV", heures: 100, prix: 350_000, niveau: "AVANCE" },
    { code: "F-RES-01", titre: "Administration réseaux et maintenance", cat: "RES", heures: 80, prix: 250_000, niveau: "INTERMEDIAIRE" },
    { code: "F-GRA-01", titre: "Infographie — Photoshop et Illustrator", cat: "GRA", heures: 70, prix: 200_000, niveau: "DEBUTANT" },
    { code: "F-DEV-03", titre: "Base de données et SQL", cat: "DEV", heures: 50, prix: 180_000, niveau: "INTERMEDIAIRE" },
  ] as const;

  for (const formation of FORMATIONS) {
    await prisma.training.create({
      data: {
        code: formation.code,
        title: formation.titre,
        description: `Formation certifiante de ${formation.heures} heures.`,
        categoryId: categoriesCreees.find((c) => c.code === formation.cat)?.id,
        level: formation.niveau,
        durationHours: formation.heures,
        price: formation.prix,
        maxStudents: 25,
        status: "EN_COURS",
        startDate: dateDansLeMois(entre(2, 8)),
        trainerId: formateurs.length > 0 ? choisir(formateurs).id : null,
      },
    });
  }

  const DOCUMENTS = [
    { code: "D-ATT", nom: "Attestation de formation", cat: "ATTESTATION", prix: 15_000 },
    { code: "D-CER", nom: "Certificat de fin de formation", cat: "CERTIFICAT", prix: 25_000 },
    { code: "D-DUP", nom: "Duplicata de diplôme", cat: "DUPLICATA", prix: 20_000 },
    { code: "D-CAR", nom: "Carte d'étudiant", cat: "CARTE_ETUDIANT", prix: 5_000 },
    { code: "D-BAD", nom: "Badge d'accès", cat: "BADGE", prix: 3_000 },
    { code: "D-REL", nom: "Relevé de notes", cat: "RELEVE_NOTES", prix: 10_000 },
    { code: "D-SUP", nom: "Support de cours imprimé", cat: "SUPPORT_COURS", prix: 12_000 },
    { code: "D-LIV", nom: "Livre de référence", cat: "LIVRE", prix: 18_000 },
  ] as const;

  for (const document of DOCUMENTS) {
    await prisma.documentProduct.create({
      data: {
        code: document.code,
        name: document.nom,
        category: document.cat,
        price: document.prix,
        stock: entre(20, 200),
        alertStock: 15,
        status: "DISPONIBLE",
        commissionRate: 20,
      },
    });
  }

  const PRESTATIONS = [
    { code: "S-WEB", nom: "Création de site Internet", cat: "CREATION_SITE", prix: 450_000 },
    { code: "S-APP", nom: "Création d'application mobile", cat: "CREATION_APPLICATION", prix: 800_000 },
    { code: "S-LOG", nom: "Création de logo", cat: "CREATION_LOGO", prix: 75_000 },
    { code: "S-MNT", nom: "Maintenance informatique", cat: "MAINTENANCE", prix: 60_000 },
    { code: "S-WIN", nom: "Installation Windows et logiciels", cat: "INSTALLATION_WINDOWS", prix: 25_000 },
    { code: "S-GRA", nom: "Travaux de graphisme", cat: "GRAPHISME", prix: 90_000 },
  ] as const;

  for (const prestation of PRESTATIONS) {
    await prisma.service.create({
      data: {
        code: prestation.code,
        name: prestation.nom,
        category: prestation.cat,
        basePrice: prestation.prix,
        commissionRate: 15,
        isActive: true,
      },
    });
  }

  console.log(
    `  ${FORMATIONS.length} formations, ${DOCUMENTS.length} documents, ${PRESTATIONS.length} prestations.`,
  );
}

const PRENOMS = [
  "Junior", "Grâce", "Bénédicte", "Chancel", "Merveille", "Dieu-Merci", "Sarah",
  "Emmanuel", "Laetitia", "Brice", "Nadège", "Yann", "Prisca", "Landry",
  "Cynthia", "Rodrigue", "Ornella", "Kevin", "Sandra", "Wilfried",
];

const NOMS = [
  "Mabiala", "Nkodia", "Loubaki", "Ondongo", "Bouiti", "Makosso", "Ngoma",
  "Bantsimba", "Moukala", "Ibara", "Samba", "Kaya", "Mavoungou", "Ekondy",
  "Nzaou", "Bikouta", "Dilou", "Tati", "Ngouala", "Miakassissa",
];

async function creerApprenants() {
  console.log("→ Apprenants…");

  const nombre = 48;

  for (let index = 0; index < nombre; index++) {
    const prenom = PRENOMS[index % PRENOMS.length];
    const nom = NOMS[(index * 7) % NOMS.length];

    await prisma.student.create({
      data: {
        matricule: `AP-${String(index + 1).padStart(4, "0")}`,
        firstName: prenom,
        lastName: nom,
        gender: alea() > 0.5 ? "FEMININ" : "MASCULIN",
        birthDate: new Date(entre(1995, 2007), entre(0, 11), entre(1, 28)),
        phone: `+242 05 ${entre(100, 999)} ${entre(10, 99)} ${entre(10, 99)}`,
        email: `${prenom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${nom.toLowerCase()}${index}@exemple.cg`,
        educationLevel: choisir(["BEPC", "Baccalauréat", "Licence", "Sans diplôme"]),
      },
    });
  }

  console.log(`  ${nombre} apprenants.`);
}

/* -------------------------------------------------------------------------- */
/* Mouvements : inscriptions, ventes, prestations, paiements, commissions      */
/* -------------------------------------------------------------------------- */

let compteurReference = 0;

function reference(prefixe: string, date: Date): string {
  compteurReference += 1;
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  return `${prefixe}-${annee}${mois}-${String(compteurReference).padStart(5, "0")}`;
}

/** Solde de caisse courant, tenu au fil des ecritures. */
let soldeCaisse = 0;

async function ecrireCaisse(
  direction: "ENTREE" | "SORTIE",
  montant: number,
  libelle: string,
  date: Date,
  paymentId?: string,
) {
  soldeCaisse += direction === "ENTREE" ? montant : -montant;

  await prisma.cashTransaction.create({
    data: {
      reference: reference("CAI", date),
      direction,
      amount: montant,
      balanceAfter: soldeCaisse,
      label: libelle,
      occurredAt: date,
      paymentId,
    },
  });
}

async function creerMouvements() {
  console.log("→ Douze mois de mouvements…");

  const commerciaux = await prisma.employee.findMany({
    where: { commissionRate: { gt: 0 }, deletedAt: null },
    select: { id: true, commissionRate: true },
  });
  const apprenants = await prisma.student.findMany({ select: { id: true } });
  const formations = await prisma.training.findMany({ select: { id: true, price: true } });
  const documents = await prisma.documentProduct.findMany({
    select: { id: true, price: true, commissionRate: true },
  });
  const prestations = await prisma.service.findMany({
    select: { id: true, basePrice: true, commissionRate: true },
  });

  const MOYENS = ["ESPECES", "MOBILE_MONEY", "VIREMENT", "CHEQUE"] as const;

  // Les inscriptions sont uniques par (apprenant, formation) : on suit les
  // couples deja utilises pour ne pas violer la contrainte.
  const couplesUtilises = new Set<string>();

  let inscriptions = 0;
  let ventes = 0;
  let commandes = 0;

  for (let recul = MOIS_SIMULES - 1; recul >= 0; recul--) {
    const moisCalendaire = new Date(
      new Date().getFullYear(),
      new Date().getMonth() - recul,
      1,
    ).getMonth();
    const coefficient = saisonnalite(moisCalendaire);

    /* --- Inscriptions aux formations ---------------------------------- */
    const nombreInscriptions = Math.round(entre(4, 9) * coefficient);

    for (let i = 0; i < nombreInscriptions; i++) {
      const apprenant = choisir(apprenants);
      const formation = choisir(formations);
      const cle = `${apprenant.id}:${formation.id}`;
      if (couplesUtilises.has(cle)) continue;
      couplesUtilises.add(cle);

      const vendeur = choisir(commerciaux);
      const date = dateDansLeMois(recul);
      const prix = Number(formation.price);
      const remise = alea() > 0.75 ? Math.round(prix * 0.1) : 0;
      const montant = prix - remise;
      // Toutes les inscriptions ne sont pas soldees : c'est la realite d'un
      // centre, et cela rend le suivi des impayes visible.
      const paye = alea() > 0.25 ? montant : Math.round(montant * 0.5);

      const inscription = await prisma.studentRegistration.create({
        data: {
          reference: reference("INS", date),
          studentId: apprenant.id,
          trainingId: formation.id,
          sellerId: vendeur.id,
          status: recul > 3 ? "TERMINE" : "EN_COURS",
          agreedAmount: montant,
          discount: remise,
          paidAmount: paye,
          registeredAt: date,
        },
      });
      inscriptions += 1;

      const paiement = await prisma.payment.create({
        data: {
          reference: reference("PAY", date),
          amount: paye,
          method: choisir(MOYENS),
          status: "CONFIRME",
          paidAt: date,
          registrationId: inscription.id,
        },
      });

      await ecrireCaisse("ENTREE", paye, "Inscription formation", date, paiement.id);

      const taux = Number(vendeur.commissionRate);
      await prisma.commission.create({
        data: {
          employeeId: vendeur.id,
          sourceType: "INSCRIPTION_FORMATION",
          sourceId: inscription.id,
          baseAmount: montant,
          rate: taux,
          amount: Math.round((montant * taux) / 100),
          status: recul > 1 ? "INTEGREE_PAIE" : "EN_ATTENTE",
          createdAt: date,
        },
      });
    }

    /* --- Ventes de documents ------------------------------------------ */
    const nombreVentes = Math.round(entre(6, 14) * coefficient);

    for (let i = 0; i < nombreVentes; i++) {
      const vendeur = choisir(commerciaux);
      const date = dateDansLeMois(recul);
      const nombreLignes = entre(1, 3);

      const lignes = Array.from({ length: nombreLignes }, () => {
        const produit = choisir(documents);
        const quantite = entre(1, 3);
        const prixUnitaire = Number(produit.price);
        return {
          productId: produit.id,
          quantity: quantite,
          unitPrice: prixUnitaire,
          lineTotal: prixUnitaire * quantite,
          commissionRate: Number(produit.commissionRate ?? 20),
        };
      });

      const sousTotal = lignes.reduce((somme, ligne) => somme + ligne.lineTotal, 0);

      const vente = await prisma.documentSale.create({
        data: {
          reference: reference("VTE", date),
          sellerId: vendeur.id,
          studentId: alea() > 0.4 ? choisir(apprenants).id : null,
          customerName: alea() > 0.4 ? null : `${choisir(PRENOMS)} ${choisir(NOMS)}`,
          subtotal: sousTotal,
          discount: 0,
          taxAmount: 0,
          totalAmount: sousTotal,
          paidAmount: sousTotal,
          status: "PAYEE",
          soldAt: date,
          lines: {
            create: lignes.map((ligne) => ({
              productId: ligne.productId,
              quantity: ligne.quantity,
              unitPrice: ligne.unitPrice,
              lineTotal: ligne.lineTotal,
            })),
          },
        },
      });
      ventes += 1;

      const paiement = await prisma.payment.create({
        data: {
          reference: reference("PAY", date),
          amount: sousTotal,
          method: choisir(MOYENS),
          status: "CONFIRME",
          paidAt: date,
          documentSaleId: vente.id,
        },
      });

      await ecrireCaisse("ENTREE", sousTotal, "Vente de documents", date, paiement.id);

      // Module 6 : 20 % sur une vente de documents.
      const taux = lignes[0].commissionRate;
      await prisma.commission.create({
        data: {
          employeeId: vendeur.id,
          sourceType: "VENTE_DOCUMENT",
          sourceId: vente.id,
          baseAmount: sousTotal,
          rate: taux,
          amount: Math.round((sousTotal * taux) / 100),
          status: recul > 1 ? "INTEGREE_PAIE" : "EN_ATTENTE",
          createdAt: date,
        },
      });
    }

    /* --- Prestations de services -------------------------------------- */
    const nombreCommandes = Math.round(entre(1, 4) * coefficient);

    for (let i = 0; i < nombreCommandes; i++) {
      const prestation = choisir(prestations);
      const vendeur = choisir(commerciaux);
      const date = dateDansLeMois(recul);
      const montant = Math.round(Number(prestation.basePrice) * (0.85 + alea() * 0.4));
      const livree = recul > 1 || alea() > 0.4;
      const paye = livree ? montant : Math.round(montant * 0.4);

      const commande = await prisma.serviceOrder.create({
        data: {
          reference: reference("PRE", date),
          serviceId: prestation.id,
          sellerId: vendeur.id,
          customerName: `${choisir(PRENOMS)} ${choisir(NOMS)}`,
          customerPhone: `+242 06 ${entre(100, 999)} ${entre(10, 99)} ${entre(10, 99)}`,
          amount: montant,
          paidAmount: paye,
          status: livree ? "LIVREE" : "EN_COURS",
          orderedAt: date,
          deliveredAt: livree ? date : null,
        },
      });
      commandes += 1;

      const paiement = await prisma.payment.create({
        data: {
          reference: reference("PAY", date),
          amount: paye,
          method: choisir(MOYENS),
          status: "CONFIRME",
          paidAt: date,
          serviceOrderId: commande.id,
        },
      });

      await ecrireCaisse("ENTREE", paye, "Prestation de service", date, paiement.id);

      const taux = Number(prestation.commissionRate ?? 15);
      await prisma.commission.create({
        data: {
          employeeId: vendeur.id,
          sourceType: "PRESTATION",
          sourceId: commande.id,
          baseAmount: montant,
          rate: taux,
          amount: Math.round((montant * taux) / 100),
          status: recul > 1 ? "INTEGREE_PAIE" : "EN_ATTENTE",
          createdAt: date,
        },
      });
    }

    /* --- Depenses ------------------------------------------------------ */
    const DEPENSES = [
      { categorie: "LOYER", libelle: "Loyer des locaux", montant: 350_000, fixe: true },
      { categorie: "ELECTRICITE", libelle: "Électricité", montant: entre(45_000, 90_000), fixe: true },
      { categorie: "EAU", libelle: "Eau", montant: entre(15_000, 30_000), fixe: true },
      { categorie: "INTERNET", libelle: "Abonnement Internet", montant: 120_000, fixe: true },
      { categorie: "FOURNITURE", libelle: "Fournitures de bureau", montant: entre(30_000, 110_000), fixe: false },
      { categorie: "TRANSPORT", libelle: "Transport et déplacements", montant: entre(25_000, 80_000), fixe: false },
      { categorie: "MARKETING", libelle: "Communication et publicité", montant: entre(50_000, 180_000), fixe: false },
      { categorie: "MAINTENANCE", libelle: "Maintenance du matériel", montant: entre(20_000, 95_000), fixe: false },
    ] as const;

    for (const depense of DEPENSES) {
      if (!depense.fixe && alea() > 0.75) continue;

      const date = dateDansLeMois(recul);
      await prisma.expense.create({
        data: {
          reference: reference("DEP", date),
          category: depense.categorie,
          label: depense.libelle,
          amount: depense.montant,
          occurredAt: date,
        },
      });

      await ecrireCaisse("SORTIE", depense.montant, depense.libelle, date);
    }
  }

  console.log(
    `  ${inscriptions} inscriptions, ${ventes} ventes de documents, ${commandes} prestations.`,
  );
  console.log(`  Solde de caisse final : ${soldeCaisse.toLocaleString("fr-FR")} FCFA`);
}

async function creerStock() {
  console.log("→ Stock…");

  const ARTICLES = [
    { code: "ST-RAM", nom: "Ramette de papier A4", cat: "CONSOMMABLE", unite: "ramette", cout: 4_500 },
    { code: "ST-TON", nom: "Toner imprimante", cat: "CONSOMMABLE", unite: "unité", cout: 45_000 },
    { code: "ST-BAD", nom: "Badges vierges", cat: "BADGE", unite: "unité", cout: 800 },
    { code: "ST-CAR", nom: "Cartes plastifiées", cat: "CARTE", unite: "unité", cout: 1_200 },
    { code: "ST-LIV", nom: "Livres de formation", cat: "LIVRE", unite: "unité", cout: 9_000 },
    { code: "ST-SUP", nom: "Supports de cours reliés", cat: "SUPPORT", unite: "unité", cout: 3_500 },
  ] as const;

  for (const article of ARTICLES) {
    const quantite = entre(30, 250);
    const item = await prisma.inventoryItem.create({
      data: {
        code: article.code,
        name: article.nom,
        category: article.cat,
        unit: article.unite,
        quantity: quantite,
        alertQuantity: 25,
        unitCost: article.cout,
      },
    });

    let courant = 0;
    for (let recul = 5; recul >= 0; recul--) {
      const date = dateDansLeMois(recul);
      const entree = entre(20, 60);
      courant += entree;
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          type: "ENTREE",
          quantity: entree,
          quantityAfter: courant,
          label: "Réapprovisionnement",
          occurredAt: date,
        },
      });

      const sortie = entre(5, 30);
      courant = Math.max(0, courant - sortie);
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          type: "SORTIE",
          quantity: sortie,
          quantityAfter: courant,
          label: "Consommation",
          occurredAt: date,
        },
      });
    }

    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: courant },
    });
  }

  console.log(`  ${ARTICLES.length} articles avec leurs mouvements.`);
}

async function main() {
  console.log("\n=== TED'S SERVICE — données de démonstration ===\n");

  await viderTransactions();
  await creerEquipeCommerciale();
  await creerCatalogues();
  await creerApprenants();
  await creerMouvements();
  await creerStock();

  console.log("\n✔ Démonstration prête. Ouvrez /tableau-de-bord et /rapports.\n");
}

main()
  .catch((error) => {
    console.error("\n✘ Échec :\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
