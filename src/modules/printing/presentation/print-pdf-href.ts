/**
 * Construit le lien de telechargement d'une page d'impression —
 * `/api/impression/pdf?path=...` (voir `pdf-renderer.ts` et
 * `app/api/impression/pdf/route.ts`).
 *
 * Fonction pure, sans "use client" : les pages serveur d'impression
 * l'appellent directement, avec le chemin et les filtres qu'elles connaissent
 * deja (elles construisent `backHref` de la meme facon).
 */
export function buildPrintPdfHref(
  path: string,
  searchParams?: Record<string, string | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [cle, valeur] of Object.entries(searchParams ?? {})) {
    if (cle === "auto" || valeur === undefined) continue;
    query.set(cle, valeur);
  }

  const queryString = query.toString();
  const cible = queryString ? `${path}?${queryString}` : path;

  return `/api/impression/pdf?path=${encodeURIComponent(cible)}`;
}
