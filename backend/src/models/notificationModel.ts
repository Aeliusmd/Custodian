import crypto from "crypto";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import type { AppNotification, CreateNotificationInput, NotificationSeverity } from "../types/notification";

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
};

const safeLimit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(50, Math.trunc(parsed)));
};

async function resolveTenantDbName(organizationId: string): Promise<string> {
  const [rows] = await dbPool.query(
    `SELECT db_name
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE id = ?
        AND db_name IS NOT NULL
        AND db_name <> ''
      LIMIT 1`,
    [organizationId],
  );
  const row = (rows as Array<{ db_name: string }>)[0];
  if (!row) {
    throw new Error(`Cannot resolve tenant DB for organization: ${organizationId}`);
  }
  return row.db_name;
}

async function ensureNotificationsTable(dbName: string): Promise<void> {
  await dbPool.query(
    `CREATE TABLE IF NOT EXISTS \`${dbName}\`.notifications (
      id VARCHAR(36) NOT NULL,
      recipient_user_id VARCHAR(36) NOT NULL,
      type VARCHAR(80) NOT NULL,
      title VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      severity ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
      action_url VARCHAR(255) NULL,
      entity_type VARCHAR(80) NULL,
      entity_id VARCHAR(80) NULL,
      actor_user_id VARCHAR(36) NULL,
      metadata JSON NULL,
      dedupe_key VARCHAR(160) NULL,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_notifications_recipient_dedupe (recipient_user_id, dedupe_key),
      KEY idx_notifications_recipient_created (recipient_user_id, created_at),
      KEY idx_notifications_recipient_read (recipient_user_id, read_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
}

const mapRow = (row: {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  metadata: string | Record<string, unknown> | null;
  readAt: Date | string | null;
  createdAt: Date | string;
}): AppNotification => {
  let metadata: Record<string, unknown> = {};
  if (typeof row.metadata === "string" && row.metadata.trim()) {
    try {
      metadata = JSON.parse(row.metadata) as Record<string, unknown>;
    } catch {
      metadata = {};
    }
  } else if (row.metadata && typeof row.metadata === "object") {
    metadata = row.metadata;
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    severity: row.severity,
    actionUrl: row.actionUrl,
    entityType: row.entityType,
    entityId: row.entityId,
    actorUserId: row.actorUserId,
    metadata,
    readAt: toIso(row.readAt),
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
  };
};

export const notificationModel = {
  async ensureForTenant(dbName: string): Promise<void> {
    await ensureNotificationsTable(dbName);
  },

  async createManyInTenant(dbName: string, inputs: CreateNotificationInput[]): Promise<void> {
    if (inputs.length === 0) return;
    await ensureNotificationsTable(dbName);

    for (const input of inputs) {
      await dbPool.query(
        `INSERT IGNORE INTO \`${dbName}\`.notifications
           (id, recipient_user_id, type, title, message, severity, action_url, entity_type, entity_id, actor_user_id, metadata, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          input.recipientUserId,
          input.type,
          input.title,
          input.message,
          input.severity ?? "info",
          input.actionUrl ?? null,
          input.entityType ?? null,
          input.entityId ?? null,
          input.actorUserId ?? null,
          JSON.stringify(input.metadata ?? {}),
          input.dedupeKey ?? null,
        ],
      );
    }
  },

  async listForUser(organizationId: string, userId: string, limitRaw: unknown): Promise<AppNotification[]> {
    const dbName = await resolveTenantDbName(organizationId);
    await ensureNotificationsTable(dbName);
    const limit = safeLimit(limitRaw);
    const [rows] = await dbPool.query(
      `SELECT id,
              type,
              title,
              message,
              severity,
              action_url AS actionUrl,
              entity_type AS entityType,
              entity_id AS entityId,
              actor_user_id AS actorUserId,
              metadata,
              read_at AS readAt,
              created_at AS createdAt
         FROM \`${dbName}\`.notifications
        WHERE recipient_user_id = ?
        ORDER BY created_at DESC
        LIMIT ${limit}`,
      [userId],
    );
    return (rows as Parameters<typeof mapRow>[0][]).map(mapRow);
  },

  async countUnreadForUser(organizationId: string, userId: string): Promise<number> {
    const dbName = await resolveTenantDbName(organizationId);
    await ensureNotificationsTable(dbName);
    const [rows] = await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM \`${dbName}\`.notifications
        WHERE recipient_user_id = ?
          AND read_at IS NULL`,
      [userId],
    );
    return Number((rows as Array<{ cnt: number }>)[0]?.cnt ?? 0);
  },

  async markRead(organizationId: string, userId: string, notificationId: string): Promise<void> {
    const dbName = await resolveTenantDbName(organizationId);
    await ensureNotificationsTable(dbName);
    await dbPool.query(
      `UPDATE \`${dbName}\`.notifications
          SET read_at = COALESCE(read_at, NOW())
        WHERE id = ?
          AND recipient_user_id = ?
        LIMIT 1`,
      [notificationId, userId],
    );
  },

  async markAllRead(organizationId: string, userId: string): Promise<void> {
    const dbName = await resolveTenantDbName(organizationId);
    await ensureNotificationsTable(dbName);
    await dbPool.query(
      `UPDATE \`${dbName}\`.notifications
          SET read_at = COALESCE(read_at, NOW())
        WHERE recipient_user_id = ?
          AND read_at IS NULL`,
      [userId],
    );
  },

  async deleteForUser(organizationId: string, userId: string, notificationId: string): Promise<void> {
    const dbName = await resolveTenantDbName(organizationId);
    await ensureNotificationsTable(dbName);
    await dbPool.query(
      `DELETE FROM \`${dbName}\`.notifications
        WHERE id = ?
          AND recipient_user_id = ?
        LIMIT 1`,
      [notificationId, userId],
    );
  },
};
