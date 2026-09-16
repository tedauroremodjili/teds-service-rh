import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { DomainError } from "@/shared/domain/errors";
import { fail, ok, type Result } from "@/shared/domain/result";

import type {
  SettingWrite,
  SettingsRepository,
  StoredSetting,
} from "../domain/settings-repository";

/** Implementation PostgreSQL du port SettingsRepository. */
export const prismaSettingsRepository: SettingsRepository = {
  async list(): Promise<StoredSetting[]> {
    const lignes = await prisma.setting.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
      select: {
        key: true,
        label: true,
        description: true,
        category: true,
        value: true,
        updatedAt: true,
      },
    });

    return lignes.map((ligne) => ({
      key: ligne.key,
      label: ligne.label,
      description: ligne.description,
      category: ligne.category,
      value: ligne.value,
      updatedAt: ligne.updatedAt,
    }));
  },

  async saveMany(entries: readonly SettingWrite[]): Promise<Result<void>> {
    if (entries.length === 0) return ok(undefined);

    try {
      await prisma.$transaction(
        entries.map((entree) =>
          prisma.setting.upsert({
            where: { key: entree.key },
            // La cle peut ne pas exister encore : un parametre ajoute au
            // catalogue apres l'installation doit pouvoir etre renseigne sans
            // qu'on ait a relancer le seed.
            update: { value: entree.value as never },
            create: {
              key: entree.key,
              value: entree.value as never,
              label: entree.label,
              category: entree.category,
              description: entree.description,
            },
          }),
        ),
      );

      return ok(undefined);
    } catch (error) {
      console.error("[settings] enregistrement impossible", error);
      return fail(
        DomainError.businessRule(
          "L'enregistrement des paramètres a échoué. Réessayez dans un instant.",
          "ECRITURE_IMPOSSIBLE",
        ),
      );
    }
  },
};
