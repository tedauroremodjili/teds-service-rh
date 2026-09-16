import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { DocumentCategory, ProductStatus } from "../domain/document-product";

/** Libelles du catalogue de documents (module 7). */
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  ATTESTATION: "Attestation",
  CERTIFICAT: "Certificat",
  DUPLICATA: "Duplicata",
  CARTE_ETUDIANT: "Carte étudiant",
  BADGE: "Badge",
  DOSSIER: "Dossier",
  RELEVE_NOTES: "Relevé de notes",
  SUPPORT_COURS: "Support de cours",
  LIVRE: "Livre",
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DISPONIBLE: "Disponible",
  RUPTURE: "En rupture",
  ARCHIVE: "Archivé",
};

const TONES: Record<ProductStatus, BadgeTone> = {
  DISPONIBLE: "success",
  RUPTURE: "danger",
  ARCHIVE: "neutral",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge tone={TONES[status]}>{PRODUCT_STATUS_LABELS[status]}</Badge>;
}
