/**
 * Verification manuelle du moteur CRUD generique, contre la vraie base.
 * Lancement :
 *   node --env-file=.env --import tsx --conditions=react-server scripts/resources-smoke.ts
 *
 * Le script cree, relit, modifie puis supprime un enregistrement de plusieurs
 * ressources representatives, et repose l'etat initial : il peut etre relance.
 */
import { prisma } from "@/infrastructure/database/prisma";
import { ROUTE_PERMISSIONS } from "@/modules/auth/domain/route-permissions";
import {
  buildFormContext,
  createResource,
  getResource,
  listResource,
  removeResource,
  updateResource,
} from "@/modules/resources/application/resource-use-cases";
import { findResource, RESOURCES } from "@/modules/resources/domain/catalog";
import { formFields, listFields } from "@/modules/resources/domain/resource";
import { prismaResourceRepository as repo } from "@/modules/resources/infrastructure/prisma-resource-repository";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const pagination = { page: 1, pageSize: 5 };

/** 1. Chaque ressource doit etre listable et coherente avec sa definition. */
async function verifierCatalogue() {
  console.log(`\n— Catalogue : ${RESOURCES.length} ressources —`);

  for (const definition of RESOURCES) {
    const page = await listResource(repo, definition, {}, pagination);
    const colonnes = listFields(definition).length;
    const champs = formFields(definition).length;

    if (colonnes === 0) console.log(`KO   ${definition.key} : aucune colonne de liste.`);
    if (champs === 0) console.log(`KO   ${definition.key} : aucun champ de formulaire.`);

    console.log(
      `OK   ${definition.key.padEnd(22)} ${String(page.total).padStart(4)} ligne(s), ` +
        `${colonnes} colonne(s), ${champs} champ(s), lecture=${definition.permissions.read}`,
    );
  }
}

/** 2. Le filtre optimiste du proxy doit connaitre chaque ressource. */
function verifierRoutes() {
  console.log("\n— Routes protégées —");
  const prefixes = new Set(ROUTE_PERMISSIONS.map((regle) => regle.prefix));

  const manquantes = RESOURCES.filter((resource) => !prefixes.has(`/${resource.key}`));
  if (manquantes.length > 0) {
    console.log(`KO   absentes de ROUTE_PERMISSIONS : ${manquantes.map((r) => r.key).join(", ")}`);
    return;
  }

  const incoherentes = RESOURCES.filter((resource) => {
    const regle = ROUTE_PERMISSIONS.find((candidate) => candidate.prefix === `/${resource.key}`);
    return regle?.permission !== resource.permissions.read;
  });

  console.log(
    incoherentes.length === 0
      ? "OK   toutes les ressources sont filtrées avec leur permission de lecture."
      : `KO   permission divergente : ${incoherentes.map((r) => r.key).join(", ")}`,
  );
}

/** 3. Cycle complet sur une ressource simple. */
async function cycleDepartement() {
  console.log("\n— Cycle création / lecture / modification / archivage —");
  const definition = findResource("departements")!;

  const contexte = await buildFormContext(repo, definition, "creation");
  console.log(`     valeurs proposées : ${JSON.stringify(contexte.defaults)}`);

  const creation = await createResource(repo, definition, {
    code: `TEST-${Date.now().toString().slice(-6)}`,
    name: "Département de vérification",
    description: "Créé par resources-smoke.ts",
  });

  if (!creation.ok) {
    console.log(`KO   création : ${creation.error.message}`);
    return;
  }
  console.log(`OK   créé (${creation.value})`);

  const lecture = await getResource(repo, definition, creation.value);
  console.log(
    lecture.ok
      ? `OK   relu : ${lecture.value.name}`
      : `KO   relecture : ${lecture.error.message}`,
  );

  const modification = await updateResource(repo, definition, creation.value, {
    code: `TEST-${Date.now().toString().slice(-6)}`,
    name: "Département renommé",
    description: "Modifié par resources-smoke.ts",
  });
  console.log(modification.ok ? "OK   modifié." : `KO   ${modification.error.message}`);

  const suppression = await removeResource(repo, definition, creation.value);
  console.log(suppression.ok ? "OK   archivé (deletedAt)." : `KO   ${suppression.error.message}`);
}

/** 4. Les refus attendus : champ obligatoire, suppression interdite. */
async function verifierRefus() {
  console.log("\n— Garde-fous —");

  const departements = findResource("departements")!;
  const sansNom = await createResource(repo, departements, { code: "X" });
  console.log(
    sansNom.ok
      ? "KO   un département sans nom a été accepté."
      : `OK   champ obligatoire refusé (${sansNom.error.field ?? "?"} : ${sansNom.error.message})`,
  );

  const ecritures = findResource("comptabilite")!;
  const suppression = await removeResource(repo, ecritures, "peu-importe");
  console.log(
    suppression.ok
      ? "KO   une écriture comptable a pu être supprimée."
      : `OK   suppression refusée (${suppression.error.code}).`,
  );

  const caisse = findResource("caisse")!;
  const sortieImpossible = await createResource(repo, caisse, {
    reference: `TEST-${Date.now()}`,
    direction: "SORTIE",
    amount: "999999999",
    label: "Sortie supérieure au solde",
    occurredAt: new Date().toISOString().slice(0, 16),
  });
  console.log(
    sortieImpossible.ok
      ? "KO   une sortie de caisse supérieure au solde a été acceptée."
      : `OK   solde de caisse protégé (${sortieImpossible.error.code}).`,
  );
}

/** 5. Ressource complete : référence auto-générée, relation, cohérence des dates. */
async function cycleContrat() {
  console.log("\n— Contrat : référence, relation, cohérence —");
  const definition = findResource("contrats")!;

  const contexte = await buildFormContext(repo, definition, "creation");
  const employes = contexte.options.employeeId ?? [];

  if (employes.length === 0) {
    console.log("KO   aucun employé en base : impossible de tester la relation.");
    return;
  }

  console.log(
    `OK   liste déroulante « Employé » : ${employes.length} option(s), ex. « ${employes[0].label} »`,
  );
  console.log(`OK   référence proposée : ${contexte.defaults.reference}`);

  const incoherent = await createResource(repo, definition, {
    reference: contexte.defaults.reference,
    employeeId: employes[0].value,
    type: "CDD",
    status: "BROUILLON",
    startDate: "2026-06-01",
    endDate: "2026-01-01",
    baseSalary: "250000",
    workingHoursPerWeek: "40",
  });
  console.log(
    incoherent.ok
      ? "KO   une fin de contrat antérieure au début a été acceptée."
      : `OK   dates incohérentes refusées (${incoherent.error.message})`,
  );

  const creation = await createResource(repo, definition, {
    reference: contexte.defaults.reference,
    employeeId: employes[0].value,
    type: "CDD",
    status: "BROUILLON",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    baseSalary: "250000",
    workingHoursPerWeek: "40",
  });

  if (!creation.ok) {
    console.log(`KO   création : ${creation.error.message}`);
    return;
  }

  const lecture = await getResource(repo, definition, creation.value);
  if (lecture.ok) {
    console.log(
      `OK   créé et relu : ${lecture.value.reference} — ${lecture.value.employeeId__label} — ` +
        `${lecture.value.baseSalary} FCFA (${typeof lecture.value.baseSalary})`,
    );
  }

  // Un contrat ne se supprime pas : on le retire de la base directement, le
  // script ne devant laisser aucune trace.
  const refus = await removeResource(repo, definition, creation.value);
  console.log(
    refus.ok ? "KO   suppression acceptée." : `OK   suppression refusée (${refus.error.code}).`,
  );
  await prisma.contract.delete({ where: { id: creation.value } });
  console.log("     contrat de test retiré de la base.");
}

/** 6. Les deux calculs qui dependent de l'etat precedent. */
async function verifierCalculs() {
  console.log("\n— Solde de caisse et quantité de stock —");

  // --- Caisse : le solde suit le mouvement ---
  const caisse = findResource("caisse")!;
  const soldeAvant = await prisma.cashTransaction.findFirst({
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    select: { balanceAfter: true },
  });
  const depart = soldeAvant ? Number(soldeAvant.balanceAfter) : 0;

  const entree = await createResource(repo, caisse, {
    reference: `TEST-CAI-${Date.now().toString().slice(-6)}`,
    direction: "ENTREE",
    amount: "50000",
    label: "Entrée de vérification",
    occurredAt: new Date().toISOString().slice(0, 16),
  });

  if (entree.ok) {
    const lu = await getResource(repo, caisse, entree.value);
    const attendu = depart + 50000;
    console.log(
      lu.ok && lu.value.balanceAfter === attendu
        ? `OK   solde ${depart} + 50000 = ${lu.value.balanceAfter}`
        : `KO   solde attendu ${attendu}, obtenu ${lu.ok ? lu.value.balanceAfter : "?"}`,
    );
    await prisma.cashTransaction.delete({ where: { id: entree.value } });
  } else {
    console.log(`KO   création : ${entree.error.message}`);
  }

  // --- Stock : le mouvement met a jour l'article ---
  const stock = findResource("stock")!;
  let temporaire: string | null = null;

  let article = await prisma.inventoryItem.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true, quantity: true },
  });

  if (!article) {
    // Aucun article en base : on en crée un le temps du test.
    const creation = await createResource(repo, stock, {
      code: `TEST-${Date.now().toString().slice(-6)}`,
      name: "Article de vérification",
      category: "CONSOMMABLE",
      unit: "unite",
      quantity: "10",
      alertQuantity: "0",
      unitCost: "500",
    });

    if (!creation.ok) {
      console.log(`KO   création de l'article : ${creation.error.message}`);
      return;
    }

    temporaire = creation.value;
    article = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: creation.value },
      select: { id: true, name: true, quantity: true },
    });
    console.log(`     article de test créé (${article.name}, ${article.quantity}).`);
  }

  const mouvements = findResource("mouvements-stock")!;
  const mouvement = await createResource(repo, mouvements, {
    itemId: article.id,
    type: "ENTREE",
    quantity: "7",
    label: "Entrée de vérification",
    occurredAt: new Date().toISOString().slice(0, 16),
  });

  if (!mouvement.ok) {
    console.log(`KO   mouvement : ${mouvement.error.message}`);
    return;
  }

  const apres = await prisma.inventoryItem.findUniqueOrThrow({
    where: { id: article.id },
    select: { quantity: true },
  });

  console.log(
    apres.quantity === article.quantity + 7
      ? `OK   ${article.name} : ${article.quantity} → ${apres.quantity} (article mis à jour)`
      : `KO   quantité attendue ${article.quantity + 7}, obtenue ${apres.quantity}`,
  );

  // Remise a l'etat initial.
  await prisma.stockMovement.delete({ where: { id: mouvement.value } });
  if (temporaire) {
    await prisma.inventoryItem.delete({ where: { id: temporaire } });
  } else {
    await prisma.inventoryItem.update({
      where: { id: article.id },
      data: { quantity: article.quantity },
    });
  }
  console.log("     état initial rétabli.");
}

async function main() {
  await verifierCatalogue();
  verifierRoutes();
  await cycleDepartement();
  await verifierRefus();
  await cycleContrat();
  await verifierCalculs();
}

main().then(() => process.exit(0));
