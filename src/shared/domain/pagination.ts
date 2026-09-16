/**
 * Pagination — contrat partage par tous les repositories de liste.
 * Les tableaux de l'ERP (employes, ventes, paies...) s'appuient tous dessus.
 */

export const TAILLE_PAGE_DEFAUT = 20;
export const TAILLE_PAGE_MAX = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Normalise des parametres venus de l'URL (toujours des chaines, souvent faux). */
export function parsePagination(
  page?: string | number | null,
  pageSize?: string | number | null,
): PaginationParams {
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedSize = Number(pageSize) || TAILLE_PAGE_DEFAUT;

  return {
    page: parsedPage,
    pageSize: Math.min(TAILLE_PAGE_MAX, Math.max(1, parsedSize)),
  };
}

export function buildPage<T>(items: T[], total: number, params: PaginationParams): Page<T> {
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

/** Decalage SQL correspondant a la page demandee. */
export function toSkip(params: PaginationParams): number {
  return (params.page - 1) * params.pageSize;
}
