"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { SellableProductOption } from "@/modules/documents/infrastructure/product-queries";
import { formatMoney } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Alert } from "@/shared/ui/feedback";
import { Field, Input, Select } from "@/shared/ui/form";

import { MAX_LINE_QUANTITY, MAX_SALE_LINES } from "../domain/sale";

/** Une ligne du panier, telle que gardee en etat local avant l'envoi. */
interface CartLine {
  productId: string;
  quantity: number;
}

/**
 * Panier de vente : choisir un document deja configure, avec sa quantite, et
 * l'empiler dans la liste des lignes de la vente en cours.
 *
 * Composant CLIENT, sur le meme principe que `BaremeInitial` (module
 * remuneration) : les lignes s'accumulent en etat local, puis partent
 * serialisees dans un champ cache que la Server Action revalide integralement
 * — le prix affiche ici n'est qu'un aperçu, jamais ce qui est ecrit en base.
 */
export function SaleCart({
  products,
  erreur,
}: {
  products: SellableProductOption[];
  erreur?: string;
}) {
  const [lignes, setLignes] = useState<CartLine[]>([]);
  const [productId, setProductId] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [probleme, setProbleme] = useState<string | null>(null);

  const parId = useMemo(() => new Map(products.map((produit) => [produit.id, produit])), [products]);
  const produitChoisi = productId ? parId.get(productId) : undefined;

  function ajouter() {
    if (!productId) {
      setProbleme("Choisissez un document.");
      return;
    }

    const nombreQuantite = Number(quantite);
    if (!Number.isInteger(nombreQuantite) || nombreQuantite < 1) {
      setProbleme("Indiquez une quantité d'au moins 1.");
      return;
    }
    if (nombreQuantite > MAX_LINE_QUANTITY) {
      setProbleme(`La quantité ne peut pas dépasser ${MAX_LINE_QUANTITY}.`);
      return;
    }

    // Le stock n'est qu'un reperage : la verite reste celle relue par le
    // serveur au moment de l'ecriture, qui peut avoir change depuis.
    const dejaDansLePanier = lignes
      .filter((ligne) => ligne.productId === productId)
      .reduce((total, ligne) => total + ligne.quantity, 0);
    if (produitChoisi?.stock !== null && produitChoisi?.stock !== undefined) {
      if (dejaDansLePanier + nombreQuantite > produitChoisi.stock) {
        setProbleme(
          `Stock insuffisant pour « ${produitChoisi.name} » : ${produitChoisi.stock} restant(s).`,
        );
        return;
      }
    }

    setLignes((precedentes) => {
      const index = precedentes.findIndex((ligne) => ligne.productId === productId);
      if (index === -1) return [...precedentes, { productId, quantity: nombreQuantite }];

      const copie = [...precedentes];
      copie[index] = { ...copie[index], quantity: copie[index].quantity + nombreQuantite };
      return copie;
    });

    setProductId("");
    setQuantite("1");
    setProbleme(null);
  }

  const sousTotal = lignes.reduce((total, ligne) => {
    const prix = parId.get(ligne.productId)?.price ?? 0;
    return total + prix * ligne.quantity;
  }, 0);

  const plein = lignes.length >= MAX_SALE_LINES;

  return (
    <div className="space-y-4">
      {/* Le champ que lit la Server Action. */}
      <input type="hidden" name="lines" value={JSON.stringify(lignes)} />

      {erreur ? <Alert tone="danger">{erreur}</Alert> : null}
      {probleme ? <Alert tone="danger">{probleme}</Alert> : null}

      {lignes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-surface-300 px-4 py-6 text-center text-sm text-surface-500">
          Aucun document dans le panier pour l&apos;instant.
        </p>
      ) : (
        <ul className="divide-y divide-surface-100 rounded-lg border border-surface-200">
          {lignes.map((ligne) => {
            const produit = parId.get(ligne.productId);
            const total = (produit?.price ?? 0) * ligne.quantity;

            return (
              <li key={ligne.productId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-800">
                    {produit?.name ?? "Document"}
                  </p>
                  <p className="text-xs text-surface-500">
                    {ligne.quantity} × {formatMoney(produit?.price ?? 0)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-primary-900">{formatMoney(total)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLignes((precedentes) =>
                        precedentes.filter((autre) => autre.productId !== ligne.productId),
                      )
                    }
                    aria-label={`Retirer « ${produit?.name ?? "ce document"} »`}
                    title="Retirer du panier"
                    className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
          <li className="flex items-center justify-between px-4 py-2.5 bg-surface-50">
            <span className="text-sm font-medium text-surface-600">Sous-total</span>
            <span className="text-sm font-semibold text-primary-900">{formatMoney(sousTotal)}</span>
          </li>
        </ul>
      )}

      <div className="grid gap-3 rounded-lg border border-surface-200 bg-surface-50/60 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Document" htmlFor="cart-product">
          <Select
            id="cart-product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={plein}
          >
            <option value="">— Choisir un document —</option>
            {products.map((produit) => (
              <option key={produit.id} value={produit.id}>
                {produit.name} — {formatMoney(produit.price)}
                {produit.stock !== null ? ` (${produit.stock} en stock)` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Quantité" htmlFor="cart-quantity">
          <Input
            id="cart-quantity"
            type="number"
            min={1}
            max={MAX_LINE_QUANTITY}
            step={1}
            value={quantite}
            onChange={(event) => setQuantite(event.target.value)}
            disabled={plein}
            className="w-24"
          />
        </Field>

        <Button type="button" onClick={ajouter} disabled={plein}>
          <Plus className="size-4" />
          Ajouter
        </Button>
      </div>

      {plein ? (
        <p className="text-xs text-surface-500">
          Limite de {MAX_SALE_LINES} lignes atteinte pour cette vente.
        </p>
      ) : null}
    </div>
  );
}
