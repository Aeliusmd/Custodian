import { dbPool } from "../config/db";
import { env } from "../config/env";
import { notificationModel } from "../models/notificationModel";
import { emailService } from "./emailService";

/**
 * Payload carried into notification dispatch. All fields are optional;
 * the relevant subset is forwarded to the matching email method.
 *
 * All value types are `string | undefined` (not just `string`) so that
 * callers can pass `req.user?.fullName` directly without TS2379 under
 * `exactOptionalPropertyTypes`.
 */
export interface NotificationPayload {
  /** Name of the user who performed the action. */
  actorName?: string | undefined;
  /** Email of the user who performed the action. */
  actorEmail?: string | undefined;
  /** Document file name (document events). */
  fileName?: string | undefined;
  /** Category name or ID (document events). */
  categoryName?: string | undefined;
  /** 'added' | 'updated' | 'removed' (team events). */
  actionType?: string | undefined;
  /** Display name of the user being managed (team events). */
  userName?: string | undefined;
  /** Email of the user being managed (team events). */
  userEmail?: string | undefined;
  /** Human-readable login timestamp (login events). */
  loginTime?: string | undefined;
  /** Organisation name — filled automatically from DB; safe to pass "" or omit. */
  orgName?: string | undefined;
  actionUrl?: string | undefined;
  entityType?: string | undefined;
  entityId?: string | undefined;
  actorUserId?: string | undefined;
  storageUsedGb?: number | undefined;
  storageTotalGb?: number | undefined;
  storagePercent?: number | undefined;
  storageThreshold?: number | undefined;
  totalDocuments?: number | undefined;
  uploadsThisWeek?: number | undefined;
  activeUsers?: number | undefined;
  dedupeKey?: string | undefined;
}

/**
 * Resolves the tenant DB name and organisation display name for a given org ID.
 *
 * @param organizationId - The organization UUID.
 * @returns `{ dbName, orgName }` or `null` when the org is not found.
 */
async function resolveOrgMeta(
  organizationId: string,
): Promise<{ dbName: string; orgName: string } | null> {
  const [rows] = await dbPool.query(
    `SELECT db_name, name
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE id = ?
      LIMIT 1`,
    [organizationId],
  );
  const row = (rows as Array<{ db_name: string; name: string }>)[0];
  if (!row) return null;
  return { dbName: row.db_name, orgName: row.name };
}

function buildInboxContent(
  notificationType: string,
  payload: NotificationPayload,
  orgName: string,
): { title: string; message: string; severity: "info" | "success" | "warning" | "error" } | null {
  const actor = payload.actorName || payload.actorEmail || "A user";

  switch (notificationType) {
    case "document_uploads":
      return {
        title: "Document uploaded",
        message: `${actor} uploaded ${payload.fileName ?? "a document"}${payload.categoryName ? ` to ${payload.categoryName}` : ""}.`,
        severity: "success",
      };

    case "document_shared":
      return {
        title: "Document shared",
        message: `${actor} shared ${payload.fileName ?? "a document"}.`,
        severity: "info",
      };

    case "team_updates":
      return {
        title: "Team updated",
        message: `${actor} ${payload.actionType ?? "updated"} ${payload.userName ?? payload.userEmail ?? "a user"}.`,
        severity: "info",
      };

    case "version_notifications":
      return {
        title: "Document version updated",
        message: `${actor} updated ${payload.fileName ?? "a document version"}.`,
        severity: "info",
      };

    case "login_notifications":
      return {
        title: "Login alert",
        message: `${payload.userName ?? payload.userEmail ?? "A user"} signed in${payload.loginTime ? ` at ${payload.loginTime}` : ""}.`,
        severity: "warning",
      };

    case "system_alerts": {
      const percent = Math.round(Number(payload.storagePercent ?? 0));
      return {
        title: percent >= 95 ? "Storage critical" : "Storage warning",
        message: `${orgName || "Your organization"} has used ${percent}% of its storage allocation.`,
        severity: percent >= 95 ? "error" : "warning",
      };
    }

    case "weekly_reports":
      return {
        title: "Weekly summary ready",
        message: `${orgName || "Your organization"} had ${payload.uploadsThisWeek ?? 0} upload(s), ${payload.totalDocuments ?? 0} total document(s), and ${payload.activeUsers ?? 0} active user(s) this week.`,
        severity: "info",
      };

    default:
      return null;
  }
}

/**
 * Sends an email notification to every active org-admin in the organisation
 * who has the given `notificationType` enabled in their notification_settings.
 *
 * This function NEVER throws — all errors are caught and logged internally.
 * Call it fire-and-forget with `void notifyOrgAdmin(...)`.
 *
 * @param organizationId   - The org UUID (from `req.user.organizationId`).
 * @param notificationType - Matches the `id` column in `notification_settings`
 *                           e.g. `'document_uploads'`, `'team_updates'`, `'login_notifications'`.
 * @param payload          - Event-specific data forwarded to the email template.
 */
export async function notifyOrgAdmin(
  organizationId: string,
  notificationType: string,
  payload: NotificationPayload,
): Promise<void> {
  try {
    // 1. Resolve org meta (DB name + display name).
    const meta = await resolveOrgMeta(organizationId);
    if (!meta) {
      console.error(`[notifyOrgAdmin] Organization not found: ${organizationId}`);
      return;
    }
    const { dbName, orgName } = meta;

    // 2. Find every active org-admin who has this notification type enabled.
    //    LEFT JOIN so admins with no settings rows yet (never visited settings page)
    //    are treated as opted-in by default (ns.id IS NULL → no explicit opt-out).
    const [adminRows] = await dbPool.query(
      `SELECT u.id, u.email, u.name
         FROM \`${dbName}\`.users AS u
         LEFT JOIN \`${dbName}\`.notification_settings AS ns
           ON ns.user_id = u.id AND ns.id = ?
        WHERE (u.role = 'org_admin' OR u.role = 'ORG_ADMIN')
          AND u.status = 'active'
          AND (ns.enabled = 1 OR ns.id IS NULL)`,
      [notificationType],
    );

    const admins = adminRows as Array<{ id: string; email: string; name: string }>;
    if (admins.length === 0) return;

    const recipients = admins.filter((admin) => admin.email !== payload.actorEmail);
    const inboxContent = buildInboxContent(notificationType, payload, orgName);
    if (inboxContent && recipients.length > 0) {
      try {
        await notificationModel.createManyInTenant(
          dbName,
          recipients.map((admin) => ({
            recipientUserId: admin.id,
            type: notificationType,
            title: inboxContent.title,
            message: inboxContent.message,
            severity: inboxContent.severity,
            actionUrl: payload.actionUrl ?? null,
            entityType: payload.entityType ?? null,
            entityId: payload.entityId ?? null,
            actorUserId: payload.actorUserId ?? null,
            metadata: {
              actorName: payload.actorName,
              actorEmail: payload.actorEmail,
              fileName: payload.fileName,
              categoryName: payload.categoryName,
              actionType: payload.actionType,
              userName: payload.userName,
              userEmail: payload.userEmail,
              loginTime: payload.loginTime,
              storageUsedGb: payload.storageUsedGb,
              storageTotalGb: payload.storageTotalGb,
              storagePercent: payload.storagePercent,
              storageThreshold: payload.storageThreshold,
              totalDocuments: payload.totalDocuments,
              uploadsThisWeek: payload.uploadsThisWeek,
              activeUsers: payload.activeUsers,
            },
            dedupeKey: payload.dedupeKey ?? null,
          })),
        );
      } catch (error) {
        console.error("[notifyOrgAdmin] Failed to create inbox notification:", error);
      }
    }

    // 3. Send an email to each eligible admin.
    for (const admin of recipients) {
      switch (notificationType) {
        case "document_uploads":
          await emailService.sendDocumentUploadNotification({
            to: admin.email,
            adminName: admin.name,
            ...payload,
            orgName,
          });
          break;

        case "document_shared":
          await emailService.sendDocumentSharedNotification({
            to: admin.email,
            adminName: admin.name,
            ...payload,
            orgName,
          });
          break;

        case "team_updates":
          await emailService.sendUserManagementNotification({
            to: admin.email,
            adminName: admin.name,
            ...payload,
            orgName,
          });
          break;

        case "login_notifications":
          await emailService.sendLoginAlertNotification({
            to: admin.email,
            adminName: admin.name,
            ...payload,
            orgName,
          });
          break;

        case "system_alerts":
          if (
            payload.storageUsedGb !== undefined &&
            payload.storageTotalGb !== undefined &&
            payload.storagePercent !== undefined
          ) {
            await emailService.sendStorageAlertNotification({
              to: admin.email,
              adminName: admin.name,
              storageUsedGb: payload.storageUsedGb,
              storageTotalGb: payload.storageTotalGb,
              storagePercent: payload.storagePercent,
              orgName,
            });
          }
          break;

        case "weekly_reports":
          await emailService.sendWeeklyReportNotification({
            to: admin.email,
            adminName: admin.name,
            totalDocuments: payload.totalDocuments ?? 0,
            uploadsThisWeek: payload.uploadsThisWeek ?? 0,
            activeUsers: payload.activeUsers ?? 0,
            orgName,
          });
          break;

        default:
          console.warn(`[notifyOrgAdmin] Unknown notification type: ${notificationType}`);
      }
    }
  } catch (error) {
    console.error("[notifyOrgAdmin] Failed to send notification:", error);
  }
}
