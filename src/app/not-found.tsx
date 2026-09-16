import { FileQuestion } from "lucide-react";

import { LinkButton } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-100 px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <FileQuestion className="size-7" />
        </span>

        <h1 className="mt-5 text-xl font-bold text-primary-900">Page introuvable</h1>
        <p className="mt-2 text-sm text-surface-500">
          La page demandée n&apos;existe pas, ou la fiche recherchée a été supprimée.
        </p>

        <div className="mt-6 flex justify-center">
          <LinkButton href="/tableau-de-bord">Retour au tableau de bord</LinkButton>
        </div>
      </div>
    </main>
  );
}
