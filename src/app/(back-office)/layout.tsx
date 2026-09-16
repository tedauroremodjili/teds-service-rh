import type { ReactNode } from "react";

import { requireAuth } from "@/infrastructure/auth/dal";
import { logoutAction } from "@/modules/auth/presentation/actions";
import { AppShell } from "@/modules/dashboard/presentation/app-shell";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";
import { PageLetterhead } from "@/modules/printing/presentation/page-letterhead";

/**
 * Mise en page commune a tout le back-office.
 *
 * `requireAuth()` s'execute ici, donc avant le rendu de n'importe quelle page
 * du groupe (back-office) : c'est la porte d'entree unique. Une page oubliee
 * reste ainsi protegee.
 *
 * `logoutAction` est une Server Action transmise en prop au composant client.
 * React ne serialise pas la fonction : il envoie une reference que le client
 * appelle via une requete POST. C'est la maniere prevue de declencher du code
 * serveur depuis un bouton client.
 *
 * Le papier a en-tete suit le meme chemin : rendu ici, sur le serveur, ou la
 * lecture des parametres de l'entreprise est possible, puis insere par la
 * coquille au-dessus du contenu. Il ne se voit qu'a l'impression, ce qui donne
 * un emetteur et une date a n'importe quelle page sortie de l'application.
 */
export default async function BackOfficeLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  const company = await getCompanyIdentity();

  return (
    <AppShell
      user={user}
      logoutAction={logoutAction}
      printLetterhead={<PageLetterhead company={company} editedBy={user.displayName} />}
    >
      {children}
    </AppShell>
  );
}
