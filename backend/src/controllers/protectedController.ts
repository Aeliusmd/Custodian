import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import crypto from "crypto";
import { notifyOrgAdmin } from "../services/notificationService";

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const toCategoryFieldType = (value: unknown): string => {
  const v = asString(value).trim().toLowerCase();
  if (v === "number") return "Number";
  if (v === "date") return "Date";
  if (v === "dropdown") return "Dropdown";
  if (v === "nic") return "NIC";
  if (v === "author") return "Author";
  if (v === "email") return "Email";
  if (v === "phone") return "Phone";
  if (v === "url") return "URL";
  return "Text";
};

const sanitizeCategoryCode = (name: string): string =>
  `CAT_${name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24) || "ITEM"}_${Date.now().toString().slice(-6)}`;

const getOrgDbNameFromSession = async (organizationId: string | undefined): Promise<string | null> => {
  if (!organizationId) return null;
  const [orgRows] = await dbPool.query(
    `SELECT db_name
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE id = ?
        AND is_deleted = 0
      LIMIT 1`,
    [organizationId],
  );
  const org = (orgRows as Array<{ db_name: string | null }>)[0];
  return org?.db_name ?? null;
};

const ensureTenantCategoriesSoftDeleteColumn = async (dbName: string): Promise<void> => {
  const [rows] = await dbPool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'categories'
        AND column_name = 'is_deleted'
      LIMIT 1`,
    [dbName],
  );
  const exists = (rows as Array<{ 1: number }>).length > 0;
  if (!exists) {
    await dbPool.query(
      `ALTER TABLE \`${dbName}\`.categories
         ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    );
  }
};

const listCategoriesFromTenant = async (dbName: string) => {
  await ensureTenantCategoriesSoftDeleteColumn(dbName);
  const [categoryRows] = await dbPool.query(
    `SELECT c.id, c.name, c.description, c.created_at, COUNT(d.id) AS doc_count
       FROM \`${dbName}\`.categories c
       LEFT JOIN \`${dbName}\`.documents d
         ON d.category_id = c.id
        AND d.status <> 'deleted'
      WHERE c.is_deleted = 0
      GROUP BY c.id, c.name, c.description, c.created_at
      ORDER BY c.created_at DESC`,
  );

  const base = (categoryRows as Array<{
    id: string;
    name: string;
    description: string | null;
    created_at: Date;
    doc_count: number;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdDate: toIsoDate(new Date(row.created_at)),
    docCount: Number(row.doc_count ?? 0),
    fields: [] as Array<{ id: string; name: string; type: string; required: boolean; options?: string[] }>,
  }));

  if (base.length === 0) return base;
  const ids = base.map((c) => c.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [fieldRows] = await dbPool.query(
    `SELECT id, category_id, field_name, field_type, enum_options, is_required
       FROM \`${dbName}\`.category_metadata_fields
      WHERE category_id IN (${placeholders})
      ORDER BY display_order ASC, created_at ASC`,
    ids,
  );
  const fieldsByCategory = new Map<string, Array<{ id: string; name: string; type: string; required: boolean; options?: string[] }>>();
  for (const row of fieldRows as Array<{
    id: string;
    category_id: string;
    field_name: string;
    field_type: string;
    enum_options: unknown;
    is_required: number;
  }>) {
    const parsedOptions = (() => {
      if (!row.enum_options) return undefined;
      if (Array.isArray(row.enum_options)) return row.enum_options.map((o) => String(o));
      if (typeof row.enum_options === "string") {
        try {
          const parsed = JSON.parse(row.enum_options) as unknown;
          return Array.isArray(parsed) ? parsed.map((o) => String(o)) : undefined;
        } catch {
          return undefined;
        }
      }
      return undefined;
    })();
    const item = {
      id: row.id,
      name: row.field_name,
      type: toCategoryFieldType(row.field_type),
      required: Number(row.is_required ?? 0) === 1,
      ...(parsedOptions ? { options: parsedOptions } : {}),
    };
    const list = fieldsByCategory.get(row.category_id) ?? [];
    list.push(item);
    fieldsByCategory.set(row.category_id, list);
  }

  return base.map((cat) => ({ ...cat, fields: fieldsByCategory.get(cat.id) ?? [] }));
};

const buildDocCode = () => `DOC-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 900 + 100)}`;
const mapUiRoleToDbRole = (role: string): "org_admin" | "user" =>
  role.toLowerCase() === "admin" || role.toLowerCase() === "org_admin" ? "org_admin" : "user";
const mapDbRoleToUiRole = (role: string): "Admin" | "User" =>
  role.toLowerCase() === "org_admin" ? "Admin" : "User";
const mapUiStatusToDbStatus = (status: string): "active" | "inactive" =>
  status.toLowerCase() === "active" ? "active" : "inactive";
const mapDbStatusToUiStatus = (status: string): "Active" | "Inactive" =>
  status.toLowerCase() === "active" ? "Active" : "Inactive";

const listDocumentsFromTenant = async (dbName: string, archived: boolean, uploadedBy?: string) => {
  const params: unknown[] = [archived ? "archived" : "active"];
  const userFilter = uploadedBy ? `AND d.uploaded_by = ?` : "";
  if (uploadedBy) params.push(uploadedBy);
  const [rows] = await dbPool.query(
    `SELECT d.id, d.doc_code, d.name, d.visibility, d.created_at, d.updated_at, d.file_path, d.file_size_kb, d.file_type, d.status,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploaded_by
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.status = ?
        ${userFilter}
      ORDER BY d.created_at DESC`,
    params,
  );
  const docs = rows as Array<{
    id: string;
    doc_code: string;
    name: string;
    visibility: "Public" | "Private";
    created_at: Date;
    updated_at: Date;
    file_path: string | null;
    file_size_kb: number;
    file_type: string;
    status: string;
    category_name: string;
    uploaded_by: string;
  }>;
  if (docs.length === 0) return [];

  const ids = docs.map((d) => d.id);
  const placeholders = ids.map(() => "?").join(", ");
  const [metaRows] = await dbPool.query(
    `SELECT dmv.document_id, cmf.field_name, dmv.value
       FROM \`${dbName}\`.document_metadata_values dmv
       JOIN \`${dbName}\`.category_metadata_fields cmf ON cmf.id = dmv.field_id
      WHERE dmv.document_id IN (${placeholders})`,
    ids,
  );
  const metaMap = new Map<string, Record<string, string>>();
  for (const row of metaRows as Array<{ document_id: string; field_name: string; value: string }>) {
    const entry = metaMap.get(row.document_id) ?? {};
    entry[row.field_name] = row.value ?? "";
    metaMap.set(row.document_id, entry);
  }

  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category_name,
    uploadedBy: d.uploaded_by,
    visibility: d.visibility === "Public" ? "Public" : "Private",
    uploadDate: toIsoDate(new Date(d.created_at)),
    lastUpdated: toIsoDate(new Date(d.updated_at)),
    fileSize: d.file_size_kb >= 1024 ? `${(d.file_size_kb / 1024).toFixed(1)} MB` : `${d.file_size_kb} KB`,
    fileType: String(d.file_type || "FILE").toUpperCase(),
    filePath: d.file_path ?? "",
    metadata: metaMap.get(d.id) ?? {},
    versions: [
      {
        id: `${d.id}-v1`,
        versionName: "v1.0",
        date: toIsoDate(new Date(d.updated_at)),
        uploadedBy: d.uploaded_by,
        isCurrent: true,
      },
    ],
  }));
};

const getDocumentFromTenant = async (dbName: string, id: string) => {
  const [docs] = await dbPool.query(
    `SELECT d.id, d.doc_code, d.name, d.visibility, d.created_at, d.updated_at, d.file_path, d.file_size_kb, d.file_type, d.status,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploaded_by
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.id = ?
        AND d.status <> 'deleted'
      LIMIT 1`,
    [id],
  );
  const row = (docs as Array<{
    id: string;
    name: string;
    visibility: "Public" | "Private";
    created_at: Date;
    updated_at: Date;
    file_path: string | null;
    file_size_kb: number;
    file_type: string;
    category_name: string;
    uploaded_by: string;
  }>)[0];
  if (!row) return null;

  const [metaRows] = await dbPool.query(
    `SELECT cmf.field_name, dmv.value
       FROM \`${dbName}\`.document_metadata_values dmv
       JOIN \`${dbName}\`.category_metadata_fields cmf ON cmf.id = dmv.field_id
      WHERE dmv.document_id = ?`,
    [id],
  );
  const metadata = Object.fromEntries(
    (metaRows as Array<{ field_name: string; value: string }>).map((m) => [m.field_name, m.value ?? ""]),
  );

  return {
    id: row.id,
    name: row.name,
    category: row.category_name,
    uploadedBy: row.uploaded_by,
    visibility: row.visibility === "Public" ? "Public" : "Private",
    uploadDate: toIsoDate(new Date(row.created_at)),
    lastUpdated: toIsoDate(new Date(row.updated_at)),
    fileSize: row.file_size_kb >= 1024 ? `${(row.file_size_kb / 1024).toFixed(1)} MB` : `${row.file_size_kb} KB`,
    fileType: String(row.file_type || "FILE").toUpperCase(),
    filePath: row.file_path ?? "",
    metadata,
    versions: [
      {
        id: `${row.id}-v1`,
        versionName: "v1.0",
        date: toIsoDate(new Date(row.updated_at)),
        uploadedBy: row.uploaded_by,
        isCurrent: true,
      },
    ],
  };
};

export const protectedController = {
  orgAdminData(req: Request, res: Response) {
    return res.status(200).json({
      message: "Org admin protected route access granted",
      user: req.user,
    });
  },

  userData(req: Request, res: Response) {
    return res.status(200).json({
      message: "User protected route access granted",
      user: req.user,
    });
  },

  async orgAdminDashboard(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization context missing in session" });
      }

      const [orgRows] = await dbPool.query(
        `SELECT id, name, db_name, storage_used_gb, storage_limit_gb
           FROM \`${env.mysqlDatabase}\`.organizations
          WHERE id = ?
            AND is_deleted = 0
          LIMIT 1`,
        [req.user.organizationId],
      );
      const org = (orgRows as Array<{
        id: string;
        name: string;
        db_name: string | null;
        storage_used_gb: number | null;
        storage_limit_gb: number | null;
      }>)[0];

      if (!org?.db_name) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const dbName = org.db_name;
      await ensureTenantCategoriesSoftDeleteColumn(dbName);

      const [docCountRows] = await dbPool.query(
        `SELECT COUNT(*) AS total
           FROM \`${dbName}\`.documents
          WHERE status <> 'deleted'`,
      );
      const totalDocuments = Number((docCountRows as Array<{ total: number }>)[0]?.total ?? 0);

      const [uploadedTodayRows] = await dbPool.query(
        `SELECT COUNT(*) AS total
           FROM \`${dbName}\`.documents
          WHERE DATE(created_at) = CURDATE()
            AND status <> 'deleted'`,
      );
      const uploadedToday = Number((uploadedTodayRows as Array<{ total: number }>)[0]?.total ?? 0);

      const [categoryRows] = await dbPool.query(
        `SELECT COUNT(*) AS total
           FROM \`${dbName}\`.categories
          WHERE is_deleted = 0`,
      );
      const totalCategories = Number((categoryRows as Array<{ total: number }>)[0]?.total ?? 0);

      const [weeklyRows] = await dbPool.query(
        `SELECT DATE(created_at) AS day_date, COUNT(*) AS count
           FROM \`${dbName}\`.documents
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND status <> 'deleted'
          GROUP BY DATE(created_at)`,
      );
      const weeklyMap = new Map(
        (weeklyRows as Array<{ day_date: Date; count: number }>).map((r) => [toIsoDate(new Date(r.day_date)), Number(r.count)]),
      );
      const uploadActivity = Array.from({ length: 7 }).map((_, i) => {
        const dt = new Date();
        dt.setDate(dt.getDate() - (6 - i));
        const iso = toIsoDate(dt);
        return {
          day: dt.toLocaleDateString("en-US", { weekday: "short" }),
          count: weeklyMap.get(iso) ?? 0,
        };
      });

      const [categoryDistRows] = await dbPool.query(
        `SELECT c.name, COUNT(d.id) AS count
           FROM \`${dbName}\`.categories c
           LEFT JOIN \`${dbName}\`.documents d
             ON d.category_id = c.id
            AND d.status <> 'deleted'
          WHERE c.is_deleted = 0
          GROUP BY c.id, c.name
          ORDER BY count DESC, c.name ASC
          LIMIT 6`,
      );
      const categoryDist = (categoryDistRows as Array<{ name: string; count: number }>).map((r) => ({
        name: r.name,
        count: Number(r.count ?? 0),
      }));

      const [recentRows] = await dbPool.query(
        `SELECT d.id, d.name, d.visibility, d.created_at,
                COALESCE(c.name, 'Uncategorized') AS category_name,
                COALESCE(u.name, 'Unknown') AS uploaded_by
           FROM \`${dbName}\`.documents d
           LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
           LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
          WHERE d.status <> 'deleted'
          ORDER BY d.created_at DESC
          LIMIT 8`,
      );
      const recentUploads = (recentRows as Array<{
        id: string;
        name: string;
        visibility: "Public" | "Private";
        created_at: Date;
        category_name: string;
        uploaded_by: string;
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category_name,
        uploadedBy: r.uploaded_by,
        date: toIsoDate(new Date(r.created_at)),
        status: r.visibility === "Public" ? "Public" : "Private",
      }));

      const storageUsed = Number(org.storage_used_gb ?? 0);
      const storageTotal = Math.max(1, Number(org.storage_limit_gb ?? 10));
      const storagePct = Math.min(100, Math.round((storageUsed / storageTotal) * 100));

      return res.status(200).json({
        organizationName: org.name,
        stats: {
          totalDocuments,
          uploadedToday,
          totalCategories,
          storageUsedGb: storageUsed,
          storageTotalGb: storageTotal,
          storagePercent: storagePct,
        },
        uploadActivity,
        categoryDist,
        recentUploads,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch org admin dashboard";
      return res.status(500).json({ message });
    }
  },

  async listOrgAdminCategories(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const categories = await listCategoriesFromTenant(dbName);
      return res.status(200).json(categories);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load categories";
      return res.status(500).json({ message });
    }
  },

  async createOrgAdminCategory(req: Request, res: Response) {
    const conn = await dbPool.getConnection();
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      await ensureTenantCategoriesSoftDeleteColumn(dbName);

      const body = (req.body ?? {}) as {
        name?: string;
        description?: string;
        fields?: Array<{ name?: string; type?: string; required?: boolean; options?: string[] }>;
      };
      const name = asString(body.name).trim();
      if (!name) return res.status(400).json({ message: "Category name is required" });
      const description = asString(body.description).trim();
      const fields = Array.isArray(body.fields) ? body.fields : [];

      await conn.beginTransaction();
      const categoryId = crypto.randomUUID();
      await conn.query(
        `INSERT INTO \`${dbName}\`.categories (id, category_code, name, description, document_count)
         VALUES (?, ?, ?, ?, 0)`,
        [categoryId, sanitizeCategoryCode(name), name, description || null],
      );

      let order = 1;
      for (const field of fields) {
        const fieldName = asString(field.name).trim();
        if (!fieldName) continue;
        const fieldType = toCategoryFieldType(field.type);
        const options =
          fieldType === "Dropdown"
            ? (Array.isArray(field.options) ? field.options.map((o) => String(o).trim()).filter(Boolean) : [])
            : [];
        await conn.query(
          `INSERT INTO \`${dbName}\`.category_metadata_fields
            (id, category_id, field_name, field_type, enum_options, is_required, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            categoryId,
            fieldName,
            fieldType,
            fieldType === "Dropdown" ? JSON.stringify(options) : null,
            field.required ? 1 : 0,
            order,
          ],
        );
        order += 1;
      }
      await conn.commit();
      const categories = await listCategoriesFromTenant(dbName);
      const created = categories.find((c) => c.id === categoryId);
      return res.status(201).json(created ?? null);
    } catch (error) {
      await conn.rollback();
      const message = error instanceof Error ? error.message : "Failed to create category";
      return res.status(400).json({ message });
    } finally {
      conn.release();
    }
  },

  async updateOrgAdminCategory(req: Request, res: Response) {
    const conn = await dbPool.getConnection();
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      await ensureTenantCategoriesSoftDeleteColumn(dbName);
      const categoryId = asString(req.params.id);
      if (!categoryId) return res.status(400).json({ message: "Category id is required" });

      const body = (req.body ?? {}) as {
        name?: string;
        description?: string;
        fields?: Array<{ name?: string; type?: string; required?: boolean; options?: string[] }>;
      };
      const name = asString(body.name).trim();
      if (!name) return res.status(400).json({ message: "Category name is required" });
      const description = asString(body.description).trim();
      const fields = Array.isArray(body.fields) ? body.fields : [];

      await conn.beginTransaction();
      const [updateResult] = await conn.query(
        `UPDATE \`${dbName}\`.categories
            SET name = ?, description = ?, updated_at = NOW()
          WHERE id = ?
            AND is_deleted = 0`,
        [name, description || null, categoryId],
      );
      if (Number((updateResult as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        await conn.rollback();
        return res.status(404).json({ message: "Category not found" });
      }

      await conn.query(`DELETE FROM \`${dbName}\`.category_metadata_fields WHERE category_id = ?`, [categoryId]);
      let order = 1;
      for (const field of fields) {
        const fieldName = asString(field.name).trim();
        if (!fieldName) continue;
        const fieldType = toCategoryFieldType(field.type);
        const options =
          fieldType === "Dropdown"
            ? (Array.isArray(field.options) ? field.options.map((o) => String(o).trim()).filter(Boolean) : [])
            : [];
        await conn.query(
          `INSERT INTO \`${dbName}\`.category_metadata_fields
            (id, category_id, field_name, field_type, enum_options, is_required, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            categoryId,
            fieldName,
            fieldType,
            fieldType === "Dropdown" ? JSON.stringify(options) : null,
            field.required ? 1 : 0,
            order,
          ],
        );
        order += 1;
      }
      await conn.commit();
      return res.status(200).json({ success: true });
    } catch (error) {
      await conn.rollback();
      const message = error instanceof Error ? error.message : "Failed to update category";
      return res.status(400).json({ message });
    } finally {
      conn.release();
    }
  },

  async deleteOrgAdminCategory(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      await ensureTenantCategoriesSoftDeleteColumn(dbName);
      const categoryId = asString(req.params.id);
      if (!categoryId) return res.status(400).json({ message: "Category id is required" });

      const [docRows] = await dbPool.query(
        `SELECT COUNT(*) AS total FROM \`${dbName}\`.documents WHERE category_id = ? AND status <> 'deleted'`,
        [categoryId],
      );
      const docCount = Number((docRows as Array<{ total: number }>)[0]?.total ?? 0);
      if (docCount > 0) {
        return res.status(400).json({ message: "Cannot delete category with existing documents" });
      }

      const [result] = await dbPool.query(
        `UPDATE \`${dbName}\`.categories
            SET is_deleted = 1,
                updated_at = NOW()
          WHERE id = ?
            AND is_deleted = 0
          LIMIT 1`,
        [categoryId],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "Category not found" });
      }
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete category";
      return res.status(500).json({ message });
    }
  },

  async createOrgAdminSingleDocument(req: Request, res: Response) {
    const conn = await dbPool.getConnection();
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });

      const body = (req.body ?? {}) as {
        categoryId?: string;
        fileName?: string;
        fileType?: string;
        fileSizeKb?: number;
        pageCount?: number;
        visibility?: "Public" | "Private";
        metadata?: Record<string, string>;
      };

      const categoryId = asString(body.categoryId).trim();
      const fileName = asString(body.fileName).trim();
      const fileType = asString(body.fileType).trim() || "unknown";
      const fileSizeKb = Number(body.fileSizeKb ?? 0);
      const pageCount = Number(body.pageCount ?? 0);
      const visibility = body.visibility === "Public" ? "Public" : "Private";
      const metadata = body.metadata ?? {};

      if (!categoryId) return res.status(400).json({ message: "Category is required" });
      if (!fileName) return res.status(400).json({ message: "File is required" });

      await conn.beginTransaction();

      const [catRows] = await conn.query(
        `SELECT id
           FROM \`${dbName}\`.categories
          WHERE id = ?
            AND is_deleted = 0
          LIMIT 1`,
        [categoryId],
      );
      const category = (catRows as Array<{ id: string }>)[0];
      if (!category?.id) {
        await conn.rollback();
        return res.status(404).json({ message: "Category not found" });
      }

      const [fieldRows] = await conn.query(
        `SELECT id, is_required
           FROM \`${dbName}\`.category_metadata_fields
          WHERE category_id = ?`,
        [categoryId],
      );
      const fields = fieldRows as Array<{ id: string; is_required: number }>;
      for (const field of fields) {
        if (Number(field.is_required ?? 0) === 1 && !asString(metadata[field.id]).trim()) {
          await conn.rollback();
          return res.status(400).json({ message: "Required metadata is missing" });
        }
      }

      const documentId = crypto.randomUUID();
      const docCode = buildDocCode();
      const storedPath = `uploads/${documentId}-${fileName}`;
      await conn.query(
        `INSERT INTO \`${dbName}\`.documents
          (id, category_id, uploaded_by, doc_code, name, file_path, file_type, file_size_kb, page_count, visibility, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          documentId,
          categoryId,
          req.user?.id ?? "",
          docCode,
          fileName,
          storedPath,
          fileType,
          Number.isFinite(fileSizeKb) ? Math.max(0, Math.round(fileSizeKb)) : 0,
          Number.isFinite(pageCount) ? Math.max(0, Math.round(pageCount)) : 0,
          visibility,
        ],
      );

      for (const field of fields) {
        const value = asString(metadata[field.id]).trim();
        if (!value) continue;
        await conn.query(
          `INSERT INTO \`${dbName}\`.document_metadata_values (id, document_id, field_id, value)
           VALUES (?, ?, ?, ?)`,
          [crypto.randomUUID(), documentId, field.id, value],
        );
      }

      await conn.commit();

      void notifyOrgAdmin(req.user?.organizationId ?? "", "document_uploads", {
        actorName: req.user?.fullName,
        actorEmail: req.user?.email,
        fileName: fileName,
        categoryName: categoryId,
      });

      return res.status(201).json({
        id: documentId,
        docCode,
        name: fileName,
        visibility,
      });
    } catch (error) {
      await conn.rollback();
      const message = error instanceof Error ? error.message : "Failed to upload document";
      return res.status(400).json({ message });
    } finally {
      conn.release();
    }
  },

  async listOrgAdminUsers(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const [rows] = await dbPool.query(
        `SELECT id, name, email, role, status, created_at
           FROM \`${dbName}\`.users
          ORDER BY created_at DESC`,
      );
      const users = (rows as Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
        created_at: Date;
      }>).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: mapDbRoleToUiRole(u.role),
        status: mapDbStatusToUiStatus(u.status),
        createdDate: toIsoDate(new Date(u.created_at)),
        avatar: u.name
          .split(" ")
          .map((p) => p.trim()[0] ?? "")
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      }));
      return res.status(200).json(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load users";
      return res.status(500).json({ message });
    }
  },

  async createOrgAdminUser(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const body = (req.body ?? {}) as {
        name?: string;
        email?: string;
        password?: string;
        role?: string;
        status?: string;
      };
      const name = asString(body.name).trim();
      const email = asString(body.email).trim().toLowerCase();
      const password = asString(body.password);
      const role = mapUiRoleToDbRole(asString(body.role));
      const status = mapUiStatusToDbStatus(asString(body.status));

      if (!name) return res.status(400).json({ message: "Name is required" });
      if (!email) return res.status(400).json({ message: "Email is required" });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Invalid email address" });
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();
      await dbPool.query(
        `INSERT INTO \`${dbName}\`.users (id, name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, name, email, passwordHash, role, status],
      );

      void notifyOrgAdmin(req.user?.organizationId ?? "", "team_updates", {
        actorName: req.user?.fullName,
        actorEmail: req.user?.email,
        actionType: "added",
        userName: name,
        userEmail: email,
      });

      return res.status(201).json({ id: userId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      if (message.toLowerCase().includes("uq_users_email") || message.toLowerCase().includes("duplicate")) {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(400).json({ message });
    }
  },

  async updateOrgAdminUser(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "User id is required" });
      const body = (req.body ?? {}) as {
        name?: string;
        email?: string;
        role?: string;
        status?: string;
      };
      const name = asString(body.name).trim();
      const email = asString(body.email).trim().toLowerCase();
      const role = mapUiRoleToDbRole(asString(body.role));
      const status = mapUiStatusToDbStatus(asString(body.status));
      if (!name) return res.status(400).json({ message: "Name is required" });
      if (!email) return res.status(400).json({ message: "Email is required" });

      const [result] = await dbPool.query(
        `UPDATE \`${dbName}\`.users
            SET name = ?, email = ?, role = ?, status = ?, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [name, email, role, status, id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      void notifyOrgAdmin(req.user?.organizationId ?? "", "team_updates", {
        actorName: req.user?.fullName,
        actorEmail: req.user?.email,
        actionType: "updated",
        userName: name,
        userEmail: email,
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      if (message.toLowerCase().includes("uq_users_email") || message.toLowerCase().includes("duplicate")) {
        return res.status(400).json({ message: "Email already exists" });
      }
      return res.status(400).json({ message });
    }
  },

  async deleteOrgAdminUser(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "User id is required" });
      if (req.user?.id === id) return res.status(400).json({ message: "You cannot delete your own account" });
      const [result] = await dbPool.query(
        `DELETE FROM \`${dbName}\`.users
          WHERE id = ?
          LIMIT 1`,
        [id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      void notifyOrgAdmin(req.user?.organizationId ?? "", "team_updates", {
        actorName: req.user?.fullName,
        actorEmail: req.user?.email,
        actionType: "removed",
        userName: id,
      });

      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      return res.status(400).json({ message });
    }
  },

  async resetOrgAdminUserPassword(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "User id is required" });
      const password = asString((req.body as { password?: string })?.password);
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await dbPool.query(
        `UPDATE \`${dbName}\`.users
            SET password_hash = ?, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [passwordHash, id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      return res.status(400).json({ message });
    }
  },

  async createOrgAdminBulkDocuments(req: Request, res: Response) {
    const conn = await dbPool.getConnection();
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });

      const body = (req.body ?? {}) as {
        categoryId?: string;
        visibility?: "Public" | "Private";
        documents?: Array<{
          fileName?: string;
          fileType?: string;
          fileSizeKb?: number;
          pageCount?: number;
          metadata?: Record<string, string>;
        }>;
      };
      const categoryId = asString(body.categoryId).trim();
      const visibility = body.visibility === "Public" ? "Public" : "Private";
      const documents = Array.isArray(body.documents) ? body.documents : [];
      if (!categoryId) return res.status(400).json({ message: "Category is required" });
      if (documents.length === 0) return res.status(400).json({ message: "At least one document is required" });

      await conn.beginTransaction();

      const [catRows] = await conn.query(
        `SELECT id
           FROM \`${dbName}\`.categories
          WHERE id = ?
            AND is_deleted = 0
          LIMIT 1`,
        [categoryId],
      );
      const category = (catRows as Array<{ id: string }>)[0];
      if (!category?.id) {
        await conn.rollback();
        return res.status(404).json({ message: "Category not found" });
      }

      const [fieldRows] = await conn.query(
        `SELECT id, is_required
           FROM \`${dbName}\`.category_metadata_fields
          WHERE category_id = ?`,
        [categoryId],
      );
      const fields = fieldRows as Array<{ id: string; is_required: number }>;

      const created: Array<{ id: string; docCode: string; name: string }> = [];
      for (const item of documents) {
        const fileName = asString(item.fileName).trim();
        if (!fileName) continue;
        const metadata = item.metadata ?? {};
        for (const field of fields) {
          if (Number(field.is_required ?? 0) === 1 && !asString(metadata[field.id]).trim()) {
            await conn.rollback();
            return res.status(400).json({ message: `Required metadata missing for file ${fileName}` });
          }
        }

        const documentId = crypto.randomUUID();
        const docCode = buildDocCode();
        const fileType = asString(item.fileType).trim() || "unknown";
        const fileSizeKb = Number(item.fileSizeKb ?? 0);
        const pageCount = Number(item.pageCount ?? 0);
        const storedPath = `uploads/${documentId}-${fileName}`;
        await conn.query(
          `INSERT INTO \`${dbName}\`.documents
            (id, category_id, uploaded_by, doc_code, name, file_path, file_type, file_size_kb, page_count, visibility, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            documentId,
            categoryId,
            req.user?.id ?? "",
            docCode,
            fileName,
            storedPath,
            fileType,
            Number.isFinite(fileSizeKb) ? Math.max(0, Math.round(fileSizeKb)) : 0,
            Number.isFinite(pageCount) ? Math.max(0, Math.round(pageCount)) : 0,
            visibility,
          ],
        );

        for (const field of fields) {
          const value = asString(metadata[field.id]).trim();
          if (!value) continue;
          await conn.query(
            `INSERT INTO \`${dbName}\`.document_metadata_values (id, document_id, field_id, value)
             VALUES (?, ?, ?, ?)`,
            [crypto.randomUUID(), documentId, field.id, value],
          );
        }
        created.push({ id: documentId, docCode, name: fileName });
      }

      await conn.commit();

      const successCount = created.length;
      if (successCount > 0) {
        void notifyOrgAdmin(req.user?.organizationId ?? "", "document_uploads", {
          actorName: req.user?.fullName,
          actorEmail: req.user?.email,
          fileName: `${successCount} document(s)`,
        });
      }

      return res.status(201).json({ uploaded: created.length, documents: created });
    } catch (error) {
      await conn.rollback();
      const message = error instanceof Error ? error.message : "Failed to bulk upload documents";
      return res.status(400).json({ message });
    } finally {
      conn.release();
    }
  },

  async listOrgAdminDocuments(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const archived = asString(req.query.archived) === "1";
      const docs = await listDocumentsFromTenant(dbName, archived);
      return res.status(200).json(docs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load documents";
      return res.status(500).json({ message });
    }
  },

  async listUserDocuments(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const archived = asString(req.query.archived) === "1";
      const docs = await listDocumentsFromTenant(dbName, archived, req.user?.id);
      return res.status(200).json(docs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load documents";
      return res.status(500).json({ message });
    }
  },

  async getOrgAdminDocument(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const doc = await getDocumentFromTenant(dbName, id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      return res.status(200).json(doc);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load document";
      return res.status(500).json({ message });
    }
  },

  async updateOrgAdminDocumentArchiveStatus(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const archived = Boolean((req.body as { archived?: boolean })?.archived);
      const [result] = await dbPool.query(
        `UPDATE \`${dbName}\`.documents
            SET status = ?, updated_at = NOW()
          WHERE id = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [archived ? "archived" : "active", id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "Document not found" });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update archive status";
      return res.status(400).json({ message });
    }
  },

  async updateOrgAdminDocumentMetadata(req: Request, res: Response) {
    const conn = await dbPool.getConnection();
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const metadata = ((req.body as { metadata?: Record<string, string> })?.metadata ?? {}) as Record<string, string>;

      await conn.beginTransaction();
      const [docRows] = await conn.query(
        `SELECT category_id
           FROM \`${dbName}\`.documents
          WHERE id = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [id],
      );
      const doc = (docRows as Array<{ category_id: string }>)[0];
      if (!doc?.category_id) {
        await conn.rollback();
        return res.status(404).json({ message: "Document not found" });
      }

      const [fieldRows] = await conn.query(
        `SELECT id, field_name
           FROM \`${dbName}\`.category_metadata_fields
          WHERE category_id = ?`,
        [doc.category_id],
      );
      const fieldByName = new Map(
        (fieldRows as Array<{ id: string; field_name: string }>).map((f) => [f.field_name, f.id]),
      );

      await conn.query(`DELETE FROM \`${dbName}\`.document_metadata_values WHERE document_id = ?`, [id]);
      for (const [name, value] of Object.entries(metadata)) {
        const fieldId = fieldByName.get(name);
        if (!fieldId) continue;
        if (!asString(value).trim()) continue;
        await conn.query(
          `INSERT INTO \`${dbName}\`.document_metadata_values (id, document_id, field_id, value)
           VALUES (?, ?, ?, ?)`,
          [crypto.randomUUID(), id, fieldId, asString(value).trim()],
        );
      }
      await conn.query(
        `UPDATE \`${dbName}\`.documents
            SET updated_at = NOW()
          WHERE id = ?`,
        [id],
      );
      await conn.commit();
      return res.status(200).json({ success: true });
    } catch (error) {
      await conn.rollback();
      const message = error instanceof Error ? error.message : "Failed to update metadata";
      return res.status(400).json({ message });
    } finally {
      conn.release();
    }
  },

  async deleteOrgAdminDocument(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const [result] = await dbPool.query(
        `UPDATE \`${dbName}\`.documents
            SET status = 'deleted', updated_at = NOW()
          WHERE id = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "Document not found" });
      }
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete document";
      return res.status(400).json({ message });
    }
  },

  async userDashboard(req: Request, res: Response) {
    try {
      if (!req.user?.organizationId) {
        return res.status(400).json({ message: "Organization context missing in session" });
      }
      const userId = req.user.id;

      const [orgRows] = await dbPool.query(
        `SELECT id, name, db_name, storage_used_gb, storage_limit_gb
           FROM \`${env.mysqlDatabase}\`.organizations
          WHERE id = ?
            AND is_deleted = 0
          LIMIT 1`,
        [req.user.organizationId],
      );
      const org = (orgRows as Array<{
        id: string;
        name: string;
        db_name: string | null;
        storage_used_gb: number | null;
        storage_limit_gb: number | null;
      }>)[0];
      if (!org?.db_name) return res.status(404).json({ message: "Organization not found" });

      const dbName = org.db_name;
      await ensureTenantCategoriesSoftDeleteColumn(dbName);

      const [myUploadRows] = await dbPool.query(
        `SELECT COUNT(*) AS total FROM \`${dbName}\`.documents WHERE uploaded_by = ? AND status <> 'deleted'`,
        [userId],
      );
      const myUploads = Number((myUploadRows as Array<{ total: number }>)[0]?.total ?? 0);

      const [sharedRows] = await dbPool.query(
        `SELECT COUNT(*) AS total FROM \`${dbName}\`.documents WHERE uploaded_by <> ? AND visibility = 'Public' AND status <> 'deleted'`,
        [userId],
      );
      const sharedWithMe = Number((sharedRows as Array<{ total: number }>)[0]?.total ?? 0);

      const [weeklyRows] = await dbPool.query(
        `SELECT DATE(created_at) AS day_date, COUNT(*) AS count
           FROM \`${dbName}\`.documents
          WHERE uploaded_by = ?
            AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            AND status <> 'deleted'
          GROUP BY DATE(created_at)`,
        [userId],
      );
      const weeklyMap = new Map(
        (weeklyRows as Array<{ day_date: Date; count: number }>).map((r) => [toIsoDate(new Date(r.day_date)), Number(r.count)]),
      );
      const uploadActivity = Array.from({ length: 7 }).map((_, i) => {
        const dt = new Date();
        dt.setDate(dt.getDate() - (6 - i));
        const iso = toIsoDate(dt);
        return { day: dt.toLocaleDateString("en-US", { weekday: "short" }), count: weeklyMap.get(iso) ?? 0 };
      });

      const [categoryDistRows] = await dbPool.query(
        `SELECT c.name, COUNT(d.id) AS count
           FROM \`${dbName}\`.categories c
           LEFT JOIN \`${dbName}\`.documents d
             ON d.category_id = c.id
            AND d.uploaded_by = ?
            AND d.status <> 'deleted'
          WHERE c.is_deleted = 0
          GROUP BY c.id, c.name
          ORDER BY count DESC, c.name ASC
          LIMIT 6`,
        [userId],
      );
      const categoryDist = (categoryDistRows as Array<{ name: string; count: number }>).map((r) => ({
        name: r.name,
        count: Number(r.count ?? 0),
      }));

      const [recentRows] = await dbPool.query(
        `SELECT d.id, d.name, d.visibility, d.created_at,
                COALESCE(c.name, 'Uncategorized') AS category_name,
                COALESCE(u.name, 'Unknown') AS uploaded_by
           FROM \`${dbName}\`.documents d
           LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
           LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
          WHERE d.uploaded_by = ?
            AND d.status <> 'deleted'
          ORDER BY d.created_at DESC
          LIMIT 6`,
        [userId],
      );
      const recentDocs = (recentRows as Array<{
        id: string;
        name: string;
        visibility: "Public" | "Private";
        created_at: Date;
        category_name: string;
        uploaded_by: string;
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category_name,
        uploadedBy: r.uploaded_by,
        date: toIsoDate(new Date(r.created_at)),
        status: r.visibility === "Public" ? "Public" : "Private",
      }));

      const [sharedDocsRows] = await dbPool.query(
        `SELECT d.id, d.name, d.created_at,
                COALESCE(c.name, 'Uncategorized') AS category_name,
                COALESCE(u.name, 'Unknown') AS shared_by
           FROM \`${dbName}\`.documents d
           LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
           LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
          WHERE d.uploaded_by <> ?
            AND d.visibility = 'Public'
            AND d.status <> 'deleted'
          ORDER BY d.created_at DESC
          LIMIT 4`,
        [userId],
      );
      const sharedDocs = (sharedDocsRows as Array<{
        id: string;
        name: string;
        created_at: Date;
        category_name: string;
        shared_by: string;
      }>).map((r) => ({
        id: r.id,
        name: r.name,
        sharedBy: r.shared_by,
        date: toIsoDate(new Date(r.created_at)),
        category: r.category_name,
      }));

      const storageUsed = Number(org.storage_used_gb ?? 0);
      const storageTotal = Math.max(1, Number(org.storage_limit_gb ?? 10));
      const storagePct = Math.min(100, Math.round((storageUsed / storageTotal) * 100));
      const thisWeekCount = uploadActivity.reduce((s, d) => s + d.count, 0);

      return res.status(200).json({
        userName: req.user.fullName ?? "User",
        stats: {
          myUploads,
          sharedWithMe,
          storageUsedGb: storageUsed,
          storageTotalGb: storageTotal,
          storagePercent: storagePct,
          thisWeekCount,
        },
        uploadActivity,
        categoryDist,
        recentDocs,
        sharedDocs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user dashboard";
      return res.status(500).json({ message });
    }
  },

  async searchUserDocuments(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });

      const q = asString(req.query.q).trim();
      if (!q) return res.status(200).json([]);

      const like = `%${q}%`;
      const [rows] = await dbPool.query(
        `SELECT d.id, d.name, d.created_at, d.uploaded_by AS uploaded_by_id,
                COALESCE(c.name, 'Uncategorized') AS category_name,
                COALESCE(u.name, 'Unknown') AS uploader_name
           FROM \`${dbName}\`.documents d
           LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
           LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
          WHERE d.status <> 'deleted'
            AND (d.name LIKE ? OR c.name LIKE ?)
          ORDER BY d.created_at DESC
          LIMIT 30`,
        [like, like],
      );

      const results = (rows as Array<{
        id: string;
        name: string;
        created_at: Date;
        category_name: string;
        uploader_name: string;
      }>).map((r) => ({
        id: r.id,
        documentName: r.name,
        snippet: `Document matching "${q}" in ${r.category_name}`,
        category: r.category_name,
        uploadDate: toIsoDate(new Date(r.created_at)),
        uploadedBy: r.uploader_name,
        keywords: [q],
      }));

      return res.status(200).json(results);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to search documents";
      return res.status(500).json({ message });
    }
  },

  superAdminData(req: Request, res: Response) {
    return res.status(200).json({
      message: "Super admin protected route access granted",
      user: req.user,
    });
  },
};
