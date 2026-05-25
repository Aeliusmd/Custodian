import { dbPool } from "../config/db";
import { env } from "../config/env";
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
  /** Storage used in GB (system_alerts). */
  storageUsedGb?: number | undefined;
  /** Storage limit in GB (system_alerts). */
  storageTotalGb?: number | undefined;
  /** Storage usage percentage 0–100 (system_alerts). */
  storagePercent?: number | undefined;
  /** Total documents in the org (weekly_reports). */
  totalDocuments?: number | undefined;
  /** Documents uploaded this week (weekly_reports). */
  uploadsThisWeek?: number | undefined;
  /** Active users count (weekly_reports). */
  activeUsers?: number | undefined;
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
      `SELECT u.email, u.name
         FROM \`${dbName}\`.users AS u
         LEFT JOIN \`${dbName}\`.notification_settings AS ns
           ON ns.user_id = u.id AND ns.id = ?
        WHERE (u.role = 'org_admin' OR u.role = 'ORG_ADMIN')
          AND u.status = 'active'
          AND (ns.enabled = 1 OR ns.id IS NULL)`,
      [notificationType],
    );

    const admins = adminRows as Array<{ email: string; name: string }>;
    if (admins.length === 0) return;

    // 3. Send an email to each eligible admin.
    for (const admin of admins) {
      // Skip self-notifications (admin acting on their own behalf).
      if (admin.email === payload.actorEmail) continue;

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

        case "version_notifications":
          await emailService.sendVersionUpdateNotification({
            to: admin.email,
            adminName: admin.name,
            ...payload,
            orgName,
          });
          break;

        case "system_alerts":
          await emailService.sendStorageAlertNotification({
            to: admin.email,
            adminName: admin.name,
            storageUsedGb: payload.storageUsedGb ?? 0,
            storageTotalGb: payload.storageTotalGb ?? 10,
            storagePercent: payload.storagePercent ?? 0,
            orgName,
          });
          break;

        case "weekly_reports":
          await emailService.sendWeeklyReportNotification({
            to: admin.email,
            adminName: admin.name,
            orgName,
            totalDocuments: payload.totalDocuments ?? 0,
            uploadsThisWeek: payload.uploadsThisWeek ?? 0,
            activeUsers: payload.activeUsers ?? 0,
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
