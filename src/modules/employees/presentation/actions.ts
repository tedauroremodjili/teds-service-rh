"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authorizeAction } from "@/infrastructure/auth/dal";
import { recordAudit } from "@/infrastructure/auth/audit";
import { hasPermission, PERMISSIONS } from "@/modules/auth/domain/permissions";
import { attacherBaremeInitial } from "@/modules/remuneration/application/remuneration-use-cases";
import { parseBaremeInitial } from "@/modules/remuneration/domain/rule";
import { DomainError, type SerializedDomainError } from "@/shared/domain/errors";
import { coerceFormData } from "@/shared/lib/form-action";

import {
  archiveEmployee,
  createEmployee,
  updateEmployee,
} from "../application/employee-use-cases";
import type { EmployeeInput } from "../domain/employee";
import { prismaEmployeeRepository } from "../infrastructure/prisma-employee-repository";

/**
 * Server Actions du module employees.
 *
 * Rappel de securite : une Server Action est atteignable par une requete POST
 * directe, sans passer par l'interface. Chaque action commence donc par
 * `authorizeAction()`, qui recharge l'utilisateur DEPUIS LA BASE et verifie sa
 * permission. Ne jamais se contenter du fait que le bouton etait affiche.
 */

export interface EmployeeFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Valeurs saisies, renvoyees pour ne pas vider le formulaire en cas d'erreur. */
  values?: Record<string, string>;
}

/** Traduit une erreur du domaine en etat de formulaire. */
function toFormState(
  error: SerializedDomainError,
  values: Record<string, string>,
): EmployeeFormState {
  return {
    message: error.field ? undefined : error.message,
    fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
    values,
  };
}

/** Extrait les champs du formulaire sous la forme attendue par le domaine. */
function readForm(
  previousState: unknown,
  formData: unknown,
): { input: EmployeeInput; values: Record<string, string> } {
  // Avant hydratation, l'action ne recoit que le FormData (voir coerceFormData).
  const champs = coerceFormData(previousState, formData);

  const values: Record<string, string> = {};
  for (const [key, value] of champs.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  return {
    values,
    input: {
      matricule: values.matricule ?? "",
      firstName: values.firstName ?? "",
      lastName: values.lastName ?? "",
      gender: values.gender ?? "",
      birthDate: values.birthDate ?? "",
      birthPlace: values.birthPlace,
      nationality: values.nationality,
      maritalStatus: values.maritalStatus,
      address: values.address,
      phone: values.phone ?? "",
      email: values.email ?? "",
      hireDate: values.hireDate ?? "",
      departmentId: values.departmentId,
      positionId: values.positionId,
      baseSalary: Number(values.baseSalary ?? 0),
      commissionRate: Number(values.commissionRate ?? 0),
      status: values.status,
    },
  };
}

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null
  );
}

export async function createEmployeeAction(
  previousState: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const user = await authorizeAction(PERMISSIONS.EMPLOYEES_CREATE);
  const { input, values } = readForm(previousState, formData);

  // --- Le bareme, AVANT toute ecriture --------------------------------------
  //
  // L'ordre compte. Le bareme est valide en premier, alors que rien n'a encore
  // ete ecrit : une regle fautive fait donc revenir le formulaire intact, sans
  // avoir laisse en base un employe a moitie configure. C'est aussi ce qui rend
  // sur le fait de ne pas ouvrir de transaction entre les deux modules.
  const bareme = parseBaremeInitial(values.bareme);
  if (!bareme.ok) {
    return toFormState(bareme.error.toJSON(), values);
  }

  // Definir ce que touche quelqu'un releve de la paie, pas des RH : un compte
  // qui sait creer une fiche ne fixe pas pour autant les taux. Le formulaire ne
  // montre la section qu'a qui en a le droit, mais une Server Action est
  // joignable par un POST direct — le refus se decide donc ici.
  if (bareme.value.length > 0 && !hasPermission(user.permissions, PERMISSIONS.PAYROLL_CALCULATE)) {
    return toFormState(
      DomainError.businessRule(
        "Vous n'avez pas le droit de définir un barème de rémunération. Créez la fiche sans barème : un gestionnaire de paie le complétera.",
        "BAREME_NON_AUTORISE",
      ).toJSON(),
      values,
    );
  }

  const result = await createEmployee(prismaEmployeeRepository, input);

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  const employeeId = result.value;

  await recordAudit({
    userId: user.id,
    action: "EMPLOYEE_CREATE",
    entityType: "Employee",
    entityId: employeeId,
    after: { matricule: input.matricule, nom: `${input.firstName} ${input.lastName}` },
    ipAddress: await clientIp(),
  });

  // --- Le bareme, une fois la fiche creee -----------------------------------
  const attache = await attacherBaremeInitial(employeeId, bareme.value);

  if (!attache.ok) {
    // La fiche existe : on ne peut plus faire comme si de rien n'etait. On le
    // dit franchement et on laisse l'utilisateur sur place, avec le chemin pour
    // finir le travail — plutot qu'une redirection vers une fiche dont le
    // bareme serait silencieusement vide.
    revalidatePath("/employes");
    return {
      message: `L'employé a bien été créé, mais son barème n'a pas pu être enregistré. ${attache.error.message}`,
      values,
    };
  }

  if (attache.value > 0) {
    await recordAudit({
      userId: user.id,
      action: "REMUNERATION_RULE_CREATE",
      entityType: "Employee",
      entityId: employeeId,
      after: { bareme: `${attache.value} règle(s) posée(s) à la création` },
      ipAddress: await clientIp(),
    });
  }

  // La liste est mise en cache par le routeur : on la marque comme perimee
  // pour que le nouvel employe y apparaisse immediatement.
  revalidatePath("/employes");

  // Un bareme pose merite d'etre relu avec son decompte : on ouvre l'ecran qui
  // le montre, plutot que la fiche d'identite qui n'en dit rien.
  redirect(
    attache.value > 0 ? `/employes/${employeeId}/remuneration` : `/employes/${employeeId}`,
  );
}

export async function updateEmployeeAction(
  employeeId: string,
  previousState: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const user = await authorizeAction(PERMISSIONS.EMPLOYEES_UPDATE);
  const { input, values } = readForm(previousState, formData);

  const avant = await prismaEmployeeRepository.findById(employeeId);
  const result = await updateEmployee(prismaEmployeeRepository, employeeId, input);

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: user.id,
    action: "EMPLOYEE_UPDATE",
    entityType: "Employee",
    entityId: employeeId,
    before: avant ? { matricule: avant.matricule, salaire: avant.baseSalary } : undefined,
    after: { matricule: input.matricule, salaire: input.baseSalary },
    ipAddress: await clientIp(),
  });

  revalidatePath("/employes");
  revalidatePath(`/employes/${employeeId}`);
  redirect(`/employes/${employeeId}`);
}

export interface ArchiveEmployeeFormState {
  message?: string;
  tone?: "success" | "danger";
}

/**
 * Archive une fiche : elle sort des listes et ne peut plus etre embauchee a
 * nouveau sans nouvelle fiche. L'identifiant voyage dans le formulaire, pour
 * que le bouton fonctionne aussi sans JavaScript — meme convention que
 * `archiveUserAction` (module users) et `removeResourceAction` (moteur de
 * ressources).
 */
export async function archiveEmployeeAction(
  _previousState: ArchiveEmployeeFormState,
  formData: FormData,
): Promise<ArchiveEmployeeFormState> {
  const user = await authorizeAction(PERMISSIONS.EMPLOYEES_DELETE);

  const employeeId = String(formData.get("id") ?? "");
  if (!employeeId) {
    return { message: "Employé introuvable.", tone: "danger" };
  }

  const result = await archiveEmployee(prismaEmployeeRepository, employeeId);
  if (!result.ok) {
    return { message: result.error.message, tone: "danger" };
  }

  await recordAudit({
    userId: user.id,
    action: "EMPLOYEE_ARCHIVE",
    entityType: "Employee",
    entityId: employeeId,
    ipAddress: await clientIp(),
  });

  revalidatePath("/employes");
  redirect("/employes");
}
