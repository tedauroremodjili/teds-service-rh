import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/modules/auth/domain/permissions";
import { permissionForPath } from "@/modules/auth/domain/route-permissions";
import { decryptSession, SESSION_COOKIE } from "@/modules/auth/infrastructure/session-token";

/**
 * Proxy — anciennement « middleware ».
 *
 * Next.js 16 a renomme le fichier `middleware.ts` en `proxy.ts` pour clarifier
 * son role : filtrer et rediriger les requetes a la frontiere du reseau. Il
 * s'execute avant le rendu, sur le runtime Node.js (l'edge n'est plus supporte
 * ici).
 *
 * Ce que fait ce fichier : un controle OPTIMISTE. Il verifie la signature du
 * cookie et compare la route demandee a la matrice des permissions. Aucune
 * requete en base : ce serait trop couteux sur chaque requete.
 *
 * Pourquoi ici plutot que seulement dans les pages ? Parce qu'un `redirect()`
 * declenche depuis une page arrive apres l'envoi du layout : le navigateur
 * affiche brievement une coquille vide avant d'etre redirige. Le controle en
 * amont evite ce clignotement et epargne un rendu inutile.
 *
 * La verification qui FAIT AUTORITE reste celle du DAL
 * (src/infrastructure/auth/dal.ts), appelee dans chaque page et chaque Server
 * Action — car une Server Action est joignable par un POST direct, sans jamais
 * passer par une navigation.
 */

/**
 * Prefixes ouverts sans etre connecte : la route ET tout ce qui est dessous.
 */
const PREFIXES_PUBLICS = ["/connexion", "/mot-de-passe-oublie"];

/**
 * Pages publiques a correspondance EXACTE.
 *
 * La vitrine vit a la racine. La mettre dans la liste des prefixes ouvrirait
 * l'application entiere, puisque toute URL commence par « / » — c'est le genre
 * de detail qui transforme un controle d'acces en passoire. D'ou deux listes
 * distinctes.
 */
const PAGES_PUBLIQUES = [
  "/",
  "/fonctionnalites",
  "/avantages",
  "/fonctionnement",
  "/apercu",
  "/questions",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute =
    PAGES_PUBLIQUES.includes(pathname) ||
    PREFIXES_PUBLICS.some((route) => pathname.startsWith(route));

  const session = await decryptSession(request.cookies.get(SESSION_COOKIE)?.value);

  // --- Visiteur non connecte -------------------------------------------
  if (!session) {
    if (isPublicRoute) return NextResponse.next();

    const loginUrl = new URL("/connexion", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("suivant", pathname);
    }

    const response = NextResponse.redirect(loginUrl);
    // Cookie present mais invalide ou expire : on le supprime pour eviter
    // une boucle de redirections.
    if (request.cookies.has(SESSION_COOKIE)) {
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  }

  // --- Utilisateur connecte revenant sur la page de connexion ------------
  if (pathname.startsWith("/connexion")) {
    return NextResponse.redirect(new URL("/tableau-de-bord", request.url));
  }

  // --- Controle des droits par route ------------------------------------
  const permission = permissionForPath(pathname);
  if (permission && !hasPermission(session.permissions, permission)) {
    return NextResponse.redirect(new URL("/acces-refuse", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * On exclut les ressources qui n'ont pas besoin d'etre filtrees : fichiers
   * internes de Next.js, images optimisees, favicon et fichiers statiques.
   * Cela evite un traitement inutile sur chaque image de la page.
   */
  matcher: [
    /*
     * Sont exclus du filtrage :
     *  - les fichiers internes de Next.js et les images ;
     *  - `sitemap.xml` et `robots.txt`, qui doivent rester lisibles par les
     *    moteurs de recherche. Un robot ne porte pas de cookie de session :
     *    filtre, il recevrait une redirection vers la page de connexion et
     *    n'indexerait jamais la vitrine.
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.jpeg|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
