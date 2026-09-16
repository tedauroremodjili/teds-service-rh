import "server-only";

/**
 * Lecture des erreurs Prisma.
 *
 * Une violation d'unicite (P2002) doit produire un message qui NOMME le champ
 * fautif — « cette adresse email a deja un compte » plutot qu'un refus vague.
 * Le probleme : `meta.target` n'est pas rempli de la meme facon selon
 * l'adaptateur. Avec le driver PostgreSQL de Prisma 7, il est souvent absent,
 * et l'information ne se trouve que dans le message (« Unique constraint failed
 * on the fields: (`email`) »).
 *
 * On lit donc les deux sources. Sans cela, l'utilisateur se voit reprocher le
 * mauvais champ et corrige la mauvaise ligne du formulaire.
 */

/** Champs cites par une violation d'unicite, quelle que soit la forme de l'erreur. */
export function uniqueConstraintFields(error: unknown): string[] {
  const cible = (error as { meta?: { target?: unknown } } | null)?.meta?.target;

  if (Array.isArray(cible)) return cible.map(String);
  if (typeof cible === "string" && cible.length > 0) return [cible];

  const message = error instanceof Error ? error.message : "";
  const trouve = message.match(/fields:\s*\(([^)]*)\)/i);

  if (!trouve) return [];

  return trouve[1]
    .split(",")
    .map((champ) => champ.replace(/[`"'\s]/g, ""))
    .filter(Boolean);
}

/** Code d'erreur Prisma (P2002, P2003, P2025…), ou null. */
export function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}
