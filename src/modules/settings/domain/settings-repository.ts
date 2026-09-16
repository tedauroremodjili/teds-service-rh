/**
 * Port du module settings.
 * Le domaine demande a lire et a ecrire des couples cle/valeur ; il ignore que
 * PostgreSQL est derriere.
 */

import type { Result } from "@/shared/domain/result";

export interface StoredSetting {
  key: string;
  label: string;
  description: string | null;
  category: string;
  value: unknown;
  updatedAt: Date;
}

export interface SettingWrite {
  key: string;
  value: unknown;
  /** Libelle et categorie, pour creer la ligne si la cle n'existe pas encore. */
  label: string;
  category: string;
  description: string | null;
}

export interface SettingsRepository {
  list(): Promise<StoredSetting[]>;

  /**
   * Ecrit tout l'ecran d'un coup, dans une transaction : des parametres
   * enregistres a moitie laisseraient l'entreprise avec un ancien email et un
   * nouveau telephone, sans que personne sache lesquels ont pris.
   */
  saveMany(entries: readonly SettingWrite[]): Promise<Result<void>>;
}
