import "server-only";

import bcrypt from "bcryptjs";

/**
 * Hachage des mots de passe (section 7 — « Chiffrement des mots de passe »).
 *
 * bcrypt est volontairement lent : c'est sa raison d'etre. Le cout 12 represente
 * environ 250 ms de calcul par verification sur une machine courante, ce qui est
 * imperceptible pour un utilisateur mais rend une attaque par dictionnaire
 * prohibitive.
 */

const COST = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, COST);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Consomme le meme temps qu'une verification reelle, sans qu'aucun compte
 * n'existe. Sans cela, un attaquant mesurerait le temps de reponse pour
 * distinguer « email inconnu » (reponse immediate) de « mot de passe faux »
 * (reponse lente) et pourrait ainsi enumerer les comptes.
 */
export async function simulatePasswordCheck(): Promise<void> {
  await bcrypt.compare(
    "mot-de-passe-fictif",
    "$2a$12$abcdefghijklmnopqrstuv.wxyzABCDEFGHIJKLMNOPQRSTUVWXYZ012",
  );
}
