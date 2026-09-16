import { jwtVerify, SignJWT } from "jose";

import type { SessionPayload } from "../domain/session";

/**
 * Signature et verification du jeton de session.
 *
 * Ce fichier est volontairement isole de `session.ts` : il n'importe NI
 * `next/headers`, NI `server-only`. Il peut donc etre utilise aussi bien dans
 * les pages et Server Actions que dans `proxy.ts`, qui s'execute avant le rendu
 * et n'a pas acces a l'API des cookies de rendu.
 */

export const SESSION_COOKIE = "teds_session";

const encodedKey = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "cle-de-developpement-a-remplacer-imperativement",
);

/** Duree de vie de la session, en secondes (8 h par defaut). */
export function sessionMaxAgeSeconds(): number {
  const parsed = Number(process.env.SESSION_MAX_AGE);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8 * 60 * 60;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(encodedKey);
}

/**
 * Verifie et decode un jeton.
 * Renvoie null pour tout jeton absent, expire, altere ou mal forme : du point
 * de vue de l'appelant, ces cas sont tous equivalents a « non connecte ».
 */
export async function decryptSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    const session = payload as unknown as SessionPayload;

    if (!session.userId || !session.role) return null;
    if (session.expiresAt <= Date.now()) return null;

    return session;
  } catch {
    return null;
  }
}
