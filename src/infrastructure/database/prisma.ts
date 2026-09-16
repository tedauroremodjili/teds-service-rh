import "server-only";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "./generated/client";

/**
 * Client Prisma partage.
 *
 * Prisma 7 : le client ne se connecte plus tout seul a la base. Il faut lui
 * fournir un « driver adapter » — ici PrismaMariaDb, qui s'appuie sur le
 * pilote MySQL/MariaDB natif. C'est ce qui permet a Prisma de tourner ailleurs
 * que sur Node (edge, workers), et de partager le pool de connexions.
 *
 * En developpement, Next.js recharge les modules a chaque modification. Sans
 * precaution, chaque rechargement ouvrirait un nouveau pool et PostgreSQL
 * finirait par refuser les connexions. On memorise donc l'instance sur l'objet
 * global, qui survit au rechargement a chaud.
 *
 * L'import "server-only" fait echouer le build si ce fichier est importe depuis
 * un composant client : la base ne doit jamais etre joignable du navigateur.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est absente. Copiez .env.example vers .env et renseignez la connexion MySQL.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(connectionString),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
