/**
 * Correspondance entre les URL du back-office et les permissions requises.
 *
 * Elle sert au controle OPTIMISTE fait par le proxy, avant tout rendu : sans
 * elle, une page interdite commence a s'afficher (le layout est deja envoye au
 * navigateur) avant d'etre remplacee par la page « Acces refuse ».
 *
 * Ce n'est pas la barriere de securite : c'est le DAL, dans chaque page, qui
 * fait foi. Les deux doivent rester coherents, d'ou ce fichier unique.
 */

import { PERMISSIONS, type Permission } from "./permissions";

const P = PERMISSIONS;

/** Prefixe d'URL -> permission requise. Le prefixe le plus long l'emporte. */
export const ROUTE_PERMISSIONS: ReadonlyArray<{ prefix: string; permission: Permission }> = [
  { prefix: "/employes", permission: P.EMPLOYEES_READ },
  { prefix: "/contrats", permission: P.CONTRACTS_READ },
  { prefix: "/presences", permission: P.ATTENDANCE_READ },
  { prefix: "/conges", permission: P.LEAVES_READ },
  { prefix: "/salaires", permission: P.PAYROLL_READ },
  { prefix: "/remunerations", permission: P.PAYROLL_READ },
  { prefix: "/commissions", permission: P.COMMISSIONS_READ },
  { prefix: "/ventes", permission: P.SALES_READ },
  { prefix: "/documents", permission: P.SALES_READ },
  { prefix: "/prestations", permission: P.SALES_READ },
  { prefix: "/formations", permission: P.TRAININGS_READ },
  { prefix: "/apprenants", permission: P.STUDENTS_READ },
  { prefix: "/certificats", permission: P.TRAININGS_READ },
  { prefix: "/caisse", permission: P.CASH_READ },
  { prefix: "/comptabilite", permission: P.ACCOUNTING_READ },
  { prefix: "/stock", permission: P.INVENTORY_READ },
  { prefix: "/rapports", permission: P.REPORTS_VIEW },
  { prefix: "/utilisateurs", permission: P.USERS_READ },
  { prefix: "/roles", permission: P.USERS_READ },
  { prefix: "/parametres", permission: P.SETTINGS_READ },

  // Ecrans generes par le catalogue de ressources
  // (src/modules/resources/domain/catalog.ts). Toute ressource ajoutee la-bas
  // doit apparaitre ici : sans son prefixe, la page s'affiche brievement avant
  // que le DAL ne la refuse. La permission doit rester celle du catalogue.
  { prefix: "/departements", permission: P.EMPLOYEES_READ },
  { prefix: "/postes", permission: P.EMPLOYEES_READ },
  { prefix: "/regles-commission", permission: P.COMMISSIONS_READ },
  { prefix: "/catalogue-prestations", permission: P.SALES_READ },
  { prefix: "/inscriptions", permission: P.STUDENTS_READ },
  { prefix: "/notes", permission: P.STUDENTS_READ },
  { prefix: "/paiements", permission: P.CASH_READ },
  { prefix: "/depenses", permission: P.ACCOUNTING_READ },
  { prefix: "/recettes", permission: P.ACCOUNTING_READ },
  { prefix: "/mouvements-stock", permission: P.INVENTORY_READ },
  { prefix: "/faq", permission: P.LANDING_READ },
  { prefix: "/modules-vitrine", permission: P.LANDING_READ },
  { prefix: "/arguments-vitrine", permission: P.LANDING_READ },
  { prefix: "/etapes-vitrine", permission: P.LANDING_READ },
];

/** Permission exigee par une URL, ou null si la route est ouverte a tous. */
export function permissionForPath(pathname: string): Permission | null {
  let trouvee: { prefix: string; permission: Permission } | null = null;

  for (const regle of ROUTE_PERMISSIONS) {
    const correspond = pathname === regle.prefix || pathname.startsWith(`${regle.prefix}/`);
    if (correspond && (!trouvee || regle.prefix.length > trouvee.prefix.length)) {
      trouvee = regle;
    }
  }

  return trouvee?.permission ?? null;
}
