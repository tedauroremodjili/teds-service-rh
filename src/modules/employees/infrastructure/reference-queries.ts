import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/** Listes de reference utilisees par les formulaires et les filtres. */

export interface Option {
  id: string;
  label: string;
}

export async function getDepartmentOptions(): Promise<Option[]> {
  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return departments.map((department) => ({ id: department.id, label: department.name }));
}

export async function getPositionOptions(): Promise<Option[]> {
  const positions = await prisma.position.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, department: { select: { name: true } } },
    orderBy: { title: "asc" },
  });

  return positions.map((position) => ({
    id: position.id,
    // On rappelle le departement : « Formateur » seul serait ambigu si plusieurs
    // departements avaient un poste homonyme.
    label: position.department ? `${position.title} — ${position.department.name}` : position.title,
  }));
}

/** Employes actifs, pour les combos qui doivent en choisir un (bareme, paie...). */
export async function getActiveEmployeeOptions(): Promise<Option[]> {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: "ACTIF" },
    select: { id: true, firstName: true, lastName: true, matricule: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return employees.map((employee) => ({
    id: employee.id,
    label: `${employee.lastName} ${employee.firstName} — ${employee.matricule}`,
  }));
}
