import { dbPool } from "../config/db";
import { env } from "../config/env";
import type { Role } from "../types/auth";
import { resolveTenantDbName } from "../utils/tenantDb";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  organizationId: string;
  isActive: boolean;
  phone: string;
  language: string;
  bio: string;
  avatarDataUrl: string;
}

/** Maps a role string from the tenant DB to the application Role type. */
const mapTenantRole = (dbRole: string): Role =>
  dbRole.toLowerCase() === "org_admin" ? "ORG_ADMIN" : "USER";

/** Returns all active tenant organizations with their db_name. */
const getActiveOrgs = async (): Promise<Array<{ id: string; db_name: string }>> => {
  const [rows] = await dbPool.query(
    `SELECT id, db_name
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE db_name IS NOT NULL
        AND db_name <> ''
        AND (is_deleted = 0 OR is_deleted IS NULL)`,
  );
  return rows as Array<{ id: string; db_name: string }>;
};

const ensuredProfileColumns = new Set<string>();

const ensureUserProfileColumns = async (dbName: string): Promise<void> => {
  if (ensuredProfileColumns.has(dbName)) return;
  const [rows] = await dbPool.query(
    `SELECT LOWER(column_name) AS column_name
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'users'
        AND column_name IN ('phone', 'language', 'bio', 'avatar_data_url')`,
    [dbName],
  );
  const existing = new Set(
    (rows as Array<{ column_name?: string; COLUMN_NAME?: string }>)
      .map((row) => (row.column_name ?? row.COLUMN_NAME ?? "").toLowerCase())
      .filter(Boolean),
  );
  if (!existing.has("phone")) {
    await dbPool.query(`ALTER TABLE \`${dbName}\`.users ADD COLUMN phone VARCHAR(60) NULL`);
  }
  if (!existing.has("language")) {
    await dbPool.query(`ALTER TABLE \`${dbName}\`.users ADD COLUMN language VARCHAR(40) NOT NULL DEFAULT 'English'`);
  }
  if (!existing.has("bio")) {
    await dbPool.query(`ALTER TABLE \`${dbName}\`.users ADD COLUMN bio TEXT NULL`);
  }
  if (!existing.has("avatar_data_url")) {
    await dbPool.query(`ALTER TABLE \`${dbName}\`.users ADD COLUMN avatar_data_url MEDIUMTEXT NULL`);
  }
  ensuredProfileColumns.add(dbName);
};

export const userModel = {
  /**
   * Finds a tenant user by their primary key, searching across all active
   * tenant databases.
   *
   * @param id - The user's UUID.
   * @returns The matching UserRecord or null if not found.
   */
  async findById(id: string): Promise<UserRecord | null> {
    const orgs = await getActiveOrgs();
    for (const org of orgs) {
      await ensureUserProfileColumns(org.db_name);
      const [rows] = await dbPool.query(
        `SELECT id, name, email, password_hash AS passwordHash, role, status,
                COALESCE(phone, '') AS phone,
                COALESCE(language, 'English') AS language,
                COALESCE(bio, '') AS bio,
                COALESCE(avatar_data_url, '') AS avatarDataUrl
           FROM \`${org.db_name}\`.users
          WHERE id = ?
          LIMIT 1`,
        [id],
      );
      const row = (rows as Array<{
        id: string;
        name: string;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        phone: string;
        language: string;
        bio: string;
        avatarDataUrl: string;
      }>)[0];
      if (row) {
        return {
          id: row.id,
          email: row.email,
          passwordHash: row.passwordHash,
          fullName: row.name,
          role: mapTenantRole(row.role),
          organizationId: org.id,
          isActive: row.status.toLowerCase() === "active",
          phone: row.phone,
          language: row.language,
          bio: row.bio,
          avatarDataUrl: row.avatarDataUrl,
        };
      }
    }
    return null;
  },

  /**
   * Finds a tenant user by ID within a specific organization's tenant DB.
   *
   * @param id - The user's UUID.
   * @param organizationId - The organization UUID from the authenticated session.
   */
  async findByIdInOrg(id: string, organizationId: string): Promise<UserRecord | null> {
    const dbName = await resolveTenantDbName(organizationId);
    await ensureUserProfileColumns(dbName);
    const [rows] = await dbPool.query(
      `SELECT id, name, email, password_hash AS passwordHash, role, status,
              COALESCE(phone, '') AS phone,
              COALESCE(language, 'English') AS language,
              COALESCE(bio, '') AS bio,
              COALESCE(avatar_data_url, '') AS avatarDataUrl
         FROM \`${dbName}\`.users
        WHERE id = ?
        LIMIT 1`,
      [id],
    );
    const row = (rows as Array<{
      id: string;
      name: string;
      email: string;
      passwordHash: string;
      role: string;
      status: string;
      phone: string;
      language: string;
      bio: string;
      avatarDataUrl: string;
    }>)[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.name,
      role: mapTenantRole(row.role),
      organizationId,
      isActive: row.status.toLowerCase() === "active",
      phone: row.phone,
      language: row.language,
      bio: row.bio,
      avatarDataUrl: row.avatarDataUrl,
    };
  },

  /**
   * Finds a tenant user by email address, searching across all active
   * tenant databases.
   *
   * @param email - The user's email address (case-insensitive).
   * @returns The matching UserRecord or null if not found.
   */
  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const orgs = await getActiveOrgs();
    for (const org of orgs) {
      await ensureUserProfileColumns(org.db_name);
      const [rows] = await dbPool.query(
        `SELECT id, name, email, password_hash AS passwordHash, role, status,
                COALESCE(phone, '') AS phone,
                COALESCE(language, 'English') AS language,
                COALESCE(bio, '') AS bio,
                COALESCE(avatar_data_url, '') AS avatarDataUrl
           FROM \`${org.db_name}\`.users
          WHERE LOWER(email) = ?
          LIMIT 1`,
        [normalizedEmail],
      );
      const row = (rows as Array<{
        id: string;
        name: string;
        email: string;
        passwordHash: string;
        role: string;
        status: string;
        phone: string;
        language: string;
        bio: string;
        avatarDataUrl: string;
      }>)[0];
      if (row) {
        return {
          id: row.id,
          email: row.email,
          passwordHash: row.passwordHash,
          fullName: row.name,
          role: mapTenantRole(row.role),
          organizationId: org.id,
          isActive: row.status.toLowerCase() === "active",
          phone: row.phone,
          language: row.language,
          bio: row.bio,
          avatarDataUrl: row.avatarDataUrl,
        };
      }
    }
    return null;
  },

  /**
   * Updates mutable profile fields for a tenant user.
   * Only fields that are not undefined will be included in the UPDATE statement.
   *
   * @param id - The user's UUID.
   * @param data - Partial object of fields to update.
   */
  async update(
    id: string,
    data: Partial<{ name: string; phone: string; language: string; bio: string; avatarDataUrl: string }>,
  ): Promise<void> {
    const updates: string[] = [];
    const params: Array<string> = [];

    if (data.name !== undefined) { updates.push("name = ?"); params.push(data.name); }
    if (data.phone !== undefined) { updates.push("phone = ?"); params.push(data.phone); }
    if (data.language !== undefined) { updates.push("language = ?"); params.push(data.language); }
    if (data.bio !== undefined) { updates.push("bio = ?"); params.push(data.bio); }
    if (data.avatarDataUrl !== undefined) { updates.push("avatar_data_url = ?"); params.push(data.avatarDataUrl); }

    if (updates.length === 0) return;

    params.push(id);
    const orgs = await getActiveOrgs();
    for (const org of orgs) {
      await ensureUserProfileColumns(org.db_name);
      try {
        const [result] = await dbPool.query(
          `UPDATE \`${org.db_name}\`.users SET ${updates.join(", ")} WHERE id = ?`,
          params,
        );
        if (Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0) {
          return;
        }
      } catch (err) {
        console.error(`[userModel.update] Failed for org db=${org.db_name}:`, err);
      }
    }
    console.warn(`[userModel.update] No rows updated for user id=${id}`);
  },

  /**
   * Updates profile fields for a user in a specific organization's tenant DB.
   * Throws if no row is updated.
   *
   * @param id - The user's UUID.
   * @param organizationId - The organization UUID from the authenticated session.
   * @param data - Partial object of fields to update.
   */
  async updateInOrg(
    id: string,
    organizationId: string,
    data: Partial<{ name: string; phone: string; language: string; bio: string; avatarDataUrl: string }>,
  ): Promise<void> {
    const updates: string[] = [];
    const params: Array<string> = [];

    if (data.name !== undefined) { updates.push("name = ?"); params.push(data.name); }
    if (data.phone !== undefined) { updates.push("phone = ?"); params.push(data.phone); }
    if (data.language !== undefined) { updates.push("language = ?"); params.push(data.language); }
    if (data.bio !== undefined) { updates.push("bio = ?"); params.push(data.bio); }
    if (data.avatarDataUrl !== undefined) { updates.push("avatar_data_url = ?"); params.push(data.avatarDataUrl); }

    if (updates.length === 0) return;

    const dbName = await resolveTenantDbName(organizationId);
    await ensureUserProfileColumns(dbName);
    params.push(id);

    const [result] = await dbPool.query(
      `UPDATE \`${dbName}\`.users SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    const affected = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    if (affected === 0) {
      throw new Error("User not found in organization tenant");
    }
  },

  /**
   * Updates the password hash for a tenant user.
   *
   * @param id - The user's UUID.
   * @param passwordHash - The new bcrypt password hash.
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const orgs = await getActiveOrgs();
    for (const org of orgs) {
      const [result] = await dbPool.query(
        `UPDATE \`${org.db_name}\`.users SET password_hash = ? WHERE id = ?`,
        [passwordHash, id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0) {
        return;
      }
    }
  },

  /**
   * Creates a new user record. This is a legacy path used only by the
   * in-process signup flow; new user creation goes through tenant provisioning.
   *
   * @param user - The complete UserRecord to insert.
   * @returns The inserted UserRecord.
   */
  create(user: UserRecord): UserRecord {
    // Legacy in-memory stub preserved for interface compatibility.
    // New user provisioning is handled by superAdminModel.createOrganizationWithTenantProvisioning.
    return user;
  },
};
