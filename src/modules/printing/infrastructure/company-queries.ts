import "server-only";

import { cache } from "react";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Identite de l'entreprise, telle qu'elle apparait sur le papier a en-tete.
 *
 * Elle vient des parametres (`company.*`, module 17) et non du code : une
 * raison sociale, une adresse ou un numero RCCM changent sans qu'on redeploie.
 * Les champs legaux sont optionnels — ils ne figurent sur la piece que s'ils
 * ont ete renseignes, plutot que d'imprimer une ligne vide.
 */
export interface CompanyIdentity {
  name: string;
  slogan: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** Registre du commerce et du credit mobilier. */
  rccm: string | null;
  /** Numero d'identification unique (fiscal). */
  niu: string | null;
  logoUrl: string;
}

/**
 * Le logo par defaut est le PNG detoure, jamais le JPEG d'origine : ce dernier
 * porte un fond gris (#F7F7F7) qui dessine un rectangle visible sur du papier
 * blanc (meme raison que dans `shared/ui/logo.tsx`).
 */
const LOGO_PAR_DEFAUT = "/logo.png";

/**
 * Valeur historique du parametre, posee par les premieres versions du seed.
 * Les installations existantes la portent encore en base ; comme les deux
 * fichiers montrent le MEME logo, on sert le PNG plutot que d'imprimer le
 * rectangle gris en tete de chaque facture. Un logo reellement choisi par le
 * client, lui, est servi tel quel.
 */
const LOGO_HISTORIQUE = "/logo.jpeg";

const REPLI: CompanyIdentity = {
  name: "TED'S SERVICE",
  slogan: null,
  address: null,
  phone: null,
  email: null,
  website: null,
  rccm: null,
  niu: null,
  logoUrl: LOGO_PAR_DEFAUT,
};

/** Une valeur de parametre JSON ramenee a du texte affichable, ou null. */
function texte(valeur: unknown): string | null {
  if (valeur === null || valeur === undefined) return null;
  const chaine = typeof valeur === "string" ? valeur : String(valeur);
  const propre = chaine.trim();
  return propre.length > 0 ? propre : null;
}

/**
 * Identite lue une seule fois par rendu.
 *
 * `cache()` compte ici : une liste imprimee et ses vingt pieces demandent toutes
 * le meme en-tete, et il n'y a aucune raison d'interroger vingt fois la base.
 * Si la table n'est pas encore renseignee, on retombe sur la marque plutot que
 * d'imprimer une piece sans emetteur.
 */
export const getCompanyIdentity = cache(async (): Promise<CompanyIdentity> => {
  const parametres = await prisma.setting.findMany({
    where: { key: { startsWith: "company." } },
    select: { key: true, value: true },
  });

  const valeurs = new Map(parametres.map((parametre) => [parametre.key, parametre.value]));
  const lire = (cle: string) => texte(valeurs.get(`company.${cle}`));

  const logo = lire("logo");

  return {
    name: lire("name") ?? REPLI.name,
    slogan: lire("slogan"),
    address: lire("address"),
    phone: lire("phone"),
    email: lire("email"),
    website: lire("website"),
    rccm: lire("rccm"),
    niu: lire("niu"),
    logoUrl: !logo || logo === LOGO_HISTORIQUE ? LOGO_PAR_DEFAUT : logo,
  };
});
