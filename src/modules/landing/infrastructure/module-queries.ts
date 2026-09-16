import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Modules, arguments et etapes affiches sur la vitrine publique.
 *
 * Meme raisonnement que la FAQ (`faq-queries.ts`) : ce contenu vit en base
 * (module 18, ecrans `/modules-vitrine`, `/arguments-vitrine`,
 * `/etapes-vitrine` du back-office) plutot que dans `domain/content.ts` —
 * c'est un contenu que TED'S SERVICE modifie lui-meme, pas une description du
 * produit qui suit le code.
 */

export type LandingModuleFamille =
  | "RESSOURCES_HUMAINES"
  | "ACTIVITE"
  | "FINANCES"
  | "PILOTAGE";

export const FAMILLE_LABELS: Record<LandingModuleFamille, string> = {
  RESSOURCES_HUMAINES: "Ressources humaines",
  ACTIVITE: "Activité",
  FINANCES: "Finances",
  PILOTAGE: "Pilotage",
};

export interface LandingModuleItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  famille: LandingModuleFamille;
}

export interface LandingArgumentItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface LandingWorkflowStepItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export async function listLandingModules(): Promise<LandingModuleItem[]> {
  const lignes = await prisma.landingModule.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, description: true, icon: true, famille: true },
  });

  return lignes;
}

export async function listLandingArguments(): Promise<LandingArgumentItem[]> {
  return prisma.landingArgument.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, description: true, icon: true },
  });
}

export async function listLandingWorkflowSteps(): Promise<LandingWorkflowStepItem[]> {
  return prisma.landingWorkflowStep.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, description: true, icon: true },
  });
}
