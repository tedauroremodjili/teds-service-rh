/**
 * Verification manuelle de l'impression, contre la vraie base.
 * Lancement :
 *   node --env-file=.env --import tsx --conditions=react-server scripts/printing-smoke.ts
 *
 * Le script ne cree rien : il ne fait que lire. Il verifie quatre choses que
 * l'oeil ne rattrape pas sur un ecran :
 *
 *   1. chaque ressource du catalogue a bien un gabarit d'impression ;
 *   2. chaque gabarit declare est effectivement charge (pas de piece annoncee
 *      qui retomberait silencieusement sur la fiche generique) ;
 *   3. l'identite de l'entreprise imprimee sur l'en-tete est renseignee ;
 *   4. les montants s'ecrivent correctement en toutes lettres — l'accord de
 *      « vingt » et « cent » est la faute la plus facile a laisser passer.
 */
import { prisma } from "@/infrastructure/database/prisma";
import {
  loadPrintedList,
  loadPrintedRecord,
} from "@/modules/printing/application/print-use-cases";
import { hasDedicatedDocument, printableFor } from "@/modules/printing/domain/printable";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { findResource, RESOURCES } from "@/modules/resources/domain/catalog";
import { idFieldOf } from "@/modules/resources/domain/resource";
import { prismaResourceRepository as repo } from "@/modules/resources/infrastructure/prisma-resource-repository";
import { montantEnLettres } from "@/shared/lib/amount-in-words";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

let echecs = 0;

function verifier(condition: boolean, message: string) {
  console.log(`${condition ? "OK  " : "KO  "} ${message}`);
  if (!condition) echecs += 1;
}

/** 1. Le papier a en-tete doit avoir un emetteur. */
async function verifierEnTete() {
  console.log("\n— Papier à en-tête —");
  const company = await getCompanyIdentity();

  verifier(company.name.length > 0, `raison sociale : « ${company.name} »`);
  verifier(company.logoUrl.startsWith("/"), `logo : ${company.logoUrl}`);

  const renseignees = [company.address, company.phone, company.email].filter(Boolean).length;
  verifier(
    renseignees > 0,
    `${renseignees} coordonnée(s) sur 3 — les vides ne s'impriment pas (/parametres)`,
  );
}

/** 2. Toute ressource doit s'imprimer, au pire en fiche generique. */
function verifierGabarits() {
  console.log(`\n— Gabarits : ${RESOURCES.length} ressources —`);

  for (const definition of RESOURCES) {
    const printable = printableFor(definition.key, definition.singular);
    const dedie = hasDedicatedDocument(definition.key);

    verifier(
      printable.title.length > 0,
      `${definition.key.padEnd(22)} ${printable.template.padEnd(11)} ` +
        `${printable.copies} exemplaire(s)  ${dedie ? "pièce dédiée" : "fiche générique"}`,
    );
  }
}

/**
 * 3. Une piece dediee doit vraiment se charger.
 *
 * C'est le controle qui compte : une jointure obligatoire oubliee fait retomber
 * la piece sur la fiche generique sans rien casser, et personne ne s'en apercoit
 * avant qu'un client reparte avec une liste de champs au lieu d'une facture.
 */
async function verifierPiecesDediees() {
  console.log("\n— Chargement des pièces dédiées —");

  const dediees = RESOURCES.filter((resource) => hasDedicatedDocument(resource.key));

  for (const definition of dediees) {
    const attendu = printableFor(definition.key, definition.singular).template;

    const delegate = (prisma as unknown as Record<string, { findFirst(args?: unknown): Promise<Record<string, unknown> | null> }>)[
      definition.model
    ];
    const premier = await delegate.findFirst({ select: { [idFieldOf(definition)]: true } });

    if (!premier) {
      console.log(`--   ${definition.key.padEnd(22)} aucune donnée en base, non vérifiable`);
      continue;
    }

    const id = String(premier[idFieldOf(definition)]);
    const piece = await loadPrintedRecord(repo, definition, id);

    verifier(
      piece?.template === attendu,
      `${definition.key.padEnd(22)} attendu « ${attendu} », obtenu « ${piece?.template ?? "aucun"} »`,
    );
  }
}

/** 4. Un état de liste doit rappeler ses critères et rester sous le plafond. */
async function verifierEtatDeListe() {
  console.log("\n— État de liste —");

  const ventes = findResource("ventes");
  if (!ventes) {
    verifier(false, "ressource « ventes » absente du catalogue");
    return;
  }

  const filtre = await loadPrintedList(repo, ventes, { status: "PAYEE" });
  const complet = await loadPrintedList(repo, ventes, {});

  verifier(
    filtre.criteria.length === 1 && filtre.criteria[0].startsWith("Statut"),
    `critères imprimés : ${filtre.criteria.join(" · ") || "aucun"}`,
  );
  verifier(
    filtre.total <= complet.total,
    `filtré ${filtre.total} ligne(s) sur ${complet.total} au total`,
  );
  verifier(
    complet.rows.length <= 500,
    `${complet.rows.length} ligne(s) imprimées — plafond respecté`,
  );
  verifier(
    ["portrait", "landscape"].includes(complet.orientation),
    `orientation retenue : ${complet.orientation}`,
  );
}

/** 5. Les montants en toutes lettres, accords compris. */
function verifierMontantsEnLettres() {
  console.log("\n— Montants en toutes lettres —");

  const cas: Array<[number, string]> = [
    [0, "Zéro franc CFA"],
    [1, "Un franc CFA"],
    [80, "Quatre-vingts francs CFA"],
    [81, "Quatre-vingt-un francs CFA"],
    [200, "Deux cents francs CFA"],
    [201, "Deux cent un francs CFA"],
    // Les deux pieges : « mille » bloque l'accord de ce qui le precede.
    [300_000, "Trois cent mille francs CFA"],
    [80_000, "Quatre-vingt mille francs CFA"],
    [1_234_567, "Un million deux cent trente-quatre mille cinq cent soixante-sept francs CFA"],
  ];

  for (const [montant, attendu] of cas) {
    const obtenu = montantEnLettres(montant);
    verifier(obtenu === attendu, `${String(montant).padStart(9)} → ${obtenu}`);
  }
}

async function main() {
  console.log("\n=== TED'S SERVICE — vérification de l'impression ===");

  await verifierEnTete();
  verifierGabarits();
  await verifierPiecesDediees();
  await verifierEtatDeListe();
  verifierMontantsEnLettres();

  console.log(
    echecs === 0
      ? "\n=== Tout est conforme. ===\n"
      : `\n=== ${echecs} anomalie(s) détectée(s). ===\n`,
  );

  process.exit(echecs === 0 ? 0 : 1);
}

main();
