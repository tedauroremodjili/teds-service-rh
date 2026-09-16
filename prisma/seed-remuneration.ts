/**
 * Exemple de barème de rémunération — le cas Tomo.
 *
 * Ce script installe, tel quel, le fonctionnement décrit par la direction :
 *
 *   « Tomo a 85 % pour le paiement de chaque enfant, elle prend 1 000 F de
 *     chaque vente de document des enfants, 5 % de chaque paiement à
 *     l'informatique, et pour les inscriptions des enfants anglais 500 F
 *     (l'inscription est à 2 000 F). »
 *
 * Il fait trois choses :
 *   1. il renseigne l'OBJET des encaissements déjà en base (le champ `purpose`
 *      n'existait pas avant) — sans quoi le moteur ne saurait pas distinguer
 *      des frais d'inscription d'une mensualité ;
 *   2. il crée la formation « Anglais enfants », l'employée et son barème ;
 *   3. il génère quelques enfants inscrits, leurs paiements, une vente de
 *      documents et une prestation informatique, puis IMPRIME le décompte
 *      obtenu à côté du calcul attendu, fait à la main.
 *
 * À lancer après `npm run db:seed:demo`.
 * Lancement : npm run db:seed:remuneration
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/infrastructure/database/generated/client";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const FRAIS_INSCRIPTION = 2_000;
const MENSUALITE_ANGLAIS = 15_000;

function fcfa(montant: number): string {
  return `${Math.round(montant).toLocaleString("fr-FR").replace(/ /g, " ")} FCFA`;
}

/* -------------------------------------------------------------------------- */

async function renseignerObjetDesPaiements() {
  console.log("→ Objet des encaissements déjà enregistrés…");

  const [formations, documents, prestations] = await Promise.all([
    prisma.payment.updateMany({
      where: { purpose: "AUTRE", registrationId: { not: null } },
      data: { purpose: "FRAIS_FORMATION" },
    }),
    prisma.payment.updateMany({
      where: { purpose: "AUTRE", documentSaleId: { not: null } },
      data: { purpose: "VENTE_DOCUMENT" },
    }),
    prisma.payment.updateMany({
      where: { purpose: "AUTRE", serviceOrderId: { not: null } },
      data: { purpose: "PRESTATION" },
    }),
    prisma.payment.updateMany({
      where: { purpose: "AUTRE", payrollId: { not: null } },
      data: { purpose: "SALAIRE" },
    }),
  ]);

  console.log(
    `  ${formations.count} formations, ${documents.count} documents, ${prestations.count} prestations.`,
  );
}

async function creerContexte() {
  console.log("→ Formation « Anglais enfants » et employée…");

  const categorie = await prisma.trainingCategory.upsert({
    where: { code: "ENF" },
    update: {},
    create: { code: "ENF", name: "Cours pour enfants" },
  });

  const formation = await prisma.training.upsert({
    where: { code: "F-ENF-ANG" },
    update: { categoryId: categorie.id, price: MENSUALITE_ANGLAIS },
    create: {
      code: "F-ENF-ANG",
      title: "Anglais enfants",
      description: "Cours d'anglais pour les 6-12 ans.",
      categoryId: categorie.id,
      level: "DEBUTANT",
      durationHours: 40,
      price: MENSUALITE_ANGLAIS,
      maxStudents: 20,
      status: "EN_COURS",
    },
  });

  const departement = await prisma.department.findUnique({ where: { code: "FOR" } });
  const poste = await prisma.position.findUnique({ where: { code: "FORM" } });

  // Cle sur l'email : un matricule fige dans le script peut avoir ete pris
  // par une fiche creee lors d'une execution precedente, sous un schema de
  // numerotation different — chercher par matricule la manquerait et
  // tenterait d'en recreer une avec le meme email, ce que la base refuse.
  const tomo = await prisma.employee.upsert({
    where: { email: "tomo.nkouka@tedsservice.cg" },
    update: {},
    create: {
      matricule: "TSS-0200",
      firstName: "Tomo",
      lastName: "Nkouka",
      gender: "FEMININ",
      birthDate: new Date("1994-03-12"),
      nationality: "Congolaise",
      phone: "+242 06 555 12 34",
      email: "tomo.nkouka@tedsservice.cg",
      hireDate: new Date("2025-09-01"),
      departmentId: departement?.id ?? null,
      positionId: poste?.id ?? null,
      // Rémunérée uniquement à l'activité : son socle fixe est nul.
      baseSalary: 0,
      commissionRate: 0,
      status: "ACTIF",
    },
  });

  // La formation lui est confiée : c'est elle qui encadre les enfants.
  await prisma.training.update({
    where: { id: formation.id },
    data: { trainerId: tomo.id },
  });

  const documentEnfant = await prisma.documentProduct.upsert({
    where: { code: "D-ENF-CAR" },
    update: {},
    create: {
      code: "D-ENF-CAR",
      name: "Carte d'apprenant enfant",
      category: "CARTE_ETUDIANT",
      price: 5_000,
      stock: 200,
      alertStock: 20,
      status: "DISPONIBLE",
    },
  });

  const prestationInfo = await prisma.service.findFirst({
    where: { category: { in: ["MAINTENANCE", "INSTALLATION_WINDOWS"] } },
    select: { id: true, name: true, basePrice: true },
  });

  return { categorie, formation, tomo, documentEnfant, prestationInfo };
}

async function creerBareme(ids: {
  tomoId: string;
  categorieEnfantsId: string;
  formationAnglaisId: string;
  documentEnfantId: string;
  prestationInfoId: string | null;
}) {
  console.log("→ Barème de Tomo…");

  // On repart d'un barème vide : le script doit pouvoir être relancé.
  await prisma.remunerationRule.deleteMany({ where: { employeeId: ids.tomoId } });

  const regles = [
    {
      label: "85 % sur les paiements de formation des enfants",
      activity: "FRAIS_FORMATION" as const,
      mode: "POURCENTAGE" as const,
      // Elle encadre les enfants : elle ne « vend » pas ces inscriptions.
      portee: "TOUTE_ACTIVITE" as const,
      rate: 85,
      trainingCategoryId: ids.categorieEnfantsId,
    },
    {
      label: "500 F sur l'inscription en anglais enfants",
      activity: "FRAIS_INSCRIPTION" as const,
      mode: "MONTANT_FIXE" as const,
      portee: "TOUTE_ACTIVITE" as const,
      fixedAmount: 500,
      fixedBasis: "PAR_OPERATION" as const,
      trainingId: ids.formationAnglaisId,
    },
    {
      label: "1 000 F par vente de document aux enfants",
      activity: "VENTE_DOCUMENT" as const,
      mode: "MONTANT_FIXE" as const,
      portee: "TOUTE_ACTIVITE" as const,
      fixedAmount: 1_000,
      fixedBasis: "PAR_OPERATION" as const,
      documentProductId: ids.documentEnfantId,
    },
  ];

  for (const regle of regles) {
    await prisma.remunerationRule.create({ data: { employeeId: ids.tomoId, ...regle } });
  }

  if (ids.prestationInfoId) {
    await prisma.remunerationRule.create({
      data: {
        employeeId: ids.tomoId,
        label: "5 % sur les paiements de prestation informatique",
        activity: "PRESTATION",
        mode: "POURCENTAGE",
        portee: "TOUTE_ACTIVITE",
        rate: 5,
        serviceId: ids.prestationInfoId,
      },
    });
  }

  console.log(`  ${regles.length + (ids.prestationInfoId ? 1 : 0)} règles enregistrées.`);
}

interface Attendu {
  libelle: string;
  montant: number;
}

async function creerOperationsDuMois(contexte: {
  formationId: string;
  tomoId: string;
  documentEnfantId: string;
  prestationInfo: { id: string; name: string; basePrice: unknown } | null;
}): Promise<Attendu[]> {
  console.log("→ Opérations du mois en cours…");

  const maintenant = new Date();
  const jour = (n: number) =>
    new Date(maintenant.getFullYear(), maintenant.getMonth(), Math.min(n, maintenant.getDate()));

  const attendus: Attendu[] = [];
  let compteur = 0;
  const reference = (prefixe: string) => {
    compteur += 1;
    return `${prefixe}-TOMO-${maintenant.getFullYear()}${String(maintenant.getMonth() + 1).padStart(2, "0")}-${compteur}`;
  };

  // --- Trois enfants inscrits en anglais ---
  const ENFANTS = [
    { prenom: "Kesia", nom: "Milandou", mensualite: MENSUALITE_ANGLAIS },
    { prenom: "Elie", nom: "Bantsimba", mensualite: MENSUALITE_ANGLAIS },
    { prenom: "Naelle", nom: "Ossebi", mensualite: 10_000 }, // versement partiel
  ];

  for (const [index, enfant] of ENFANTS.entries()) {
    const matricule = `AP-ENF-${index + 1}`;

    const apprenant = await prisma.student.upsert({
      where: { matricule },
      update: {},
      create: {
        matricule,
        firstName: enfant.prenom,
        lastName: enfant.nom,
        gender: index % 2 === 0 ? "FEMININ" : "MASCULIN",
        birthDate: new Date(2015, index, 10),
        phone: `+242 05 700 00 0${index + 1}`,
      },
    });

    const inscription = await prisma.studentRegistration.upsert({
      where: {
        studentId_trainingId: {
          studentId: apprenant.id,
          trainingId: contexte.formationId,
        },
      },
      update: { registrationFee: FRAIS_INSCRIPTION },
      create: {
        reference: reference("INS"),
        studentId: apprenant.id,
        trainingId: contexte.formationId,
        registrationFee: FRAIS_INSCRIPTION,
        agreedAmount: MENSUALITE_ANGLAIS,
        paidAmount: enfant.mensualite,
        status: "EN_COURS",
        registeredAt: jour(2),
      },
    });

    // On repart de zéro sur les encaissements de cette inscription.
    await prisma.payment.deleteMany({ where: { registrationId: inscription.id } });

    // 1. Frais d'inscription : 2 000 F, dont 500 F pour Tomo.
    await prisma.payment.create({
      data: {
        reference: reference("PAY"),
        amount: FRAIS_INSCRIPTION,
        method: "ESPECES",
        status: "CONFIRME",
        purpose: "FRAIS_INSCRIPTION",
        paidAt: jour(2),
        registrationId: inscription.id,
      },
    });
    attendus.push({ libelle: `Inscription ${enfant.prenom}`, montant: 500 });

    // 2. Mensualité de formation : 85 % pour Tomo.
    await prisma.payment.create({
      data: {
        reference: reference("PAY"),
        amount: enfant.mensualite,
        method: "ESPECES",
        status: "CONFIRME",
        purpose: "FRAIS_FORMATION",
        paidAt: jour(6),
        registrationId: inscription.id,
      },
    });
    attendus.push({
      libelle: `Formation ${enfant.prenom} (85 % de ${fcfa(enfant.mensualite)})`,
      montant: Math.round((enfant.mensualite * 85) / 100),
    });
  }

  // --- Deux ventes de cartes d'apprenant enfant ---
  const vendeur = await prisma.employee.findFirst({
    where: { position: { code: "COM" }, deletedAt: null },
    select: { id: true },
  });

  if (vendeur) {
    // Ces ventes n'ont pas d'identifiant metier stable comme les inscriptions
    // (pas d'upsert possible) : on repart de zero pour que le script reste
    // relancable, plutot que de heurter la reference deterministe d'une
    // execution precedente.
    await prisma.payment.deleteMany({ where: { documentSale: { customerName: "Parent d'élève" } } });
    await prisma.documentSaleLine.deleteMany({
      where: { sale: { customerName: "Parent d'élève" } },
    });
    await prisma.documentSale.deleteMany({ where: { customerName: "Parent d'élève" } });

    for (let vente = 0; vente < 2; vente++) {
      const quantite = vente + 1;
      const total = 5_000 * quantite;

      const documentSale = await prisma.documentSale.create({
        data: {
          reference: reference("VTE"),
          sellerId: vendeur.id,
          customerName: "Parent d'élève",
          subtotal: total,
          totalAmount: total,
          paidAmount: total,
          status: "PAYEE",
          soldAt: jour(9),
          lines: {
            create: [
              {
                productId: contexte.documentEnfantId,
                quantity: quantite,
                unitPrice: 5_000,
                lineTotal: total,
              },
            ],
          },
        },
      });

      await prisma.payment.create({
        data: {
          reference: reference("PAY"),
          amount: total,
          method: "ESPECES",
          status: "CONFIRME",
          purpose: "VENTE_DOCUMENT",
          paidAt: jour(9),
          documentSaleId: documentSale.id,
        },
      });

      // Forfait par opération : 1 000 F, quel que soit le nombre de cartes.
      attendus.push({ libelle: `Vente de ${quantite} carte(s)`, montant: 1_000 });
    }
  }

  // --- Une prestation informatique ---
  if (contexte.prestationInfo && vendeur) {
    const montant = 80_000;

    // Meme raison qu'au-dessus : pas d'identifiant metier stable, on
    // nettoie ce que le script a pu creer lors d'une execution precedente.
    await prisma.payment.deleteMany({ where: { serviceOrder: { customerName: "Cabinet Moukala" } } });
    await prisma.serviceOrder.deleteMany({ where: { customerName: "Cabinet Moukala" } });

    const commande = await prisma.serviceOrder.create({
      data: {
        reference: reference("PRE"),
        serviceId: contexte.prestationInfo.id,
        sellerId: vendeur.id,
        customerName: "Cabinet Moukala",
        amount: montant,
        paidAmount: montant,
        status: "LIVREE",
        orderedAt: jour(12),
        deliveredAt: jour(12),
      },
    });

    await prisma.payment.create({
      data: {
        reference: reference("PAY"),
        amount: montant,
        method: "VIREMENT",
        status: "CONFIRME",
        purpose: "PRESTATION",
        paidAt: jour(12),
        serviceOrderId: commande.id,
      },
    });

    attendus.push({
      libelle: `Prestation ${contexte.prestationInfo.name} (5 % de ${fcfa(montant)})`,
      montant: Math.round((montant * 5) / 100),
    });
  }

  console.log(`  ${attendus.length} opérations rémunérables créées.`);
  return attendus;
}

/* -------------------------------------------------------------------------- */

async function main() {
  console.log("\n=== TED'S SERVICE — barème de rémunération (exemple Tomo) ===\n");

  await renseignerObjetDesPaiements();

  const contexte = await creerContexte();

  await creerBareme({
    tomoId: contexte.tomo.id,
    categorieEnfantsId: contexte.categorie.id,
    formationAnglaisId: contexte.formation.id,
    documentEnfantId: contexte.documentEnfant.id,
    prestationInfoId: contexte.prestationInfo?.id ?? null,
  });

  const attendus = await creerOperationsDuMois({
    formationId: contexte.formation.id,
    tomoId: contexte.tomo.id,
    documentEnfantId: contexte.documentEnfant.id,
    prestationInfo: contexte.prestationInfo,
  });

  // --- Vérification : le calcul de l'application face au calcul à la main ---
  const { getDecompteEmploye } = await import(
    "../src/modules/remuneration/application/remuneration-use-cases"
  );

  const maintenant = new Date();
  const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const fin = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);

  const resultat = await getDecompteEmploye(contexte.tomo.id, debut, fin);
  if (!resultat.ok) {
    throw new Error(resultat.error.message);
  }

  const decompte = resultat.value;
  const totalAttendu = attendus.reduce((somme, ligne) => somme + ligne.montant, 0);

  console.log("\n--- Calcul attendu, fait à la main ---");
  for (const ligne of attendus) {
    console.log(`  ${ligne.libelle.padEnd(48)} ${fcfa(ligne.montant).padStart(14)}`);
  }
  console.log(`  ${"TOTAL".padEnd(48)} ${fcfa(totalAttendu).padStart(14)}`);

  console.log("\n--- Calcul de l'application ---");
  for (const ligne of decompte.lignes) {
    console.log(
      `  ${ligne.libelle.slice(0, 40).padEnd(42)} ${ligne.detail.padEnd(28)} ${fcfa(ligne.montant).padStart(14)}`,
    );
  }
  console.log(`  ${"TOTAL".padEnd(72)} ${fcfa(decompte.total).padStart(14)}`);

  console.log("\n--- Salaire du mois ---");
  console.log(`  Salaire de base           ${fcfa(decompte.employe.salaireDeBase).padStart(16)}`);
  console.log(`  Rémunération d'activité   ${fcfa(decompte.total).padStart(16)}`);
  console.log(`  Salaire total à verser    ${fcfa(decompte.salaireTotal).padStart(16)}`);

  const conforme = decompte.total === totalAttendu;
  console.log(
    `\n${conforme ? "✔" : "✘"} Le calcul de l'application ${conforme ? "correspond" : "NE correspond PAS"} au calcul attendu.`,
  );

  if (!conforme) {
    console.log(`  attendu ${fcfa(totalAttendu)}, obtenu ${fcfa(decompte.total)}`);
    process.exitCode = 1;
  }

  console.log(`\nÀ consulter : /employes/${contexte.tomo.id}/remuneration\n`);
}

main()
  .catch((error) => {
    console.error("\n✘ Échec :\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
