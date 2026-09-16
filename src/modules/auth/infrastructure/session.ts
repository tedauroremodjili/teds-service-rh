import "server-only";

import { cookies } from "next/headers";

import type { SessionPayload } from "../domain/session";
import {
  decryptSession,
  encryptSession,
  SESSION_COOKIE,
  sessionMaxAgeSeconds,
} from "./session-token";

/**
 * Gestion du cookie de session (module 1).
 *
 * Strategie retenue : session « stateless » signee. La charge utile est
 * encapsulee dans un JWT signe (HS256) puis deposee dans un cookie HttpOnly.
 * Aucune requete en base n'est necessaire pour savoir qui est connecte, ce qui
 * rend la verification tres rapide — y compris dans proxy.ts, execute a chaque
 * requete.
 *
 * Contrepartie assumee : revoquer une session avant son expiration demande une
 * verification en base. C'est pourquoi la duree de vie est courte (8 h par
 * defaut) et que les actions sensibles rechargent l'utilisateur depuis la base
 * via `getFreshUser()` du DAL.
 *
 * La cryptographie elle-meme vit dans session-token.ts, utilisable aussi par
 * le proxy.
 */

export { SESSION_COOKIE, decryptSession, encryptSession };

/** Cree le cookie de session apres une connexion reussie. */
export async function createSessionCookie(
  payload: Omit<SessionPayload, "expiresAt">,
): Promise<void> {
  const expiresAt = Date.now() + sessionMaxAgeSeconds() * 1000;
  const token = await encryptSession({ ...payload, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    // Inaccessible au JavaScript du navigateur : protege contre le vol de
    // session par injection de script (XSS).
    httpOnly: true,
    // Transmis uniquement en HTTPS en production.
    secure: process.env.NODE_ENV === "production",
    // Non transmis lors des navigations initiees par un autre site :
    // c'est la protection CSRF de base exigee par la section 7.
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

/** Lit la session courante depuis le cookie. */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Supprime le cookie a la deconnexion. */
export async function destroySessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
