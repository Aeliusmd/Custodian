import { dbPool } from "../config/db";
import { env } from "../config/env";
import type { Role } from "../types/auth";

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
      const [rows] = await dbPool.query(
        `SELECT id, name, email, password_hash AS passwordHash, role, status,
                COALESCE(phone, '') AS phone,
                COALESCE(language, 'English') AS language,
                COALESCE(bio, '') AS bio
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
        };
      }
    }
    return null;
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
      const [rows] = await dbPool.query(
        `SELECT id, name, email, password_hash AS passwordHash, role, status,
                COALESCE(phone, '') AS phone,
                COALESCE(language, 'English') AS language,
                COALESCE(bio, '') AS bio
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
    data: Partial<{ name: string; phone: string; language: string; bio: string }>,
  ): Promise<void> {
    const updates: string[] = [];
    const params: Array<string> = [];

    if (data.name !== undefined) { updates.push("name = ?"); params.push(data.name); }
    if (data.phone !== undefined) { updates.push("phone = ?"); params.push(data.phone); }
    if (data.language !== undefined) { updates.push("language = ?"); params.push(data.language); }
    if (data.bio !== undefined) { updates.push("bio = ?"); params.push(data.bio); }

    if (updates.length === 0) return;

    params.push(id);
    const orgs = await getActiveOrgs();
    for (const org of orgs) {
      const [result] = await dbPool.query(
        `UPDATE \`${org.db_name}\`.users SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0) {
        return;
      }
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
