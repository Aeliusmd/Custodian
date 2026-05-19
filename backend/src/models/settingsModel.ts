import { dbPool } from "../config/db";
import { env } from "../config/env";
import type { ActivityLog, NotificationSetting, OrgActivityLog, UserProfile } from "../types/settings";

/** Default notification rows seeded for every new user on first access. */
const DEFAULT_NOTIFICATIONS: Array<Omit<NotificationSetting, ""> & { sort_order: number }> = [
  { id: "document_uploads",      label: "Document Uploads",  description: "Notify when a document is uploaded",          icon: "ri-upload-cloud-2-line", enabled: true,  category: "Documents", sort_order: 0 },
  { id: "document_shared",       label: "Document Shared",   description: "Notify when a document is shared with you",   icon: "ri-share-line",          enabled: true,  category: "Documents", sort_order: 1 },
  { id: "team_updates",          label: "Team Updates",      description: "Notify on team member changes",                icon: "ri-team-line",           enabled: false, category: "Team",      sort_order: 2 },
  { id: "system_alerts",         label: "System Alerts",     description: "Notify on system events",                     icon: "ri-bell-line",           enabled: true,  category: "System",    sort_order: 3 },
  { id: "weekly_reports",        label: "Weekly Reports",    description: "Receive a weekly activity summary",            icon: "ri-bar-chart-2-line",    enabled: false, category: "Reports",   sort_order: 4 },
  { id: "version_notifications", label: "Version Updates",   description: "Notify when a new version is released",       icon: "ri-history-line",        enabled: true,  category: "System",    sort_order: 5 },
  { id: "login_notifications",   label: "Login Alerts",      description: "Notify on new login to your account",         icon: "ri-shield-check-line",   enabled: true,  category: "Security",  sort_order: 6 },
];

/** Maps legacy plain-text icon names (stored before Remix Icon migration) to their ri- equivalents. */
const LEGACY_ICON_MAP: Record<string, string> = {
  upload:   "ri-upload-cloud-2-line",
  share:    "ri-share-line",
  users:    "ri-team-line",
  bell:     "ri-bell-line",
  calendar: "ri-bar-chart-2-line",
  refresh:  "ri-history-line",
  shield:   "ri-shield-check-line",
};

/**
 * Resolves the tenant DB name for a given organization ID.
 * All notification and activity data lives in the tenant DB, not the main DB.
 *
 * @param organizationId - The org UUID stored on the authenticated user.
 * @throws If the organization is not found or has no db_name configured.
 */
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

export const settingsModel = {
  // ─── Profile ────────────────────────────────────────────────────────────────

  /**
   * Returns a UserProfile constructed from the JWT-supplied fields. Tenant
   * user profile data (phone / language / bio) lives in the tenant DB; those
   * fields are written via userModel.update and returned from this method as
   * empty defaults until a future query-by-user enhancement is wired in.
   *
   * @param _userId - Reserved for future direct lookup; unused for now.
   * @param email - The user's email from the JWT.
   * @param fullName - The user's full name from the JWT.
   * @param role - The user's role string.
   */
  getProfile(_userId: string, email: string, fullName: string, role: string): UserProfile {
    const [firstName = "", ...rest] = fullName.trim().split(" ");
    return {
      firstName,
      lastName: rest.join(" "),
      email,
      phone: "",
      language: "English",
      role,
      bio: "",
      avatarDataUrl: "",
    };
  },

  /**
   * Persists updated profile fields for a tenant user. The actual write goes
   * to the `users` table in the user's tenant DB — delegated to userModel.update.
   * This method intentionally has no direct DB call so that callers can
   * compose it with userModel.update without circular imports.
   *
   * @param _userId - Unused here; kept for interface symmetry.
   * @param profile - The full profile payload to return.
   * @returns The same profile object (the DB write is done by the service).
   */
  setProfile(_userId: string, profile: UserProfile): UserProfile {
    return profile;
  },

  // ─── Notifications ──────────────────────────────────────────────────────────

  /**
   * Returns notification settings for a user. If the user has no rows yet,
   * seeds them from DEFAULT_NOTIFICATIONS first (lazy initialisation).
   *
   * @param userId - The user's UUID.
   * @param organizationId - The user's organization UUID, used to resolve the tenant DB.
   */
  async getNotifications(userId: string, organizationId: string): Promise<NotificationSetting[]> {
    const tenantDb = await resolveTenantDbName(organizationId);

    const [countRows] = await dbPool.query(
      `SELECT COUNT(*) AS cnt
         FROM \`${tenantDb}\`.notification_settings
        WHERE user_id = ?`,
      [userId],
    );
    const count = Number((countRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    if (count === 0) {
      await this.initNotifications(userId, tenantDb);
    }

    const [rows] = await dbPool.query(
      `SELECT id, label, description, icon, enabled, category
         FROM \`${tenantDb}\`.notification_settings
        WHERE user_id = ?
        ORDER BY sort_order`,
      [userId],
    );

    return (rows as Array<{
      id: string;
      label: string;
      description: string;
      icon: string;
      enabled: number | boolean;
      category: string;
    }>).map((r) => ({
      id: r.id,
      label: r.label,
      description: r.description,
      icon: LEGACY_ICON_MAP[r.icon] ?? r.icon,
      enabled: Boolean(r.enabled),
      category: r.category,
    }));
  },

  /**
   * Toggles a single notification setting for a user.
   *
   * @param userId - The user's UUID.
   * @param organizationId - The user's organization UUID, used to resolve the tenant DB.
   * @param id - The notification setting ID (e.g. "document_uploads").
   * @param enabled - The new enabled state.
   */
  async updateNotification(userId: string, organizationId: string, id: string, enabled: boolean): Promise<void> {
    const tenantDb = await resolveTenantDbName(organizationId);
    await dbPool.query(
      `UPDATE \`${tenantDb}\`.notification_settings
          SET enabled = ?
        WHERE user_id = ?
          AND id = ?`,
      [enabled ? 1 : 0, userId, id],
    );
  },

  /**
   * Replaces all notification settings for a user (used when the frontend sends
   * the full array). Each row is upserted individually to preserve sort_order.
   *
   * @param userId - The user's UUID.
   * @param organizationId - The user's organization UUID, used to resolve the tenant DB.
   * @param payload - The full list of notification settings.
   * @returns The same payload.
   */
  async setNotifications(userId: string, organizationId: string, payload: NotificationSetting[]): Promise<NotificationSetting[]> {
    const tenantDb = await resolveTenantDbName(organizationId);
    for (const item of payload) {
      await dbPool.query(
        `UPDATE \`${tenantDb}\`.notification_settings
            SET enabled = ?
          WHERE user_id = ?
            AND id = ?`,
        [item.enabled ? 1 : 0, userId, item.id],
      );
    }
    return payload;
  },

  /**
   * Seeds the default notification rows for a new user using a single
   * batch INSERT. Called internally by getNotifications — receives the already-
   * resolved tenant DB name to avoid a redundant lookup.
   *
   * @param userId - The user's UUID.
   * @param tenantDb - The resolved tenant DB name.
   */
  async initNotifications(userId: string, tenantDb: string): Promise<void> {
    if (DEFAULT_NOTIFICATIONS.length === 0) return;

    const placeholders = DEFAULT_NOTIFICATIONS.map(() => "(?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
    const values: Array<string | number> = [];
    for (const n of DEFAULT_NOTIFICATIONS) {
      values.push(n.id, userId, n.label, n.description, n.icon, n.enabled ? 1 : 0, n.category, n.sort_order);
    }

    await dbPool.query(
      `INSERT IGNORE INTO \`${tenantDb}\`.notification_settings
         (id, user_id, label, description, icon, enabled, category, sort_order)
       VALUES ${placeholders}`,
      values,
    );
  },

  // ─── Activity Logs ──────────────────────────────────────────────────────────

  /**
   * Returns the 50 most recent activity log entries for a user.
   *
   * @param userId - The user's UUID.
   * @param organizationId - The user's organization UUID, used to resolve the tenant DB.
   */
  async getActivity(userId: string, organizationId: string): Promise<ActivityLog[]> {
    const tenantDb = await resolveTenantDbName(organizationId);
    const [rows] = await dbPool.query(
      `SELECT id,
              date_time AS dateTime,
              action,
              module,
              description
         FROM \`${tenantDb}\`.activity_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50`,
      [userId],
    );

    return rows as ActivityLog[];
  },

  /**
   * Returns the 200 most recent activity log entries for all users in the organization.
   */
  async getAllOrgActivity(organizationId: string): Promise<OrgActivityLog[]> {
    const tenantDb = await resolveTenantDbName(organizationId);

    await dbPool.query(
      `CREATE TABLE IF NOT EXISTS \`${tenantDb}\`.activity_logs (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        date_time VARCHAR(30) NOT NULL,
        action VARCHAR(120) NOT NULL,
        module VARCHAR(80) NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_al_user (user_id),
        KEY idx_al_module (module),
        KEY idx_al_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    const [rows] = await dbPool.query(
      `SELECT al.id,
              al.date_time AS dateTime,
              al.action,
              al.module,
              al.description,
              al.user_id AS performedById,
              COALESCE(NULLIF(TRIM(u.name), ''), u.email, '') AS performedBy
         FROM \`${tenantDb}\`.activity_logs al
         LEFT JOIN \`${tenantDb}\`.users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT 200`,
    );

    return rows as OrgActivityLog[];
  },

  /**
   * Inserts a new activity log entry for a user.
   *
   * @param userId - The user's UUID.
   * @param organizationId - The user's organization UUID, used to resolve the tenant DB.
   * @param entry - The log entry fields.
   */
  async addActivity(
    userId: string,
    organizationId: string,
    entry: { id: string; date_time: string; action: string; module: string; description: string },
  ): Promise<void> {
    const tenantDb = await resolveTenantDbName(organizationId);
    await dbPool.query(
      `CREATE TABLE IF NOT EXISTS \`${tenantDb}\`.activity_logs (
        id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        date_time VARCHAR(30) NOT NULL,
        action VARCHAR(120) NOT NULL,
        module VARCHAR(80) NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_al_user (user_id),
        KEY idx_al_module (module),
        KEY idx_al_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await dbPool.query(
      `INSERT INTO \`${tenantDb}\`.activity_logs
         (id, user_id, date_time, action, module, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.id, userId, entry.date_time, entry.action, entry.module, entry.description],
    );
  },

  /**
   * Convenience wrapper used by settingsService. Converts the ActivityLog
   * shape (dateTime) to the addActivity shape (date_time) and inserts.
   *
   * @param userId - The user's UUID.
   * @param organizationId - The user's organization UUID, used to resolve the tenant DB.
   * @param log - The ActivityLog entry (uses dateTime field).
   */
  async appendActivity(userId: string, organizationId: string, log: ActivityLog): Promise<void> {
    await this.addActivity(userId, organizationId, {
      id: log.id,
      date_time: log.dateTime,
      action: log.action,
      module: log.module,
      description: log.description,
    });
  },
};
