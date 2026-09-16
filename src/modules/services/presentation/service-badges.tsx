import { Badge, type BadgeTone } from "@/shared/ui/badge";

import type { ServiceCategory, ServiceOrderStatus } from "../domain/service";

/** Libelles des prestations (module 10). */
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  DEVELOPPEMENT_WEB: "Développement web",
  DEVELOPPEMENT_MOBILE: "Développement mobile",
  MAINTENANCE: "Maintenance",
  INSTALLATION_WINDOWS: "Installation Windows",
  INSTALLATION_LOGICIELS: "Installation de logiciels",
  GRAPHISME: "Graphisme",
  CREATION_LOGO: "Création de logo",
  CREATION_SITE: "Création de site",
  CREATION_APPLICATION: "Création d'application",
  AUTRE: "Autre",
};

export const SERVICE_ORDER_STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  DEVIS: "Devis",
  CONFIRMEE: "Confirmée",
  EN_COURS: "En cours",
  LIVREE: "Livrée",
  FACTUREE: "Facturée",
  ANNULEE: "Annulée",
};

const TONES: Record<ServiceOrderStatus, BadgeTone> = {
  DEVIS: "neutral",
  CONFIRMEE: "info",
  EN_COURS: "primary",
  LIVREE: "accent",
  FACTUREE: "success",
  ANNULEE: "danger",
};

export function ServiceOrderStatusBadge({ status }: { status: ServiceOrderStatus }) {
  return <Badge tone={TONES[status]}>{SERVICE_ORDER_STATUS_LABELS[status]}</Badge>;
}
