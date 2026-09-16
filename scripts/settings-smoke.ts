/**
 * Verification manuelle des parametres du systeme (module 17).
 * Lancement :
 *   node --env-file=.env --import tsx --conditions=react-server scripts/settings-smoke.ts
 *
 * Le script repose l'etat initial : il peut etre relance.
 */
import {
  getEditableSettings,
  updateSettings,
} from "@/modules/settings/application/settings-use-cases";
import { prismaSettingsRepository as repo } from "@/modules/settings/infrastructure/prisma-settings-repository";
import { getCompanyIdentity } from "@/modules/printing/infrastructure/company-queries";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env");
}

/** Valeurs courantes, aplaties par clé. */
async function valeurs(): Promise<Record<string, string>> {
  const groupes = await getEditableSettings(repo);
  return Object.fromEntries(
    groupes.flatMap((groupe) => groupe.settings.map((setting) => [setting.key, setting.value])),
  );
}

async function main() {
  console.log("— Écran des paramètres —");

  const groupes = await getEditableSettings(repo);
  for (const groupe of groupes) {
    console.log(`     ${groupe.category.padEnd(10)} ${groupe.settings.length} réglage(s)`);
  }

  const total = groupes.reduce((somme, groupe) => somme + groupe.settings.length, 0);
  console.log(`OK   ${total} paramètres modifiables, ${groupes.length} catégories.`);

  const avant = await valeurs();
  console.log(
    `     email actuel : ${avant["company.email"]} — téléphone : ${avant["company.phone"]}`,
  );

  // 1. Modification de l'email et du téléphone : le cas demandé.
  const modification = await updateSettings(repo, {
    ...avant,
    "company.email": "nouveau@tedsservice.cg",
    "company.phone": "+242 06 111 22 33",
  });

  console.log(
    modification.ok
      ? `OK   enregistré : ${modification.value.changed.join(", ")}`
      : `KO   ${modification.error.message}`,
  );

  // 2. Les documents imprimés doivent voir la nouvelle valeur.
  const entreprise = await getCompanyIdentity();
  console.log(
    entreprise.email === "nouveau@tedsservice.cg" && entreprise.phone === "+242 06 111 22 33"
      ? "OK   l'en-tête des documents reprend les nouvelles coordonnées."
      : `KO   en-tête inchangé : ${entreprise.email} / ${entreprise.phone}`,
  );

  // 3. Un enregistrement sans changement ne doit rien écrire.
  const inchange = await updateSettings(repo, await valeurs());
  console.log(
    inchange.ok && inchange.value.changed.length === 0
      ? "OK   enregistrement sans changement : aucune écriture."
      : "KO   des écritures inutiles ont eu lieu.",
  );

  // 4. Les saisies invalides sont refusées, champ par champ.
  const refus = [
    ["company.email", "pas-un-email"],
    ["finance.vatRate", "150"],
    ["company.website", "tedsservice.cg"],
    ["hr.workDayStart", "8h"],
  ] as const;

  for (const [cle, valeur] of refus) {
    const essai = await updateSettings(repo, { ...(await valeurs()), [cle]: valeur });
    console.log(
      essai.ok
        ? `KO   « ${valeur} » accepté pour ${cle}.`
        : `OK   ${cle} refusé : ${essai.error.message}`,
    );
  }

  // 5. Remise à l'état initial.
  const retour = await updateSettings(repo, avant);
  console.log(retour.ok ? "OK   état initial rétabli." : `KO   ${retour.error.message}`);

  const final = await valeurs();
  console.log(
    `     email : ${final["company.email"]} — téléphone : ${final["company.phone"]}`,
  );
}

main().then(() => process.exit(0));
