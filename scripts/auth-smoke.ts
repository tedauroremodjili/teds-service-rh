/**
 * Verification manuelle du cas d'usage de connexion, contre la vraie base.
 * Lancement : npx tsx scripts/auth-smoke.ts
 */
import { login } from "@/modules/auth/application/login";
import { prismaAuthRepository } from "@/modules/auth/infrastructure/prisma-auth-repository";
import {
  simulatePasswordCheck,
  verifyPassword,
} from "@/modules/auth/infrastructure/password-hasher";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

const deps = { repository: prismaAuthRepository, verifyPassword, simulatePasswordCheck };

async function essai(titre: string, email: string, password: string) {
  const result = await login({ email, password }, deps);

  if (result.ok) {
    const { session } = result.value;
    console.log(`OK   ${titre}`);
    console.log(
      `     role=${session.role}  permissions=${session.permissions.length}  employe=${session.employeeId ? "oui" : "non"}`,
    );
  } else {
    console.log(`KO   ${titre}`);
    console.log(`     ${result.error.code} : ${result.error.message}`);
  }
}

async function main() {
  await essai("admin, bon mot de passe", "admin@tedsservice.cg", "Teds@2026");
  await essai("commercial, bon mot de passe", "commercial@tedsservice.cg", "Teds@2026");
  await essai("admin, mauvais mot de passe", "admin@tedsservice.cg", "mauvais");
  await essai("compte inexistant", "inconnu@tedsservice.cg", "Teds@2026");
  await essai("email mal forme", "pas-un-email", "Teds@2026");
}

main().then(() => process.exit(0));
