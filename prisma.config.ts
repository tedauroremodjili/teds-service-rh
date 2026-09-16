import { defineConfig, env } from "prisma/config";

/**
 * Configuration du CLI Prisma (Prisma 7).
 *
 * Depuis Prisma 7, l'URL de connexion n'est plus declaree dans schema.prisma :
 * elle vit ici. Le schema ne decrit plus que la forme des donnees, la
 * configuration d'execution est separee — ce qui evite de committer par
 * inadvertance une chaine de connexion dans le schema.
 *
 * Prisma 7 ne charge plus .env automatiquement ; on le fait explicitement avec
 * l'API native de Node.
 */

if (process.env.DATABASE_URL === undefined) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
