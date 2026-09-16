/**
 * Verification des regles metier du module employees, contre la vraie base.
 * Lancement : node --env-file=.env --conditions=react-server --import tsx scripts/employees-smoke.ts
 */
import {
  archiveEmployee,
  createEmployee,
  suggestMatricule,
  updateEmployee,
} from "@/modules/employees/application/employee-use-cases";
import { prismaEmployeeRepository as repo } from "@/modules/employees/infrastructure/prisma-employee-repository";
import { Employee } from "@/modules/employees/domain/employee";
import { Money } from "@/shared/domain/money";

/**
 * Affiche le resultat attendu.
 * `attendu: "rejet"` signifie que l'operation DOIT echouer : c'est la regle
 * metier qui joue son role.
 */
function ligne(
  titre: string,
  resultat: { ok: boolean; error?: { code: string; message: string } },
  attendu: "succes" | "rejet" = "succes",
) {
  const conforme = attendu === "succes" ? resultat.ok : !resultat.ok;
  const marque = conforme ? "OK  " : "ÉCHEC";
  console.log(`${marque} ${titre}`);
  if (resultat.error) {
    console.log(`      → ${resultat.error.code} : ${resultat.error.message}`);
  }
}

const base = {
  firstName: "Test",
  lastName: "Candidat",
  gender: "MASCULIN",
  birthDate: "1998-05-20",
  phone: "+242 06 111 22 33",
  hireDate: "2026-01-05",
  baseSalary: 275_000,
  commissionRate: 12,
};

async function main() {
  // Les fiches archivees conservent leur email : un identifiant propre a
  // l'execution permet de relancer ce script autant de fois que necessaire.
  const emailDeTest = `test.candidat.${Date.now()}@tedsservice.cg`;
  const matricule = await suggestMatricule(repo);
  console.log(`Prochain matricule proposé : ${matricule}\n`);

  console.log("--- Règles de validation (aucune écriture attendue) ---");
  ligne(
    "matricule mal formé refusé",
    await createEmployee(repo, { ...base, matricule: "XYZ1", email: "a@b.cg" }),
    "rejet",
  );
  ligne(
    "salaire négatif refusé",
    await createEmployee(repo, { ...base, matricule, email: "a@b.cg", baseSalary: -1 }),
    "rejet",
  );
  ligne(
    "taux de commission > 100 refusé",
    await createEmployee(repo, { ...base, matricule, email: "a@b.cg", commissionRate: 150 }),
    "rejet",
  );
  ligne(
    "embauche avant 16 ans refusée",
    await createEmployee(repo, { ...base, matricule, email: "a@b.cg", birthDate: "2015-01-01" }),
    "rejet",
  );
  ligne(
    "email déjà utilisé refusé",
    await createEmployee(repo, { ...base, matricule, email: "rh@tedsservice.cg" }),
    "rejet",
  );
  ligne(
    "matricule déjà attribué refusé",
    await createEmployee(repo, { ...base, matricule: "TSS-0002", email: "nouveau@tedsservice.cg" }),
    "rejet",
  );

  console.log("\n--- Cycle de vie complet ---");
  const creation = await createEmployee(repo, {
    ...base,
    matricule,
    email: emailDeTest,
  });
  ligne("création valide", creation);
  if (!creation.ok) return;

  const id = creation.value;
  const maj = await updateEmployee(repo, id, {
    ...base,
    matricule,
    email: emailDeTest,
    baseSalary: 320_000,
    commissionRate: 15,
  });
  ligne("modification (salaire 275 000 -> 320 000)", maj);

  const relu = await repo.findById(id);
  console.log(
    `     relu en base : ${relu?.baseSalary} FCFA, commission ${relu?.commissionRate} %`,
  );

  ligne("archivage", await archiveEmployee(repo, id));
  console.log(`     visible après archivage : ${(await repo.findById(id)) ? "oui" : "non"}`);

  console.log("\n--- Salaire nul (employé rémunéré uniquement au barème) ---");
  const matriculeBareme = await suggestMatricule(repo);
  const creationBareme = await createEmployee(repo, {
    ...base,
    matricule: matriculeBareme,
    email: `test.bareme.${Date.now()}@tedsservice.cg`,
    baseSalary: 0,
  });
  ligne("salaire nul accepté (rémunération 100 % au barème)", creationBareme);
  if (creationBareme.ok) {
    await archiveEmployee(repo, creationBareme.value);
  }

  console.log("\n--- Calcul de commission (exemple du cahier des charges) ---");
  const agent = Employee.create({ ...base, matricule: "TSS-9999", email: "x@y.cg", commissionRate: 10 });
  if (agent.ok) {
    const vente = Money.create(300_000);
    if (vente.ok) {
      console.log(`     vente ${vente.value.format()} à 10 % => ${agent.value.commissionOn(vente.value).format()}`);
    }
  }
  const vendeur = Employee.create({ ...base, matricule: "TSS-9998", email: "z@y.cg", commissionRate: 20 });
  if (vendeur.ok) {
    const doc = Money.create(15_000);
    if (doc.ok) {
      console.log(`     vente ${doc.value.format()} à 20 % => ${vendeur.value.commissionOn(doc.value).format()}`);
    }
  }
}

main().then(() => process.exit(0));
