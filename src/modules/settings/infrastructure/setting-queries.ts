import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

import { ordonnerCategories } from "../domain/setting";

/** Lectures du module 17 — parametres de l'entreprise. */

export interface SettingRow {
  key: string;
  label: string;
  description: string | null;
  /** Valeur JSON brute ; la vue la met en forme. */
  value: unknown;
  updatedAt: Date;
}

export interface SettingGroup {
  category: string;
  settings: SettingRow[];
}

/** Parametres regroupes par categorie, dans l'ordre d'affichage. */
export async function getSettingGroups(): Promise<SettingGroup[]> {
  const parametres = await prisma.setting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
    select: {
      key: true,
      label: true,
      description: true,
      value: true,
      category: true,
      updatedAt: true,
    },
  });

  const parCategorie = new Map<string, SettingRow[]>();

  for (const parametre of parametres) {
    const lignes = parCategorie.get(parametre.category) ?? [];
    lignes.push({
      key: parametre.key,
      label: parametre.label,
      description: parametre.description,
      value: parametre.value,
      updatedAt: parametre.updatedAt,
    });
    parCategorie.set(parametre.category, lignes);
  }

  return ordonnerCategories([...parCategorie.keys()]).map((category) => ({
    category,
    settings: parCategorie.get(category) ?? [],
  }));
}

export interface StructureStats {
  departements: number;
  postes: number;
  roles: number;
  comptesActifs: number;
}

/**
 * Volumetrie de la structure de reference.
 *
 * Ces nombres disent si le parametrage de base a ete fait : une application
 * sans departement ni poste n'est pas encore utilisable pour la paie.
 */
export async function getStructureStats(): Promise<StructureStats> {
  const [departements, postes, roles, comptesActifs] = await Promise.all([
    prisma.department.count({ where: { deletedAt: null } }),
    prisma.position.count({ where: { deletedAt: null } }),
    prisma.role.count(),
    prisma.user.count({ where: { deletedAt: null, status: "ACTIF" } }),
  ]);

  return { departements, postes, roles, comptesActifs };
}

export interface DepartementRow {
  id: string;
  code: string;
  name: string;
  postes: number;
  effectif: number;
}

/** Departements et leur effectif, affiches dans les parametres RH. */
export async function listDepartements(): Promise<DepartementRow[]> {
  const departements = await prisma.department.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      _count: {
        select: {
          positions: { where: { deletedAt: null } },
          employees: { where: { deletedAt: null, status: "ACTIF" } },
        },
      },
    },
  });

  return departements.map((departement) => ({
    id: departement.id,
    code: departement.code,
    name: departement.name,
    postes: departement._count.positions,
    effectif: departement._count.employees,
  }));
}
