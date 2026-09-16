import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { formatPeriod } from "@/shared/lib/format";

/**
 * Lectures dediees aux pieces imprimees.
 *
 * Une fiche d'ecran affiche les colonnes d'une table ; une piece imprimee a
 * besoin de son contexte complet — l'employe et son poste sur un bulletin, les
 * lignes et le vendeur sur une facture, la formation sur un certificat. D'ou ces
 * requetes propres, plutot qu'un elargissement du moteur generique qui ferait
 * payer ces jointures a tous les ecrans.
 *
 * Toutes les valeurs qui sortent d'ici sont serialisables : les `Decimal` de
 * Prisma deviennent des `number` et les `Date` des chaines ISO, avant la
 * frontiere serveur/client (regle 4 du projet).
 */

/** Un `Decimal` Prisma ramene a un nombre, sans jamais rendre NaN. */
function nombre(valeur: unknown): number {
  if (valeur === null || valeur === undefined) return 0;
  const converti = Number(typeof valeur === "number" ? valeur : String(valeur));
  return Number.isFinite(converti) ? converti : 0;
}

function iso(valeur: Date | null | undefined): string | null {
  return valeur ? valeur.toISOString() : null;
}

function nomComplet(personne: { firstName: string; lastName: string } | null): string | null {
  return personne ? `${personne.lastName.toUpperCase()} ${personne.firstName}` : null;
}

/* -------------------------------------------------------------------------- */
/* Bulletin de paie                                                            */
/* -------------------------------------------------------------------------- */

export interface PayslipLine {
  label: string;
  /** Quantite (nombre d'heures supplementaires, par exemple). */
  quantity: number | null;
  amount: number;
}

export interface PayslipData {
  reference: string;
  periode: string;
  year: number;
  month: number;
  status: string;
  validatedAt: string | null;
  paidAt: string | null;
  employee: {
    matricule: string;
    fullName: string;
    hireDate: string;
    department: string | null;
    position: string | null;
    address: string | null;
    phone: string;
    email: string;
  };
  gains: PayslipLine[];
  retenues: PayslipLine[];
  /** Lignes saisies sur le bulletin, quand le module dedie en a produit. */
  detail: Array<PayslipLine & { type: string; notes: string | null }>;
  totals: {
    gross: number;
    deductions: number;
    net: number;
  };
}

/** Bulletin de paie complet : employe, poste, rubriques et totaux. */
export async function getPayslip(id: string): Promise<PayslipData | null> {
  const bulletin = await prisma.payroll.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!bulletin) return null;

  // Les rubriques viennent des colonnes de totaux, seules garantes du brut et
  // du net (elles sont calculees par `applyComputations`). Les lignes detaillees
  // sont affichees a part, en information : les additionner ici ferait courir le
  // risque d'un bulletin dont le net ne correspond pas a ses rubriques.
  const gains: PayslipLine[] = [
    { label: "Salaire de base", quantity: null, amount: nombre(bulletin.baseSalary) },
    { label: "Primes", quantity: null, amount: nombre(bulletin.totalBonuses) },
    { label: "Commissions", quantity: null, amount: nombre(bulletin.totalCommissions) },
    {
      label: "Heures supplémentaires",
      quantity: null,
      amount: nombre(bulletin.totalOvertime),
    },
  ].filter((ligne, index) => index === 0 || ligne.amount !== 0);

  const retenues: PayslipLine[] = [
    { label: "Retenues (cotisations, impôts)", quantity: null, amount: nombre(bulletin.totalDeductions) },
    { label: "Avances sur salaire", quantity: null, amount: nombre(bulletin.totalAdvances) },
  ].filter((ligne) => ligne.amount !== 0);

  return {
    reference: bulletin.reference,
    periode: formatPeriod(bulletin.year, bulletin.month),
    year: bulletin.year,
    month: bulletin.month,
    status: bulletin.status,
    validatedAt: iso(bulletin.validatedAt),
    paidAt: iso(bulletin.paidAt),
    employee: {
      matricule: bulletin.employee.matricule,
      fullName: `${bulletin.employee.lastName.toUpperCase()} ${bulletin.employee.firstName}`,
      hireDate: bulletin.employee.hireDate.toISOString(),
      department: bulletin.employee.department?.name ?? null,
      position: bulletin.employee.position?.title ?? null,
      address: bulletin.employee.address,
      phone: bulletin.employee.phone,
      email: bulletin.employee.email,
    },
    gains,
    retenues,
    detail: bulletin.items.map((ligne) => ({
      type: ligne.type,
      label: ligne.label,
      quantity: ligne.quantity === null ? null : nombre(ligne.quantity),
      amount: nombre(ligne.amount),
      notes: ligne.notes,
    })),
    totals: {
      gross: nombre(bulletin.grossSalary),
      deductions: nombre(bulletin.totalDeductions) + nombre(bulletin.totalAdvances),
      net: nombre(bulletin.netSalary),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Facture (vente, prestation, inscription)                                    */
/* -------------------------------------------------------------------------- */

export interface InvoiceLine {
  designation: string;
  details: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoicePayment {
  reference: string;
  paidAt: string;
  method: string;
  amount: number;
}

export interface InvoiceData {
  /** Numero de facture officiel s'il en a ete emis un, sinon la reference. */
  number: string;
  reference: string;
  issuedAt: string;
  dueDate: string | null;
  status: string;
  customer: { name: string; phone: string | null; email: string | null; matricule: string | null };
  seller: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  payments: InvoicePayment[];
}

function toPayments(
  paiements: Array<{ reference: string; paidAt: Date; method: string; amount: unknown }>,
): InvoicePayment[] {
  return paiements.map((paiement) => ({
    reference: paiement.reference,
    paidAt: paiement.paidAt.toISOString(),
    method: paiement.method,
    amount: nombre(paiement.amount),
  }));
}

/** Le solde d'une piece annulee est nul : le remboursement se traite a part. */
function solde(total: number, paye: number, statut: string): number {
  if (statut === "ANNULEE" || statut === "ANNULE") return 0;
  return Math.max(0, total - paye);
}

/** Facture d'une vente de documents. */
export async function getSaleInvoice(id: string): Promise<InvoiceData | null> {
  const vente = await prisma.documentSale.findUnique({
    where: { id },
    include: {
      seller: { select: { firstName: true, lastName: true } },
      student: { select: { firstName: true, lastName: true, matricule: true, phone: true, email: true } },
      lines: { include: { product: { select: { name: true, code: true } } } },
      payments: { where: { status: "CONFIRME" }, orderBy: { paidAt: "asc" } },
      invoice: { select: { number: true, issuedAt: true, dueDate: true } },
    },
  });

  if (!vente) return null;

  const total = nombre(vente.totalAmount);
  const paye = nombre(vente.paidAmount);

  return {
    number: vente.invoice?.number ?? vente.reference,
    reference: vente.reference,
    issuedAt: (vente.invoice?.issuedAt ?? vente.soldAt).toISOString(),
    dueDate: iso(vente.invoice?.dueDate ?? null),
    status: vente.status,
    customer: {
      name: nomComplet(vente.student) ?? vente.customerName ?? "Client de passage",
      phone: vente.student?.phone ?? vente.customerPhone,
      email: vente.student?.email ?? null,
      matricule: vente.student?.matricule ?? null,
    },
    seller: nomComplet(vente.seller),
    lines: vente.lines.map((ligne) => ({
      designation: ligne.product.name,
      details: ligne.product.code,
      quantity: ligne.quantity,
      unitPrice: nombre(ligne.unitPrice),
      total: nombre(ligne.lineTotal),
    })),
    subtotal: nombre(vente.subtotal),
    discount: nombre(vente.discount),
    tax: nombre(vente.taxAmount),
    total,
    paid: paye,
    balance: solde(total, paye, vente.status),
    payments: toPayments(vente.payments),
  };
}

/** Facture d'une commande de prestation. */
export async function getServiceInvoice(id: string): Promise<InvoiceData | null> {
  const commande = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      service: { select: { name: true, code: true } },
      seller: { select: { firstName: true, lastName: true } },
      student: { select: { matricule: true } },
      payments: { where: { status: "CONFIRME" }, orderBy: { paidAt: "asc" } },
      invoice: { select: { number: true, issuedAt: true, dueDate: true } },
    },
  });

  if (!commande) return null;

  const total = nombre(commande.amount);
  const paye = nombre(commande.paidAmount);

  return {
    number: commande.invoice?.number ?? commande.reference,
    reference: commande.reference,
    issuedAt: (commande.invoice?.issuedAt ?? commande.orderedAt).toISOString(),
    dueDate: iso(commande.invoice?.dueDate ?? commande.deliveredAt),
    status: commande.status,
    customer: {
      name: commande.customerName,
      phone: commande.customerPhone,
      email: commande.customerEmail,
      matricule: commande.student?.matricule ?? null,
    },
    seller: nomComplet(commande.seller),
    lines: [
      {
        designation: commande.service.name,
        details: commande.description ?? commande.service.code,
        quantity: 1,
        unitPrice: total,
        total,
      },
    ],
    subtotal: total,
    discount: 0,
    tax: 0,
    total,
    paid: paye,
    balance: solde(total, paye, commande.status),
    payments: toPayments(commande.payments),
  };
}

/** Avis d'inscription a une formation. */
export async function getRegistrationInvoice(id: string): Promise<InvoiceData | null> {
  const inscription = await prisma.studentRegistration.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true, matricule: true, phone: true, email: true } },
      training: { select: { title: true, code: true, durationHours: true } },
      seller: { select: { firstName: true, lastName: true } },
      payments: { where: { status: "CONFIRME" }, orderBy: { paidAt: "asc" } },
      invoice: { select: { number: true, issuedAt: true, dueDate: true } },
    },
  });

  if (!inscription) return null;

  const brut = nombre(inscription.agreedAmount);
  const remise = nombre(inscription.discount);
  const total = Math.max(0, brut - remise);
  const paye = nombre(inscription.paidAmount);

  return {
    number: inscription.invoice?.number ?? inscription.reference,
    reference: inscription.reference,
    issuedAt: (inscription.invoice?.issuedAt ?? inscription.registeredAt).toISOString(),
    dueDate: iso(inscription.invoice?.dueDate ?? null),
    status: inscription.status,
    customer: {
      name: nomComplet(inscription.student) ?? "Apprenant",
      phone: inscription.student.phone,
      email: inscription.student.email,
      matricule: inscription.student.matricule,
    },
    seller: nomComplet(inscription.seller),
    lines: [
      {
        designation: inscription.training.title,
        details: `${inscription.training.code} — ${inscription.training.durationHours} h de formation`,
        quantity: 1,
        unitPrice: brut,
        total: brut,
      },
    ],
    subtotal: brut,
    discount: remise,
    tax: 0,
    total,
    paid: paye,
    balance: solde(total, paye, inscription.status),
    payments: toPayments(inscription.payments),
  };
}

/* -------------------------------------------------------------------------- */
/* Recu (paiement, mouvement de caisse)                                        */
/* -------------------------------------------------------------------------- */

export interface ReceiptData {
  /** Numero du recu emis, sinon la reference de la piece. */
  number: string;
  reference: string;
  issuedAt: string;
  direction: "ENTREE" | "SORTIE";
  amount: number;
  payer: string;
  /** Ce que reglait le versement, en clair. */
  motif: string;
  method: string | null;
  externalReference: string | null;
  /** Statut du paiement ; sert au filigrane d'une piece non confirmee. */
  status: string | null;
  /** Rubrique comptable du mouvement de caisse. */
  category: string | null;
  notes: string | null;
  /** Solde de caisse apres l'operation, pour une piece de caisse. */
  balanceAfter: number | null;
}

/**
 * Ce que le paiement rattache designe : son objet et son payeur.
 *
 * Un paiement pointe vers l'une des quatre operations de l'ERP. Le recu doit
 * dire laquelle et au nom de qui, sans quoi le payeur repart avec un montant
 * sans cause — et la souche de caisse devient inexploitable.
 */
interface PaymentOrigin {
  documentSale: {
    reference: string;
    customerName: string | null;
    student: { firstName: string; lastName: string } | null;
  } | null;
  registration: {
    reference: string;
    training: { title: string };
    student: { firstName: string; lastName: string } | null;
  } | null;
  serviceOrder: {
    reference: string;
    customerName: string;
    service: { name: string };
  } | null;
  payroll: {
    reference: string;
    year: number;
    month: number;
    employee: { firstName: string; lastName: string } | null;
  } | null;
}

/** Selection Prisma commune aux deux recus, pour ne la decrire qu'une fois. */
const ORIGINE_SELECT = {
  documentSale: {
    select: {
      reference: true,
      customerName: true,
      student: { select: { firstName: true, lastName: true } },
    },
  },
  registration: {
    select: {
      reference: true,
      training: { select: { title: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  },
  serviceOrder: {
    select: { reference: true, customerName: true, service: { select: { name: true } } },
  },
  payroll: {
    select: {
      reference: true,
      year: true,
      month: true,
      employee: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

function motifDeLOrigine(origine: PaymentOrigin, defaut: string): string {
  if (origine.registration) {
    return `Inscription ${origine.registration.reference} — ${origine.registration.training.title}`;
  }
  if (origine.serviceOrder) {
    return `Prestation ${origine.serviceOrder.reference} — ${origine.serviceOrder.service.name}`;
  }
  if (origine.documentSale) {
    return `Vente de documents ${origine.documentSale.reference}`;
  }
  if (origine.payroll) {
    return `Salaire ${formatPeriod(origine.payroll.year, origine.payroll.month)} — bulletin ${origine.payroll.reference}`;
  }
  return defaut;
}

function payeurDeLOrigine(origine: PaymentOrigin): string | null {
  return (
    nomComplet(origine.registration?.student ?? null) ??
    nomComplet(origine.documentSale?.student ?? null) ??
    origine.documentSale?.customerName ??
    origine.serviceOrder?.customerName ??
    nomComplet(origine.payroll?.employee ?? null)
  );
}

/** Recu d'un paiement encaisse ou verse. */
export async function getPaymentReceipt(id: string): Promise<ReceiptData | null> {
  const paiement = await prisma.payment.findUnique({
    where: { id },
    include: {
      receipt: { select: { number: true, issuedAt: true, payerName: true } },
      ...ORIGINE_SELECT,
    },
  });

  if (!paiement) return null;

  return {
    number: paiement.receipt?.number ?? paiement.reference,
    reference: paiement.reference,
    issuedAt: (paiement.receipt?.issuedAt ?? paiement.paidAt).toISOString(),
    // Un salaire sort de la caisse ; tout le reste y entre.
    direction: paiement.payroll ? "SORTIE" : "ENTREE",
    amount: nombre(paiement.amount),
    payer: paiement.receipt?.payerName ?? payeurDeLOrigine(paiement) ?? "—",
    motif: motifDeLOrigine(paiement, paiement.notes ?? "Règlement"),
    method: paiement.method,
    externalReference: paiement.externalReference,
    status: paiement.status,
    category: null,
    notes: paiement.notes,
    balanceAfter: null,
  };
}

/**
 * Piece justificative d'un mouvement de caisse.
 *
 * L'employe rattache au mouvement est celui qui a tenu la caisse, et il est
 * souvent absent : un encaissement d'inscription n'en porte pas. Le payeur se
 * lit donc d'abord sur le paiement rattache, la ou se trouve le nom du client.
 */
export async function getCashReceipt(id: string): Promise<ReceiptData | null> {
  const mouvement = await prisma.cashTransaction.findUnique({
    where: { id },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      payment: {
        select: {
          reference: true,
          method: true,
          externalReference: true,
          notes: true,
          status: true,
          receipt: { select: { payerName: true } },
          ...ORIGINE_SELECT,
        },
      },
    },
  });

  if (!mouvement) return null;

  const paiement = mouvement.payment;

  return {
    number: mouvement.reference,
    reference: paiement?.reference ?? mouvement.reference,
    issuedAt: mouvement.occurredAt.toISOString(),
    direction: mouvement.direction,
    amount: nombre(mouvement.amount),
    payer:
      paiement?.receipt?.payerName ??
      (paiement ? payeurDeLOrigine(paiement) : null) ??
      nomComplet(mouvement.employee) ??
      "—",
    motif: paiement ? motifDeLOrigine(paiement, mouvement.label) : mouvement.label,
    method: paiement?.method ?? null,
    externalReference: paiement?.externalReference ?? null,
    status: paiement?.status ?? null,
    category: mouvement.category,
    notes: paiement?.notes ?? null,
    balanceAfter: nombre(mouvement.balanceAfter),
  };
}

/* -------------------------------------------------------------------------- */
/* Certificat                                                                  */
/* -------------------------------------------------------------------------- */

export interface CertificateData {
  reference: string;
  issuedAt: string;
  verificationCode: string;
  mention: string | null;
  student: {
    matricule: string;
    fullName: string;
    birthDate: string | null;
  };
  training: {
    title: string;
    code: string;
    level: string;
    durationHours: number;
    startDate: string | null;
    endDate: string | null;
    trainer: string | null;
  };
  finalGrade: number | null;
}

/** Certificat de formation : apprenant, session suivie et resultat. */
export async function getCertificate(id: string): Promise<CertificateData | null> {
  const certificat = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { firstName: true, lastName: true, matricule: true, birthDate: true } },
      training: {
        select: {
          title: true,
          code: true,
          level: true,
          durationHours: true,
          startDate: true,
          endDate: true,
          trainer: { select: { firstName: true, lastName: true } },
        },
      },
      registration: { select: { finalGrade: true } },
    },
  });

  if (!certificat) return null;

  return {
    reference: certificat.reference,
    issuedAt: certificat.issuedAt.toISOString(),
    verificationCode: certificat.verificationCode,
    mention: certificat.mention,
    student: {
      matricule: certificat.student.matricule,
      fullName: `${certificat.student.lastName.toUpperCase()} ${certificat.student.firstName}`,
      birthDate: iso(certificat.student.birthDate),
    },
    training: {
      title: certificat.training.title,
      code: certificat.training.code,
      level: certificat.training.level,
      durationHours: certificat.training.durationHours,
      startDate: iso(certificat.training.startDate),
      endDate: iso(certificat.training.endDate),
      trainer: nomComplet(certificat.training.trainer),
    },
    finalGrade:
      certificat.registration?.finalGrade === null ||
      certificat.registration?.finalGrade === undefined
        ? null
        : nombre(certificat.registration.finalGrade),
  };
}
