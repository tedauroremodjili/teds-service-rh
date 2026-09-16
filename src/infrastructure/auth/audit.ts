import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

/**
 * Journalisation des actions (section 7 — « Journalisation des actions »).
 *
 * Chaque ecriture sensible laisse une trace : qui, quoi, quand, avant/apres.
 * L'ecriture du journal ne doit jamais faire echouer l'operation metier — si
 * l'audit tombe, on prefere perdre la trace plutot que la creation d'un employe.
 * L'erreur est donc capturee et signalee dans les logs serveur.
 */

export interface AuditEntry {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: (entry.before ?? undefined) as never,
        after: (entry.after ?? undefined) as never,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] écriture du journal impossible", error);
  }
}
