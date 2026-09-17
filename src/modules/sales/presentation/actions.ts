"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { recordAudit } from "@/infrastructure/auth/audit";
import { authorizeAction } from "@/infrastructure/auth/dal";
import { PERMISSIONS } from "@/modules/auth/domain/permissions";
import type { SerializedDomainError } from "@/shared/domain/errors";
import { coerceFormData } from "@/shared/lib/form-action";

import { createSale } from "../application/sale-use-cases";
import { parseSaleLines, type SaleStatus } from "../domain/sale";
import { prismaSaleRepository } from "../infrastructure/prisma-sale-repository";

/**
 * Server Action de creation d'une vente.
 *
 * Ecran dedie plutot que le moteur generique de ressources : une vente porte
 * plusieurs lignes (documents + quantites), que le moteur generique ne sait
 * pas ecrire (une ressource = un seul enregistrement plat). Le reste suit la
 * meme discipline que les autres Server Actions de l'app : la permission est
 * revuerifiee ici, jamais supposee du fait que le formulaire etait affiche.
 */

export interface SaleFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Valeurs saisies, renvoyees pour ne pas vider le formulaire en cas d'erreur. */
  values?: Record<string, string>;
}

function toFormState(
  error: SerializedDomainError,
  values: Record<string, string>,
): SaleFormState {
  return {
    message: error.field ? undefined : error.message,
    fieldErrors: error.field ? { [error.field]: [error.message] } : undefined,
    values,
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

export async function createSaleAction(
  previousState: SaleFormState,
  formData: FormData,
): Promise<SaleFormState> {
  const user = await authorizeAction(PERMISSIONS.SALES_CREATE);

  const champs = coerceFormData(previousState, formData);
  const values: Record<string, string> = {};
  for (const [key, value] of champs.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  const lignes = parseSaleLines(values.lines);
  if (!lignes.ok) {
    return toFormState(lignes.error.toJSON(), values);
  }

  const soldAt = values.soldAt ? new Date(values.soldAt) : new Date();

  const result = await createSale(prismaSaleRepository, {
    studentId: values.studentId || null,
    customerName: values.customerName?.trim() || null,
    customerPhone: values.customerPhone?.trim() || null,
    discount: Number(values.discount || 0),
    taxAmount: Number(values.taxAmount || 0),
    paidAmount: Number(values.paidAmount || 0),
    status: (values.status || "BROUILLON") as SaleStatus,
    soldAt,
    lines: lignes.value,
  });

  if (!result.ok) {
    return toFormState(result.error.toJSON(), values);
  }

  await recordAudit({
    userId: user.id,
    action: "DOCUMENT_SALE_CREATE",
    entityType: "DocumentSale",
    entityId: result.value.id,
    after: { reference: result.value.reference, lignes: lignes.value.length },
    ipAddress: await clientIp(),
  });

  revalidatePath("/ventes");
  redirect(`/ventes/${result.value.id}`);
}
