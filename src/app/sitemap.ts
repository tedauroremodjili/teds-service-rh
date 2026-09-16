import type { MetadataRoute } from "next";

import { PAGES_VITRINE } from "@/modules/landing/domain/content";

/**
 * Plan du site.
 *
 * Seules les pages de la vitrine y figurent. Les ecrans de gestion sont
 * derriere l'authentification : les indexer n'aurait aucun sens, et les
 * exposer sous forme d'URL encore moins.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const derniereModification = new Date();

  return [
    {
      url: base,
      lastModified: derniereModification,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...PAGES_VITRINE.map((page) => ({
      url: `${base}${page.href}`,
      lastModified: derniereModification,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
