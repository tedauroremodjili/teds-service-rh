/**
 * Vocabulaire du module 10 — prestations de services.
 * Fichier de DOMAINE : aucune dependance technique.
 */

export const SERVICE_CATEGORIES = [
  "DEVELOPPEMENT_WEB",
  "DEVELOPPEMENT_MOBILE",
  "MAINTENANCE",
  "INSTALLATION_WINDOWS",
  "INSTALLATION_LOGICIELS",
  "GRAPHISME",
  "CREATION_LOGO",
  "CREATION_SITE",
  "CREATION_APPLICATION",
  "AUTRE",
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_ORDER_STATUSES = [
  "DEVIS",
  "CONFIRMEE",
  "EN_COURS",
  "LIVREE",
  "FACTUREE",
  "ANNULEE",
] as const;
export type ServiceOrderStatus = (typeof SERVICE_ORDER_STATUSES)[number];

/**
 * Reste du sur une commande. Un devis n'est pas encore une creance : tant que
 * le client n'a pas confirme, l'argent n'est pas attendu.
 */
export function resteDuPrestation(
  amount: number,
  paidAmount: number,
  status: ServiceOrderStatus,
): number {
  if (status === "ANNULEE" || status === "DEVIS") return 0;
  return Math.max(0, amount - paidAmount);
}
