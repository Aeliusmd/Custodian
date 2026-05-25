import { dbPool } from "../config/db";
import { env } from "../config/env";

export interface SuperAdminAuthRecord {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  status: "active" | "inactive";
}

let superAdminsPhoneColumnEnsured = false;

const ensureSuperAdminsPhoneColumn = async (): Promise<void> => {
  if (superAdminsPhoneColumnEnsured) return;
  const [rows] = await dbPool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'super_admins'
        AND column_name = 'phone'
      LIMIT 1`,
    [env.mysqlDatabase],
  );
  const exists = (rows as Array<{ 1: number }>).length > 0;
  if (!exists) {
    await dbPool.query(
      `ALTER TABLE \`${env.mysqlDatabase}\`.super_admins
         ADD COLUMN phone VARCHAR(60) NULL`,
    );
  }
  superAdminsPhoneColumnEnsured = true;
};

export const superAdminAuthModel = {
  async findByEmail(email: string): Promise<SuperAdminAuthRecord | null> {
    await ensureSuperAdminsPhoneColumn();
    const [rows] = await dbPool.query(
      `SELECT id, name, email, phone, password_hash AS passwordHash, status
       FROM \`${env.mysqlDatabase}\`.super_admins
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    const list = rows as SuperAdminAuthRecord[];
    return list.length > 0 ? (list[0] ?? null) : null;
  },

  async findById(id: string): Promise<SuperAdminAuthRecord | null> {
    await ensureSuperAdminsPhoneColumn();
    const [rows] = await dbPool.query(
      `SELECT id, name, email, phone, password_hash AS passwordHash, status
       FROM \`${env.mysqlDatabase}\`.super_admins
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    const list = rows as SuperAdminAuthRecord[];
    return list.length > 0 ? (list[0] ?? null) : null;
  },

  async updateProfileById(id: string, payload: { name?: string; email?: string; phone?: string }): Promise<boolean> {
    await ensureSuperAdminsPhoneColumn();
    const updates: string[] = [];
    const params: string[] = [];
    if (payload.name !== undefined) {
      updates.push("name = ?");
      params.push(payload.name);
    }
    if (payload.email !== undefined) {
      updates.push("email = ?");
      params.push(payload.email);
    }
    if (payload.phone !== undefined) {
      updates.push("phone = ?");
      params.push(payload.phone);
    }
    if (updates.length === 0) {
      return true;
    }
    params.push(id);
    const [result] = await dbPool.query(
      `UPDATE \`${env.mysqlDatabase}\`.super_admins
          SET ${updates.join(", ")}
        WHERE id = ?
        LIMIT 1`,
      params,
    );
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },

  async updatePasswordById(id: string, passwordHash: string): Promise<boolean> {
    const [result] = await dbPool.query(
      `UPDATE \`${env.mysqlDatabase}\`.super_admins
          SET password_hash = ?
        WHERE id = ?
        LIMIT 1`,
      [passwordHash, id],
    );
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },

  async listAll(): Promise<Omit<SuperAdminAuthRecord, "passwordHash">[]> {
    await ensureSuperAdminsPhoneColumn();
    const [rows] = await dbPool.query(
      `SELECT id, name, email, phone, status
       FROM \`${env.mysqlDatabase}\`.super_admins
       ORDER BY name ASC`,
    );
    return rows as Omit<SuperAdminAuthRecord, "passwordHash">[];
  },

  async createAdmin(payload: { id: string; name: string; email: string; passwordHash: string }): Promise<boolean> {
    const [result] = await dbPool.query(
      `INSERT INTO \`${env.mysqlDatabase}\`.super_admins (id, name, email, password_hash, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [payload.id, payload.name, payload.email, payload.passwordHash],
    );
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },

  async deleteById(id: string): Promise<boolean> {
    const [result] = await dbPool.query(
      `DELETE FROM \`${env.mysqlDatabase}\`.super_admins
       WHERE id = ?
       LIMIT 1`,
      [id],
    );
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },
};
