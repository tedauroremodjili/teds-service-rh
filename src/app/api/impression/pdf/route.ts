import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { getFreshUser } from "@/infrastructure/auth/dal";
import { hasPermission } from "@/modules/auth/domain/permissions";
import { permissionForPath } from "@/modules/auth/domain/route-permissions";
import { SESSION_COOKIE } from "@/modules/auth/infrastructure/session-token";
import { renderPrintablePdf } from "@/modules/printing/infrastructure/pdf-renderer";

/**
 * Telechargement PDF d'une piece d'impression — /api/impression/pdf?path=...
 *
 * Produit le fichier cote serveur (voir pdf-renderer.ts) plutot que de
 * s'appuyer sur « Enregistrer au format PDF » du navigateur : le resultat est
 * identique sur tous les postes et ne porte jamais l'en-tete que Chrome ajoute
 * de son cote (URL, date, numero de page) — ce que la page ne peut pas
 * controler.
 *
 * `path` doit designer une des pages d'impression internes du back-office —
 * jamais une URL absolue, pour ecarter tout risque de faire imprimer un site
 * tiers par le serveur (SSRF).
 */

const CHEMIN_IMPRESSION = /^\/[a-z0-9-]+(?:\/[a-zA-Z0-9_-]+)?\/impression$/;

export async function GET(request: NextRequest) {
  const chemin = request.nextUrl.searchParams.get("path");
  const pathname = chemin?.split("?")[0] ?? "";

  if (!chemin || !CHEMIN_IMPRESSION.test(pathname)) {
    return NextResponse.json({ error: "Chemin d'impression invalide." }, { status: 400 });
  }

  // Controle d'acces optimiste, comme proxy.ts, mais avec une lecture fraiche
  // en base (comme authorizeAction) : on evite de lancer un navigateur pour
  // une requete qui n'aboutira de toute facon a rien.
  const user = await getFreshUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const permission = permissionForPath(pathname);
  if (permission && !hasPermission(user.permissions, permission)) {
    return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }

  const url = new URL(chemin, request.nextUrl.origin);

  try {
    const { buffer, title } = await renderPrintablePdf({
      url,
      sessionCookie: { name: SESSION_COOKIE, value: token },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugifyTitre(title)}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Echec de generation du PDF", error);
    return NextResponse.json({ error: "Echec de generation du PDF." }, { status: 502 });
  }
}

/** Nom de fichier a partir du titre de la page (« Fiche du personnel — impression | TED'S SERVICE »). */
function slugifyTitre(title: string): string {
  const nettoye = title
    .replace(/\s*[—|].*$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return nettoye || "document";
}
