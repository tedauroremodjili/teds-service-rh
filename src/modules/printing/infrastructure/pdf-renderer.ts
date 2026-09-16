import "server-only";

import puppeteer, { type Browser } from "puppeteer";

/**
 * Rendu PDF cote serveur.
 *
 * Puppeteer pilote un Chromium sans affichage pour imprimer les pages
 * d'impression du back-office (memes gabarits, meme CSS `@page` que
 * l'apercu a l'ecran) directement en PDF telechargeable — sans passer par la
 * boite de dialogue du navigateur de l'utilisateur, qui ajoute son propre
 * en-tete (URL, date, numero de page) qu'aucun CSS ni JS d'une page ne peut
 * supprimer.
 *
 * L'instance de navigateur est partagee et memorisee sur `globalThis` : la
 * lancer prend pres d'une seconde, et le rechargement a chaud de Next.js en
 * developpement ne doit pas en ouvrir une nouvelle a chaque modification —
 * meme raisonnement que le client Prisma (`infrastructure/database/prisma.ts`).
 */

const globalForBrowser = globalThis as unknown as {
  pdfBrowser: Promise<Browser> | undefined;
};

function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function getBrowser(): Promise<Browser> {
  if (!globalForBrowser.pdfBrowser) {
    globalForBrowser.pdfBrowser = launchBrowser();
  }

  const browser = await globalForBrowser.pdfBrowser;

  // Le navigateur a pu se fermer (crash) entre deux requetes : on en relance un.
  if (!browser.connected) {
    globalForBrowser.pdfBrowser = launchBrowser();
    return globalForBrowser.pdfBrowser;
  }

  return browser;
}

export interface RenderedPdf {
  buffer: Buffer;
  title: string;
}

/**
 * Imprime une page d'impression interne en PDF A4.
 *
 * `sessionCookie` authentifie la page ciblee exactement comme le ferait le
 * navigateur de l'utilisateur : le contenu produit est donc celui auquel il a
 * reellement droit, verifie par le DAL de la page elle-meme — cet appel ne
 * fait que rejouer sa mise en page, jamais que contourner ses controles.
 */
export async function renderPrintablePdf({
  url,
  sessionCookie,
}: {
  url: URL;
  sessionCookie: { name: string; value: string };
}): Promise<RenderedPdf> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setCookie({
      name: sessionCookie.name,
      value: sessionCookie.value,
      url: url.origin,
      httpOnly: true,
      sameSite: "Lax",
    });

    const response = await page.goto(url.toString(), { waitUntil: "networkidle0" });
    if (!response) {
      throw new Error("Page d'impression injoignable.");
    }

    // La session a pu expirer entre le controle d'acces et cet appel : la
    // page cible redirige alors vers la connexion ou « Acces refuse ». On
    // refuse de livrer ce contenu comme s'il s'agissait de la piece demandee.
    const arrivee = new URL(page.url());
    if (arrivee.pathname === "/connexion" || arrivee.pathname === "/acces-refuse") {
      throw new Error("Session expiree ou droits insuffisants au moment du rendu.");
    }

    const buffer = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    return { buffer: Buffer.from(buffer), title: await page.title() };
  } finally {
    await page.close();
  }
}
