import type { MetadataRoute } from "next";

/**
 * Instructions aux robots d'indexation.
 *
 * Seule la vitrine est publique. Tout le reste — connexion et back-office — est
 * explicitement exclu : ces pages sont deja protegees par le proxy et le DAL,
 * mais rien ne justifie qu'un moteur de recherche en garde la trace, ne
 * serait-ce que sous forme d'URL.
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/connexion", "/tableau-de-bord", "/acces-refuse", "/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
