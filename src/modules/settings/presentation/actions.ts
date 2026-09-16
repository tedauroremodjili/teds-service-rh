"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { recordAudit } from "@/infrastructure/auth/audit";
import { authorizeAction } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";

import { updateSettings } from "../application/settings-use-cases";
import { prismaSettingsRepository } from "../infrastructure/prisma-settings-repository";

/**
 * Server Action du module 17.
 *
 * Les parametres decident de ce qui s'imprime sur les factures et de la facon
 * dont la paie calcule : les modifier exige `settings.manage`, et chaque
 * changement laisse une trace nominative.
 */

export interface SettingsFormState {
  message?: string;
  tone?: "success" | "danger";
  fieldErrors?: Record<string, string[]>;
}

export async function updateSettingsAction(
  _previousState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const actor = await authorizeAction(PERMISSIONS.SETTINGS_MANAGE);

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  const result = await updateSettings(prismaSettingsRepository, values);

  if (!result.ok) {
    const error = result.error.toJSON();
    return {
      message: error.field ? `${error.message}` : error.message,
      tone: "danger",
      fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
    };
  }

  const { changed } = result.value;

  if (changed.length === 0) {
    return { message: "Aucun changement : les valeurs étaient déjà celles-là.", tone: "success" };
  }

  const headerList = await headers();

  await recordAudit({
    userId: actor.id,
    action: "SETTINGS_UPDATE",
    entityType: "Setting",
    after: { modifies: changed },
    ipAddress:
      headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerList.get("x-real-ip") ??
      null,
  });

  // L'identite de l'entreprise apparait sur les documents imprimes : on marque
  // tout le back-office comme perime plutot que la seule page des parametres.
  revalidatePath("/", "layout");

  return {
    message: `${changed.length} paramètre${changed.length > 1 ? "s" : ""} enregistré${changed.length > 1 ? "s" : ""}.`,
    tone: "success",
  };
}
