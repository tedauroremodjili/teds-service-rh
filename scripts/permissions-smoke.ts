/**
 * Verification manuelle de l'attribution des permissions par utilisateur,
 * contre la vraie base.
 * Lancement : npx tsx scripts/permissions-smoke.ts
 *
 * Le script repose l'etat initial en fin de course : il peut donc etre relance
 * autant de fois que voulu.
 */
import { prisma } from "@/infrastructure/database/prisma";
import { PERMISSIONS, type RoleName } from "@/modules/auth/domain/permissions";
import { prismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";
import { hashPassword } from "@/modules/auth/infrastructure/password-hasher";
import { login } from "@/modules/auth/application/login";
import {
  simulatePasswordCheck,
  verifyPassword,
} from "@/modules/auth/infrastructure/password-hasher";
import {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  updateRoleInfo,
  updateRolePermissions,
} from "@/modules/roles/application/role-use-cases";
import { prismaRoleRepository } from "@/modules/roles/infrastructure/prisma-role-repository";
import {
  archiveUserAccount,
  createUserAccount,
  getUserAccess,
  listUsers,
  updateUserAccount,
  updateUserPermissions,
} from "@/modules/users/application/user-use-cases";
import { prismaUserRepository } from "@/modules/users/infrastructure/prisma-user-repository";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const repo = prismaUserRepository;

async function main() {
  const page = await listUsers(repo, {}, { page: 1, pageSize: 50 });
  console.log(`${page.total} compte(s) en base.`);

  const admin = page.items.find((compte) => compte.role === "SUPER_ADMIN");
  const cible = page.items.find((compte) => compte.role === "COMMERCIAL");

  if (!admin || !cible) {
    console.log("KO   il faut un SUPER_ADMIN et un COMMERCIAL en base (npm run db:seed).");
    return;
  }

  // `find` ne restreint pas le type de l'element trouve : le role reste l'union
  // complete pour TypeScript. Le filtre ci-dessus l'a pourtant deja etabli, d'ou
  // l'annotation explicite.
  const actor = { id: admin.id, role: "SUPER_ADMIN" as const };

  const avant = await getUserAccess(repo, cible.id);
  if (!avant.ok) throw new Error(avant.error.message);
  console.log(
    `Avant : ${cible.email} → ${avant.value.effective.length} droit(s), dont ${avant.value.fromRole.length} du rôle.`,
  );

  // 1. On accorde un droit hors du role, et on en retire un que le role donne.
  const souhaites = avant.value.fromRole
    .filter((permission) => permission !== PERMISSIONS.SALES_CREATE)
    .concat(PERMISSIONS.CASH_READ);

  const ecriture = await updateUserPermissions(repo, {
    actor,
    targetId: cible.id,
    desired: souhaites,
  });

  if (!ecriture.ok) {
    console.log(`KO   ${ecriture.error.code} : ${ecriture.error.message}`);
    return;
  }
  console.log(
    `OK   accordées=[${ecriture.value.added.join(", ")}] retirées=[${ecriture.value.removed.join(", ")}]`,
  );

  // 2. Relecture : les droits effectifs doivent refleter l'ecart.
  const apres = await getUserAccess(repo, cible.id);
  if (!apres.ok) throw new Error(apres.error.message);

  const aCaisse = apres.value.effective.includes(PERMISSIONS.CASH_READ);
  const aVente = apres.value.effective.includes(PERMISSIONS.SALES_CREATE);
  console.log(`     cash.read=${aCaisse ? "oui" : "non"} (attendu oui)`);
  console.log(`     sales.create=${aVente ? "oui" : "non"} (attendu non)`);

  // 3. Le chemin de connexion doit resoudre exactement les memes droits.
  const compte = await prismaAuthRepository.findByEmail(cible.email);
  console.log(
    `     écarts vus par la connexion : ${compte?.permissionOverrides
      .map((o) => `${o.granted ? "+" : "−"}${o.permission}`)
      .join(" ")}`,
  );

  // 4. Remise a l'etat initial.
  const remise = await updateUserPermissions(repo, {
    actor,
    targetId: cible.id,
    desired: avant.value.fromRole,
  });
  console.log(remise.ok ? "OK   état initial rétabli." : `KO   ${remise.error.message}`);

  // 5. Garde-fous : on ne modifie ni ses propres droits, ni ceux du joker.
  const soiMeme = await updateUserPermissions(repo, {
    actor,
    targetId: admin.id,
    desired: [],
  });
  console.log(
    soiMeme.ok
      ? "KO   l'auto-attribution aurait dû être refusée."
      : `OK   auto-attribution refusée (${soiMeme.error.code}).`,
  );

  await verifierRoles(actor);
  await verifierCreationCompte(actor);
  await verifierCrudRoles(actor);
  await verifierCrudComptes(actor);
}

/* -------------------------------------------------------------------------- */
/* CRUD des rôles créés                                                        */
/* -------------------------------------------------------------------------- */

async function verifierCrudRoles(actor: { id: string; role: RoleName }) {
  console.log("\n— CRUD des rôles —");

  const libelle = `Rôle de vérification ${Date.now().toString().slice(-5)}`;

  const creation = await createRole(prismaRoleRepository, {
    label: libelle,
    description: "Créé par permissions-smoke.ts",
    permissions: [PERMISSIONS.CASH_READ, PERMISSIONS.SALES_READ],
  });

  if (!creation.ok) {
    console.log(`KO   création : ${creation.error.message}`);
    return;
  }
  console.log(`OK   créé : ${creation.value} (identifiant dérivé du nom)`);

  const relu = await getRole(prismaRoleRepository, creation.value);
  console.log(
    relu.ok && relu.value.permissions.length === 2 && !relu.value.isSystem
      ? `OK   relu : ${relu.value.label}, ${relu.value.permissions.length} droit(s), non système.`
      : "KO   relecture incorrecte.",
  );

  const renommage = await updateRoleInfo(prismaRoleRepository, {
    name: creation.value,
    label: `${libelle} (renommé)`,
    description: null,
  });
  console.log(renommage.ok ? "OK   renommé." : `KO   ${renommage.error.message}`);

  // Un rôle porté par un compte ne se supprime pas.
  const compte = await createUserAccount(prismaUserRepository, hashPassword, {
    actor,
    email: `role-test-${Date.now().toString().slice(-8)}@tedsservice.cg`,
    password: "Teds@2026",
    role: creation.value,
    employeeId: null,
    mustChangePassword: true,
  });

  if (compte.ok) {
    const refus = await deleteRole(prismaRoleRepository, { actor, name: creation.value });
    console.log(
      refus.ok
        ? "KO   un rôle encore porté a été supprimé."
        : `OK   rôle porté protégé (${refus.error.code}).`,
    );
    await prisma.user.delete({ where: { id: compte.value } });
  }

  const systeme = await deleteRole(prismaRoleRepository, { actor, name: "COMPTABLE" });
  console.log(
    systeme.ok
      ? "KO   un rôle système a été supprimé."
      : `OK   rôle système protégé (${systeme.error.code}).`,
  );

  const suppression = await deleteRole(prismaRoleRepository, { actor, name: creation.value });
  console.log(suppression.ok ? "OK   supprimé." : `KO   ${suppression.error.message}`);
}

/* -------------------------------------------------------------------------- */
/* CRUD des comptes                                                            */
/* -------------------------------------------------------------------------- */

async function verifierCrudComptes(actor: { id: string; role: RoleName }) {
  console.log("\n— CRUD des comptes —");

  const email = `crud-${Date.now().toString().slice(-8)}@tedsservice.cg`;
  const creation = await createUserAccount(prismaUserRepository, hashPassword, {
    actor,
    email,
    password: "Teds@2026",
    role: "SECRETAIRE",
    employeeId: null,
    mustChangePassword: true,
  });

  if (!creation.ok) {
    console.log(`KO   création : ${creation.error.message}`);
    return;
  }

  const nouvelEmail = `crud-modifie-${Date.now().toString().slice(-8)}@tedsservice.cg`;
  const modification = await updateUserAccount(prismaUserRepository, hashPassword, {
    actor,
    targetId: creation.value,
    email: nouvelEmail,
    employeeId: null,
    mustChangePassword: false,
    newPassword: "Nouveau@2026",
  });

  console.log(
    modification.ok && modification.value.passwordChanged
      ? "OK   email et mot de passe modifiés."
      : `KO   ${modification.ok ? "mot de passe inchangé" : modification.error.message}`,
  );

  // Le nouveau mot de passe doit ouvrir la session, l'ancien non.
  const connexion = await login(
    { email: nouvelEmail, password: "Nouveau@2026" },
    { repository: prismaAuthRepository, verifyPassword, simulatePasswordCheck },
  );
  console.log(
    connexion.ok
      ? "OK   connexion avec le nouveau mot de passe."
      : `KO   ${connexion.error.message}`,
  );

  const faible = await updateUserAccount(prismaUserRepository, hashPassword, {
    actor,
    targetId: creation.value,
    email: nouvelEmail,
    employeeId: null,
    mustChangePassword: false,
    newPassword: "court",
  });
  console.log(
    faible.ok
      ? "KO   un mot de passe trop court a été accepté."
      : `OK   politique de mot de passe appliquée (${faible.error.message})`,
  );

  const autoArchivage = await archiveUserAccount(prismaUserRepository, {
    actor,
    targetId: actor.id,
  });
  console.log(
    autoArchivage.ok
      ? "KO   auto-archivage accepté."
      : `OK   auto-archivage refusé (${autoArchivage.error.code}).`,
  );

  const archivage = await archiveUserAccount(prismaUserRepository, {
    actor,
    targetId: creation.value,
  });
  console.log(archivage.ok ? "OK   compte archivé." : `KO   ${archivage.error.message}`);

  const apres = await getUserAccess(prismaUserRepository, creation.value);
  console.log(
    apres.ok ? "KO   un compte archivé reste visible." : "OK   le compte archivé sort des listes.",
  );

  await prisma.user.delete({ where: { id: creation.value } });
  console.log("     compte de test supprimé.");
}

/* -------------------------------------------------------------------------- */
/* Rôles : socle partagé, lu et modifié en base                                */
/* -------------------------------------------------------------------------- */

async function verifierRoles(actor: { id: string; role: RoleName }) {
  console.log("\n— Rôles —");

  const roles = await listRoles(prismaRoleRepository);
  for (const role of roles) {
    console.log(
      `     ${role.label.padEnd(24)} ${String(role.permissions.length).padStart(2)} droit(s), ${role.userCount} compte(s)`,
    );
  }

  const cible = "FORMATEUR" as const;
  const avant = await getRole(prismaRoleRepository, cible);
  if (!avant.ok) {
    console.log(`KO   rôle ${cible} introuvable.`);
    return;
  }

  const initial = avant.value.permissions;

  // 1. Ajouter un droit au socle profite à tous les titulaires.
  const ajout = await updateRolePermissions(prismaRoleRepository, {
    actor,
    role: cible,
    desired: [...initial, PERMISSIONS.CASH_READ],
  });

  console.log(
    ajout.ok
      ? `OK   socle modifié : +[${ajout.value.added.join(", ")}] → ${ajout.value.affectedUsers} compte(s)`
      : `KO   ${ajout.error.message}`,
  );

  // 2. Un titulaire du rôle doit voir le nouveau droit dans ses permissions.
  const formateur = await prismaAuthRepository.findByEmail("formateur@tedsservice.cg");
  console.log(
    formateur?.rolePermissions.includes(PERMISSIONS.CASH_READ)
      ? "OK   le titulaire du rôle a hérité du droit."
      : "KO   le titulaire n'a pas hérité du droit.",
  );

  // 3. Retour à l'état initial.
  const retour = await updateRolePermissions(prismaRoleRepository, {
    actor,
    role: cible,
    desired: initial,
  });
  console.log(retour.ok ? "OK   socle rétabli." : `KO   ${retour.error.message}`);

  // 4. Garde-fous.
  const sonPropreRole = await updateRolePermissions(prismaRoleRepository, {
    actor: { id: actor.id, role: cible },
    role: cible,
    desired: [],
  });
  console.log(
    sonPropreRole.ok
      ? "KO   la modification de son propre rôle aurait dû être refusée."
      : `OK   modification de son propre rôle refusée (${sonPropreRole.error.code}).`,
  );

  // Le joker se teste avec un auteur d'un AUTRE rôle : sinon c'est la règle
  // « pas son propre rôle » qui répond, et la protection resterait non vérifiée.
  const joker = await updateRolePermissions(prismaRoleRepository, {
    actor: { id: actor.id, role: "DIRECTEUR" },
    role: "SUPER_ADMIN",
    desired: [],
  });
  console.log(
    joker.ok
      ? "KO   le socle du super administrateur a pu être vidé."
      : `OK   rôle joker protégé (${joker.error.code}).`,
  );
}

/* -------------------------------------------------------------------------- */
/* Création de compte                                                          */
/* -------------------------------------------------------------------------- */

async function verifierCreationCompte(actor: { id: string; role: RoleName }) {
  console.log("\n— Création de compte —");

  const email = `verification-${Date.now().toString().slice(-8)}@tedsservice.cg`;

  const faible = await createUserAccount(prismaUserRepository, hashPassword, {
    actor,
    email,
    password: "court",
    role: "SECRETAIRE",
    employeeId: null,
    mustChangePassword: true,
  });
  console.log(
    faible.ok
      ? "KO   un mot de passe trop court a été accepté."
      : `OK   mot de passe refusé (${faible.error.message})`,
  );

  const creation = await createUserAccount(prismaUserRepository, hashPassword, {
    actor,
    email,
    password: "Teds@2026",
    role: "SECRETAIRE",
    employeeId: null,
    mustChangePassword: true,
  });

  if (!creation.ok) {
    console.log(`KO   création : ${creation.error.message}`);
    return;
  }

  const acces = await getUserAccess(prismaUserRepository, creation.value);
  console.log(
    acces.ok
      ? `OK   compte créé : ${acces.value.user.email} — ${acces.value.effective.length} droit(s) hérités du rôle.`
      : `KO   relecture : ${acces.error.message}`,
  );

  const doublon = await createUserAccount(prismaUserRepository, hashPassword, {
    actor,
    email,
    password: "Teds@2026",
    role: "AGENT",
    employeeId: null,
    mustChangePassword: true,
  });
  console.log(
    doublon.ok
      ? "KO   deux comptes avec la même adresse."
      : `OK   email unique respecté (${doublon.error.message})`,
  );

  await prisma.user.delete({ where: { id: creation.value } });
  console.log("     compte de test supprimé.");
}

main().then(() => process.exit(0));
