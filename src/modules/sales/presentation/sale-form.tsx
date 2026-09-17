"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import type { SellableProductOption } from "@/modules/documents/infrastructure/product-queries";
import type { StudentOption } from "@/modules/students/infrastructure/student-queries";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/form";

import { SALE_STATUSES, type SaleStatus } from "../domain/sale";
import { createSaleAction, type SaleFormState } from "./actions";
import { SaleCart } from "./sale-cart";
import { SALE_STATUS_LABELS } from "./sale-badges";

/** Date/heure locale au format attendu par `<input type="datetime-local">`. */
function maintenant(): string {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function SaleForm({
  products,
  students,
  cancelHref = "/ventes",
}: {
  products: SellableProductOption[];
  students: StudentOption[];
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<SaleFormState, FormData>(createSaleAction, {});

  const erreur = (nom: string) => state.fieldErrors?.[nom];

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <Card>
        <CardHeader
          title="Client"
          description="Un apprenant enregistré, ou au moins le nom d'un client de passage."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Apprenant" htmlFor="studentId" error={erreur("studentId")}>
            <Select id="studentId" name="studentId" defaultValue={state.values?.studentId ?? ""}>
              <option value="">— Aucun / client de passage —</option>
              {students.map((etudiant) => (
                <option key={etudiant.id} value={etudiant.id}>
                  {etudiant.label}
                </option>
              ))}
            </Select>
          </Field>

          <div />

          <Field
            label="Nom du client"
            htmlFor="customerName"
            error={erreur("customerName")}
            hint="Requis si aucun apprenant n'est choisi."
          >
            <Input
              id="customerName"
              name="customerName"
              defaultValue={state.values?.customerName}
              hasError={Boolean(erreur("customerName"))}
            />
          </Field>

          <Field label="Téléphone du client" htmlFor="customerPhone">
            <Input id="customerPhone" name="customerPhone" defaultValue={state.values?.customerPhone} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Documents vendus"
          icon={<ShoppingCart className="size-4.5" />}
          description="Choisis dans le catalogue déjà configuré — prix rempli automatiquement."
        />
        <CardBody>
          <SaleCart products={products} erreur={erreur("lines")?.[0]} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Conditions de la vente" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Remise" htmlFor="discount" error={erreur("discount")}>
            <Input
              id="discount"
              name="discount"
              type="number"
              min={0}
              step="any"
              defaultValue={state.values?.discount ?? "0"}
            />
          </Field>

          <Field label="Taxe" htmlFor="taxAmount">
            <Input
              id="taxAmount"
              name="taxAmount"
              type="number"
              min={0}
              step="any"
              defaultValue={state.values?.taxAmount ?? "0"}
            />
          </Field>

          <Field label="Déjà payé" htmlFor="paidAmount" hint="Si un acompte a déjà été encaissé.">
            <Input
              id="paidAmount"
              name="paidAmount"
              type="number"
              min={0}
              step="any"
              defaultValue={state.values?.paidAmount ?? "0"}
            />
          </Field>

          <Field label="Statut" htmlFor="status">
            <Select id="status" name="status" defaultValue={state.values?.status ?? "BROUILLON"}>
              {SALE_STATUSES.map((statut: SaleStatus) => (
                <option key={statut} value={statut}>
                  {SALE_STATUS_LABELS[statut]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Vendue le" htmlFor="soldAt" className="sm:col-span-2">
            <Input
              id="soldAt"
              name="soldAt"
              type="datetime-local"
              defaultValue={state.values?.soldAt ?? maintenant()}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la vente"}
        </Button>
        <Link href={cancelHref} className="text-sm font-medium text-surface-600 hover:text-primary-700">
          Annuler
        </Link>
      </div>
    </form>
  );
}
