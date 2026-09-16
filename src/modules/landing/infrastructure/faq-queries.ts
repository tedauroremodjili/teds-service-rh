import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Questions frequentes affichees sur la page publique /questions.
 *
 * La FAQ vit desormais en base (module 18, ecran /faq du back-office) plutot
 * que dans `domain/content.ts` : c'est un contenu que TED'S SERVICE modifie
 * lui-meme, pas une description du produit qui suit le code.
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export async function listFaqEntries(): Promise<FaqItem[]> {
  return prisma.faqEntry.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, answer: true },
  });
}
