/**
 * Verification HTTP de bout en bout : proxy → page → DAL → repository → rendu.
 *
 * Elle forge un cookie de session valide pour un compte reel, puis appelle les
 * ecrans comme le ferait un navigateur. C'est le seul controle qui prouve que
 * les permissions produisent bien le refus attendu a l'execution.
 *
 * Lancement (le serveur doit tourner) :
 *   npm run build && $env:PORT=3100; npm run start
 *   node --env-file=.env --import tsx --conditions=react-server scripts/pages-smoke.ts
 */
import { login } from "@/modules/auth/application/login";
import { prismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";
import {
  simulatePasswordCheck,
  verifyPassword,
} from "@/modules/auth/infrastructure/password-hasher";
import {
  encryptSession,
  SESSION_COOKIE,
} from "@/modules/auth/infrastructure/session-token";
import { listUsers } from "@/modules/users/application/user-use-cases";
import { prismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";

async function cookieFor(email: string, password: string): Promise<string> {
  const result = await login(
    { email, password },
    { repository: prismaAuthRepository, verifyPassword, simulatePasswordCheck },
  );

  if (!result.ok) throw new Error(`connexion impossible : ${result.error.message}`);

  const token = await encryptSession({
    ...result.value.session,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  return `${SESSION_COOKIE}=${token}`;
}

async function verifier(cookie: string, chemin: string, attendu: number, doitContenir?: string) {
  const response = await fetch(`${BASE}${chemin}`, {
    headers: { cookie },
    redirect: "manual",
  });

  const corps = response.status === 200 ? await response.text() : "";
  const contenu = doitContenir ? corps.includes(doitContenir) : true;
  const emplacement = response.headers.get("location") ?? "";

  const ok = response.status === attendu && contenu;
  console.log(
    `${ok ? "OK  " : "KO  "} ${chemin.padEnd(34)} ${response.status}` +
      (emplacement ? ` → ${emplacement}` : "") +
      (doitContenir ? ` | « ${doitContenir} » ${contenu ? "présent" : "ABSENT"}` : ""),
  );
}

/** Un compte autre que l'administrateur, pour tester les écrans de fiche. */
async function premierCompte(): Promise<string | null> {
  const page = await listUsers(prismaUserRepository, {}, { page: 1, pageSize: 10 });
  const compte = page.items.find((candidat) => candidat.role !== "SUPER_ADMIN");
  return compte?.id ?? null;
}

async function main() {
  const admin = await cookieFor("admin@tedsservice.cg", "Teds@2026");
  const formateur = await cookieFor("formateur@tedsservice.cg", "Teds@2026");

  console.log("\n— Super administrateur —");
  await verifier(admin, "/contrats", 200, "Ajouter");
  await verifier(admin, "/contrats", 200, "Synthèse");
  await verifier(admin, "/contrats/nouveau", 200, "Salaire de base");
  await verifier(admin, "/contrats/synthese", 200, "synthèse");
  await verifier(admin, "/caisse", 200, "Caisse");
  await verifier(admin, "/caisse/nouveau", 200, "Sens");
  // Table peuplée : les colonnes déclarées doivent apparaître.
  await verifier(admin, "/departements", 200, "Départements");
  await verifier(admin, "/departements", 200, "Code");
  await verifier(admin, "/inscriptions/nouveau", 200, "Montant convenu");
  // L'écran des paramètres : de vrais champs, pas du JSON à saisir.
  await verifier(admin, "/parametres", 200, "Raison sociale");
  await verifier(admin, "/parametres", 200, 'type="email"');
  await verifier(admin, "/parametres", 200, "Enregistrer les paramètres");
  await verifier(admin, "/parametres/synthese", 200, "Paramètres");
  await verifier(admin, "/mouvements-stock/nouveau", 200, "Article");
  await verifier(admin, "/ressource-inexistante", 404);

  console.log("\n— Codes et matricules pré-remplis —");
  await verifier(admin, "/departements/nouveau", 200, 'value="DEP-');
  await verifier(admin, "/postes/nouveau", 200, 'value="POS-');
  await verifier(admin, "/apprenants/nouveau", 200, 'value="APP-');
  await verifier(admin, "/stock/nouveau", 200, 'value="ART-');
  await verifier(admin, "/contrats/nouveau", 200, `value="CTR-${new Date().getFullYear()}-`);

  console.log("\n— Rôles : CRUD complet —");
  await verifier(admin, "/roles", 200, "Nouveau rôle");
  await verifier(admin, "/roles/nouveau", 200, "Identifiant technique");
  await verifier(admin, "/roles/FORMATEUR", 200, "Socle de droits");
  await verifier(admin, "/roles/FORMATEUR/modifier", 200, "Nom du rôle");
  // Le joker : matrice affichée, tout coché, tout grisé.
  await verifier(admin, "/roles/SUPER_ADMIN", 200, "Toutes les permissions");
  await verifier(admin, "/roles/SUPER_ADMIN", 200, "employees.read");

  console.log("\n— Comptes : CRUD complet —");
  await verifier(admin, "/utilisateurs", 200, "Nouveau compte");
  await verifier(admin, "/utilisateurs/nouveau", 200, "Mot de passe provisoire");

  const compte = await premierCompte();
  if (compte) {
    await verifier(admin, `/utilisateurs/${compte}`, 200, "Archiver le compte");
    await verifier(admin, `/utilisateurs/${compte}/modifier`, 200, "Nouveau mot de passe");
    // La matrice reste lisible même sur un compte non modifiable.
    await verifier(admin, `/utilisateurs/${compte}`, 200, "employees.read");
  }

  console.log("\n— Formateur (trainings.read, students.read, grades.manage) —");
  await verifier(formateur, "/formations", 200, "Formations");
  await verifier(formateur, "/notes/nouveau", 200, "Barème");
  // Refuses : le proxy redirige avant meme le rendu.
  await verifier(formateur, "/caisse", 307);
  await verifier(formateur, "/salaires", 307);
  await verifier(formateur, "/comptabilite", 307);
  // Lecture autorisee, mais pas la creation : le DAL de la page tranche.
  await verifier(formateur, "/apprenants", 200, "Apprenants");
  await verifier(formateur, "/apprenants/nouveau", 307);
  // L'administration des comptes et des rôles exige users.read.
  await verifier(formateur, "/roles", 307);
  await verifier(formateur, "/utilisateurs/nouveau", 307);
}

main().then(() => process.exit(0));
