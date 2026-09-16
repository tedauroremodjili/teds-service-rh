/**
 * Formatage pour l'affichage. Toutes les vues passent par ces fonctions afin
 * que les montants, dates et libelles soient homogenes dans toute l'application.
 */

const LOCALE = "fr-FR";

/** « 300 000 FCFA ». Accepte un number, une string ou un Decimal Prisma. */
export function formatMoney(value: number | string | { toString(): string }): string {
  const amount = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(amount)) return "—";
  return `${Math.round(amount).toLocaleString(LOCALE).replace(/ | /g, " ")} FCFA`;
}

/** « 300 000 » sans devise, pour les colonnes de tableau compactes. */
export function formatNumber(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString(LOCALE).replace(/ | /g, " ");
}

/** « 10 % ». */
export function formatPercent(value: number | string | { toString(): string }): string {
  const rate = typeof value === "number" ? value : Number(value.toString());
  if (!Number.isFinite(rate)) return "—";
  return `${rate.toLocaleString(LOCALE)} %`;
}

/**
 * Graduation compacte : « 1,2 M » plutôt que « 1 200 000 FCFA ».
 *
 * Destinée aux axes de graphiques, où la place manque et où l'ordre de grandeur
 * compte plus que le franc près. La valeur exacte reste lisible dans
 * l'infobulle et dans la vue tableau du graphique.
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000).toLocaleString(LOCALE)} k`;
  }

  return value.toLocaleString(LOCALE);
}

/** « 3 août 2026 ». */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** « 03/08/2026 » — format court pour les tableaux. */
export function formatDateShort(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** « 03/08/2026 à 14:30 ». */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDateShort(date)} à ${new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

/** « août 2026 » a partir d'une periode de paie. */
export function formatPeriod(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(date);
}

/** Age en annees revolues, utilise sur la fiche employe. */
export function computeAge(birthDate: Date | string): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/** « 2 ans et 3 mois » — anciennete dans l'entreprise. */
export function formatSeniority(hireDate: Date | string): string {
  const hire = hireDate instanceof Date ? hireDate : new Date(hireDate);
  const today = new Date();
  let months = (today.getFullYear() - hire.getFullYear()) * 12 + (today.getMonth() - hire.getMonth());
  if (today.getDate() < hire.getDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${remainingMonths} mois`;
  if (remainingMonths === 0) return years === 1 ? "1 an" : `${years} ans`;
  return `${years === 1 ? "1 an" : `${years} ans`} et ${remainingMonths} mois`;
}

/** « JD » — initiales pour l'avatar par defaut. */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Initiales a partir d'un nom complet. Le compte d'un utilisateur sans employe
 * rattache affiche son email : on retombe alors sur les deux premieres lettres.
 */
export function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return initials(parts[0], parts[1]);
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

/**
 * Transforme un libelle d'enum (« RESPONSABLE_RH ») en texte lisible
 * (« Responsable rh »). Les libelles metier importants sont definis
 * explicitement dans chaque module ; ceci n'est qu'un repli.
 */
export function humanizeEnum(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
