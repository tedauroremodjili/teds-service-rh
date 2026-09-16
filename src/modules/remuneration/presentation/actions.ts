"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { recordAudit } from "@/infrastructure/auth/audit";
import { authorizeAction } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import { coerceFormData } from "@/shared/lib/form-action";

import { ajouterRegle } from "../application/remuneration-use-cases";
import {
  basculerRegle,
  supprimerRegle,
} from "../infrastructure/prisma-remuneration-repository";

/**
 * Server Actions des baremes de remuneration.
 *
 * Ces actions decident de ce que touchera une personne en fin de mois : elles
 * commencent donc par `authorizeAction`, qui recharge l'utilisateur depuis la
 * base, et se terminent par une entree d'audit.
 */

export interface RegleFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  values?: Record<string, string>;
  success?: boolean;
}

async function clientIp(): Promise<string | null> {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null
  );
}

export async function ajouterRegleAction(
  employeeId: string,
  previousState: RegleFormState,
  formData: FormData,
): Promise<RegleFormState> {
  const user = await authorizeAction(PERMISSIONS.PAYROLL_CALCULATE);
  const champs = coerceFormData(previousState, formData);

  const values: Record<string, string> = {};
  for (const [cle, valeur] of champs.entries()) {
    if (typeof valeur === "string") values[cle] = valeur;
  }

  const resultat = await ajouterRegle({
    employeeId,
    label: values.label ?? "",
    activity: values.activity ?? "",
    mode: values.mode ?? "",
    portee: values.portee,
    rate: values.rate,
    fixedAmount: values.fixedAmount,
    fixedBasis: values.fixedBasis,
    trainingId: values.trainingId,
    trainingCategoryId: values.trainingCategoryId,
    documentProductId: values.documentProductId,
    documentCategory: values.documentCategory,
    serviceId: values.serviceId,
    serviceCategory: values.serviceCategory,
    priority: values.priority,
    startDate: values.startDate,
    endDate: values.endDate,
  });

  if (!resultat.ok) {
    const { error } = resultat;
    return {
      message: error.field ? undefined : error.message,
      fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
      values,
    };
  }

  await recordAudit({
    userId: user.id,
    action: "REMUNERATION_RULE_CREATE",
    entityType: "RemunerationRule",
    entityId: resultat.value,
    after: { employeeId, label: values.label, activite: values.activity },
    ipAddress: await clientIp(),
  });

  revalidatePath(`/employes/${employeeId}/remuneration`);
  return { success: true };
}

export async function supprimerRegleAction(
  employeeId: string,
  ruleId: string,
): Promise<void> {
  const user = await authorizeAction(PERMISSIONS.PAYROLL_CALCULATE);

  await supprimerRegle(ruleId);
  await recordAudit({
    userId: user.id,
    action: "REMUNERATION_RULE_DELETE",
    entityType: "RemunerationRule",
    entityId: ruleId,
    before: { employeeId },
    ipAddress: await clientIp(),
  });

  revalidatePath(`/employes/${employeeId}/remuneration`);
}

export async function basculerRegleAction(
  employeeId: string,
  ruleId: string,
  actif: boolean,
): Promise<void> {
  const user = await authorizeAction(PERMISSIONS.PAYROLL_CALCULATE);

  await basculerRegle(ruleId, actif);
  await recordAudit({
    userId: user.id,
    action: actif ? "REMUNERATION_RULE_ENABLE" : "REMUNERATION_RULE_DISABLE",
    entityType: "RemunerationRule",
    entityId: ruleId,
    after: { employeeId, actif },
    ipAddress: await clientIp(),
  });

  revalidatePath(`/employes/${employeeId}/remuneration`);
}
