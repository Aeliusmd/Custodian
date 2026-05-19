import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import {
  runGlobalSearch,
  searchActiveReadyDocumentsForGlobalSearch,
} from "../services/globalSearchService";
import {
  indexDocumentInSearch,
  removeDocumentFromSearch,
  reindexTenantSearchDocuments,
} from "../services/documentSearchIndexService";
import { enqueueDocumentOcr } from "../services/documentOcrQueue";
import { absoluteFromStorageRoot, previewPageRelativePath, unlinkQuiet, writeUploadedDocumentFile } from "../services/documentStorageService";
import { sanitizeStoredFileName } from "../utils/uploadFileName";
import { notifyOrgAdmin } from "../services/notificationService";
import { settingsModel } from "../models/settingsModel";

const recordOrgActivity = async (
  actorUserId: string,
  organizationId: string,
  entry: { action: string; module: string; description: string },
) => {
  try {
    await settingsModel.addActivity(actorUserId, organizationId, {
      id: crypto.randomUUID(),
      date_time: new Date().toISOString(),
      action: entry.action,
      module: entry.module,
      description: entry.description,
    });
  } catch (err) {
    console.error("Failed to record org activity:", err);
  }
};

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const asString = (value: unknown): string => (typeof value === "string" ? value : "");

/** Multer / append-field may store values as string, string[], or Buffer. */
const firstMultipartField = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === "string") return first;
    if (Buffer.isBuffer(first)) return first.toString("utf8");
    return "";
  }
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (value != null && typeof value !== "object") return String(value);
  return "";
};

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

const getOrganizationIdFromDbName = async (dbName: string): Promise<string | null> => {
  const [orgRows] = await dbPool.query(
    `SELECT id
       FROM \`${env.mysqlDatabase}\`.organizations
      WHERE db_name = ?
        AND is_deleted = 0
      LIMIT 1`,
    [dbName],
  );
  const org = (orgRows as Array<{ id: string }>)[0];
  return org?.id ?? null;
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

const ensureTenantDocumentsOcrColumn = async (dbName: string): Promise<void> => {
  const [rows] = await dbPool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'documents'
        AND column_name = 'ocr_text_path'
      LIMIT 1`,
    [dbName],
  );
  const exists = (rows as Array<{ 1: number }>).length > 0;
  if (!exists) {
    await dbPool.query(
      `ALTER TABLE \`${dbName}\`.documents
         ADD COLUMN ocr_text_path VARCHAR(512) NULL`,
    );
  }
};

const ensureTenantDocumentsOcrStatusColumn = async (dbName: string): Promise<void> => {
  const [rows] = await dbPool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'documents'
        AND column_name = 'ocr_status'
      LIMIT 1`,
    [dbName],
  );
  const exists = (rows as Array<{ 1: number }>).length > 0;
  if (!exists) {
    await dbPool.query(
      `ALTER TABLE \`${dbName}\`.documents
         ADD COLUMN ocr_status ENUM('none','pending','ready','failed') NOT NULL DEFAULT 'none'`,
    );
  }
};

const ensureTenantDocumentsPreviewPageCountColumn = async (dbName: string): Promise<void> => {
  const [rows] = await dbPool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'documents'
        AND column_name = 'preview_page_count'
      LIMIT 1`,
    [dbName],
  );
  const exists = (rows as Array<{ 1: number }>).length > 0;
  if (!exists) {
    await dbPool.query(
      `ALTER TABLE \`${dbName}\`.documents
         ADD COLUMN preview_page_count INT NOT NULL DEFAULT 0`,
    );
  }
};

const ensureTenantDocumentsOcrSchema = async (dbName: string): Promise<void> => {
  await ensureTenantDocumentsOcrColumn(dbName);
  await ensureTenantDocumentsOcrStatusColumn(dbName);
  await ensureTenantDocumentsPreviewPageCountColumn(dbName);
};

const mapDbOcrStatusToApi = (value: string | null | undefined): "None" | "Pending" | "Ready" | "Failed" => {
  const v = (value ?? "none").toLowerCase();
  if (v === "pending") return "Pending";
  if (v === "failed") return "Failed";
  if (v === "ready") return "Ready";
  return "None";
};

const MAX_OCR_SNIPPET_CHARS = 500_000;

const isPathWithinStorageRoot = (storageRoot: string, candidateAbsolute: string): boolean => {
  const root = path.resolve(storageRoot);
  const abs = path.resolve(candidateAbsolute);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  return abs === root || abs.startsWith(rootWithSep);
};

const mimeTypeForDocumentFile = (fileName: string, absoluteFallback: string): string => {
  const ext = path.extname(fileName).toLowerCase() || path.extname(absoluteFallback).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".html": "text/html",
    ".htm": "text/html",
    ".json": "application/json",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
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
  await ensureTenantCategoriesSoftDeleteColumn(dbName);
  await ensureTenantDocumentsOcrSchema(dbName);
  const params: unknown[] = [archived ? "archived" : "active"];
  const userFilter = uploadedBy ? `AND d.uploaded_by = ?` : "";
  if (uploadedBy) params.push(uploadedBy);
  const [rows] = await dbPool.query(
    `SELECT d.id, d.doc_code, d.name, d.visibility, d.created_at, d.updated_at, d.file_path, d.ocr_text_path, d.ocr_status, d.file_size_kb, d.file_type, d.status, d.preview_page_count,
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
    ocr_text_path: string | null;
    ocr_status: string;
    file_size_kb: number;
    file_type: string;
    status: string;
    preview_page_count: number;
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
    ocrTextPath: d.ocr_text_path ?? "",
    ocrStatus: mapDbOcrStatusToApi(d.ocr_status),
    previewPageCount: Math.max(0, Math.floor(Number(d.preview_page_count ?? 0))),
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

const ADVANCED_SEARCH_LIMIT = 200;

type AdvancedSearchCriteria = {
  docName?: string;
  category?: string;
  uploadedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  metadata?: Record<string, string>;
};

const mapDocumentRowsWithMetadata = (
  docs: Array<{
    id: string;
    name: string;
    visibility: "Public" | "Private";
    created_at: Date;
    updated_at: Date;
    file_path: string | null;
    ocr_text_path: string | null;
    ocr_status: string;
    file_size_kb: number;
    file_type: string;
    preview_page_count: number;
    category_name: string;
    uploaded_by: string;
  }>,
  metaMap: Map<string, Record<string, string>>,
) =>
  docs.map((d) => ({
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
    ocrTextPath: d.ocr_text_path ?? "",
    ocrStatus: mapDbOcrStatusToApi(d.ocr_status),
    previewPageCount: Math.max(0, Math.floor(Number(d.preview_page_count ?? 0))),
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

const advancedSearchDocumentsFromTenant = async (
  dbName: string,
  criteria: AdvancedSearchCriteria,
  options?: { uploadedByUserId?: string; archived?: boolean },
) => {
  await ensureTenantCategoriesSoftDeleteColumn(dbName);
  await ensureTenantDocumentsOcrSchema(dbName);

  const status = options?.archived ? "archived" : "active";
  const conditions: string[] = ["d.status = ?"];
  const params: unknown[] = [status];

  if (!options?.archived) {
    conditions.push("d.ocr_status = 'ready'");
  }

  if (options?.uploadedByUserId) {
    conditions.push("d.uploaded_by = ?");
    params.push(options.uploadedByUserId);
  }

  const docName = asString(criteria.docName).trim();
  if (docName) {
    conditions.push("LOWER(d.name) LIKE LOWER(?)");
    params.push(`%${docName}%`);
  }

  const category = asString(criteria.category).trim();
  if (category) {
    conditions.push("c.name = ?");
    params.push(category);
  }

  const uploadedBy = asString(criteria.uploadedBy).trim();
  if (uploadedBy) {
    conditions.push("u.name = ?");
    params.push(uploadedBy);
  }

  const dateFrom = asString(criteria.dateFrom).trim();
  if (dateFrom) {
    conditions.push("DATE(d.created_at) >= ?");
    params.push(dateFrom);
  }

  const dateTo = asString(criteria.dateTo).trim();
  if (dateTo) {
    conditions.push("DATE(d.created_at) <= ?");
    params.push(dateTo);
  }

  const keyword = asString(criteria.keyword).trim();
  if (keyword) {
    const kwLike = `%${keyword}%`;
    conditions.push(
      `(
        LOWER(d.name) LIKE LOWER(?)
        OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?)
        OR EXISTS (
          SELECT 1
            FROM \`${dbName}\`.document_metadata_values dmv_kw
           WHERE dmv_kw.document_id = d.id
             AND LOWER(dmv_kw.value) LIKE LOWER(?)
        )
      )`,
    );
    params.push(kwLike, kwLike, kwLike);
  }

  const metadata = criteria.metadata ?? {};
  for (const [fieldKey, rawValue] of Object.entries(metadata)) {
    const key = asString(fieldKey).trim();
    const value = asString(rawValue).trim();
    if (!key || !value) continue;
    const valueLike = `%${value}%`;
    conditions.push(
      `(
        EXISTS (
          SELECT 1
            FROM \`${dbName}\`.document_metadata_values dmv_f
            JOIN \`${dbName}\`.category_metadata_fields cmf_f
              ON cmf_f.id = dmv_f.field_id
             AND cmf_f.category_id = d.category_id
           WHERE dmv_f.document_id = d.id
             AND (cmf_f.id = ? OR LOWER(cmf_f.field_name) = LOWER(?))
             AND LOWER(dmv_f.value) LIKE LOWER(?)
        )
        OR EXISTS (
          SELECT 1
            FROM \`${dbName}\`.document_metadata_values dmv_any
           WHERE dmv_any.document_id = d.id
             AND LOWER(dmv_any.value) LIKE LOWER(?)
        )
      )`,
    );
    params.push(key, key, valueLike, valueLike);
  }

  const [idRows] = await dbPool.query(
    `SELECT d.id
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE ${conditions.join(" AND ")}
      ORDER BY d.created_at DESC
      LIMIT ${ADVANCED_SEARCH_LIMIT}`,
    params,
  );

  const ids = (idRows as Array<{ id: string }>).map((r) => r.id);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await dbPool.query(
    `SELECT d.id, d.name, d.visibility, d.created_at, d.updated_at, d.file_path, d.ocr_text_path, d.ocr_status, d.file_size_kb, d.file_type, d.preview_page_count,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploaded_by
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.id IN (${placeholders})
      ORDER BY d.created_at DESC`,
    ids,
  );

  const docs = rows as Array<{
    id: string;
    name: string;
    visibility: "Public" | "Private";
    created_at: Date;
    updated_at: Date;
    file_path: string | null;
    ocr_text_path: string | null;
    ocr_status: string;
    file_size_kb: number;
    file_type: string;
    preview_page_count: number;
    category_name: string;
    uploaded_by: string;
  }>;

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

  return mapDocumentRowsWithMetadata(docs, metaMap);
};

const parseAdvancedSearchBody = (body: unknown) => {
  const raw = (body ?? {}) as {
    docName?: string;
    category?: string;
    uploadedBy?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    metadata?: Record<string, string>;
    archived?: boolean;
  };
  const metadata: Record<string, string> = {};
  if (raw.metadata && typeof raw.metadata === "object") {
    for (const [key, val] of Object.entries(raw.metadata)) {
      const fieldKey = asString(key).trim();
      const value = asString(val).trim();
      if (fieldKey && value) metadata[fieldKey] = value;
    }
  }
  return {
    criteria: {
      docName: asString(raw.docName).trim(),
      category: asString(raw.category).trim(),
      uploadedBy: asString(raw.uploadedBy).trim(),
      dateFrom: asString(raw.dateFrom).trim(),
      dateTo: asString(raw.dateTo).trim(),
      keyword: asString(raw.keyword).trim(),
      metadata,
    },
    archived: raw.archived === true,
  };
};

const runAdvancedSearch = async (
  req: Request,
  res: Response,
  options?: { uploadedByUserId?: string },
) => {
  try {
    const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
    if (!dbName) return res.status(404).json({ message: "Organization not found" });

    const { criteria, archived } = parseAdvancedSearchBody(req.body);
    const searchOptions: { uploadedByUserId?: string; archived?: boolean } = { archived };
    if (options?.uploadedByUserId) searchOptions.uploadedByUserId = options.uploadedByUserId;
    const results = await advancedSearchDocumentsFromTenant(dbName, criteria, searchOptions);

    return res.status(200).json({ results, total: results.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search documents";
    return res.status(500).json({ message });
  }
};

const getDocumentFromTenant = async (dbName: string, id: string, uploadedBy?: string) => {
  await ensureTenantCategoriesSoftDeleteColumn(dbName);
  await ensureTenantDocumentsOcrSchema(dbName);
  const userFilter = uploadedBy ? `AND d.uploaded_by = ?` : "";
  const params: unknown[] = uploadedBy ? [id, uploadedBy] : [id];
  const [docs] = await dbPool.query(
    `SELECT d.id, d.doc_code, d.name, d.visibility, d.created_at, d.updated_at, d.file_path, d.ocr_text_path, d.ocr_status, d.file_size_kb, d.file_type, d.status, d.preview_page_count,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploaded_by
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.id = ?
        ${userFilter}
        AND d.status <> 'deleted'
      LIMIT 1`,
    params,
  );
  const row = (docs as Array<{
    id: string;
    name: string;
    visibility: "Public" | "Private";
    created_at: Date;
    updated_at: Date;
    file_path: string | null;
    ocr_text_path: string | null;
    ocr_status: string;
    file_size_kb: number;
    file_type: string;
    preview_page_count: number;
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

  let contentSnippet: string | undefined;
  const ocrRel = asString(row.ocr_text_path).trim();
  if (ocrRel) {
    try {
      const absOcr = absoluteFromStorageRoot(env.storageRoot, ocrRel);
      if (isPathWithinStorageRoot(env.storageRoot, absOcr) && existsSync(absOcr)) {
        const text = await readFile(absOcr, "utf8");
        contentSnippet =
          text.length > MAX_OCR_SNIPPET_CHARS
            ? `${text.slice(0, MAX_OCR_SNIPPET_CHARS)}\n\n[Preview truncated…]`
            : text;
      }
    } catch {
      contentSnippet = undefined;
    }
  }

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
    ocrTextPath: row.ocr_text_path ?? "",
    ocrStatus: mapDbOcrStatusToApi(row.ocr_status),
    previewPageCount: Math.max(0, Math.floor(Number(row.preview_page_count ?? 0))),
    metadata,
    ...(contentSnippet !== undefined ? { contentSnippet } : {}),
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

  async listOrgActivityLogs(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization context missing in session" });
      }
      const logs = await settingsModel.getAllOrgActivity(organizationId);
      return res.status(200).json({ logs });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load activity logs";
      return res.status(500).json({ message });
    }
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
      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Category Created",
          module: "Categories",
          description: `Created category "${name}".`,
        });
      }
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
      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Category Updated",
          module: "Categories",
          description: `Updated category "${name}".`,
        });
      }
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

      const [catNameRows] = await dbPool.query(
        `SELECT name FROM \`${dbName}\`.categories WHERE id = ? AND is_deleted = 0 LIMIT 1`,
        [categoryId],
      );
      const categoryName = asString((catNameRows as Array<{ name: string }>)[0]?.name).trim() || categoryId;

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
      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Category Deleted",
          module: "Categories",
          description: `Deleted category "${categoryName}".`,
        });
      }
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete category";
      return res.status(500).json({ message });
    }
  },

  async createOrgAdminSingleDocument(req: Request, res: Response) {
    const conn = await dbPool.getConnection();
    const stagedAbsolutes: string[] = [];
    let txStarted = false;
    let committed = false;
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      await ensureTenantCategoriesSoftDeleteColumn(dbName);
      await ensureTenantDocumentsOcrSchema(dbName);

      let categoryId: string;
      let displayName: string;
      let safeStorageName: string;
      let fileType: string;
      let fileSizeKb: number;
      let pageCount: number;
      let visibility: "Public" | "Private";
      let metadata: Record<string, string>;
      let fileBuffer: Buffer | null = null;

      const body = (req.body ?? {}) as {
        categoryId?: unknown;
        fileName?: unknown;
        fileBase64?: unknown;
        fileType?: unknown;
        fileSizeKb?: unknown;
        pageCount?: unknown;
        visibility?: unknown;
        metadata?: unknown;
      };
      categoryId = asString(body.categoryId).trim();

      const rawB64 = asString(body.fileBase64).trim();
      let base64Payload = rawB64;
      const comma = rawB64.indexOf(",");
      if (rawB64.startsWith("data:") && comma !== -1) {
        base64Payload = rawB64.slice(comma + 1);
      }
      if (base64Payload) {
        try {
          fileBuffer = Buffer.from(base64Payload, "base64");
        } catch {
          return res.status(400).json({ message: "Invalid file encoding" });
        }
        if (!fileBuffer.byteLength) {
          return res.status(400).json({ message: "File payload is empty" });
        }
        const maxBytes = 52 * 1024 * 1024;
        if (fileBuffer.byteLength > maxBytes) {
          return res.status(413).json({ message: "File exceeds maximum upload size" });
        }
      }

      const nameFromClient = asString(body.fileName).trim();
      displayName = nameFromClient.slice(0, 200) || (fileBuffer ? "document" : "");
      safeStorageName = sanitizeStoredFileName(nameFromClient || displayName || "document");
      fileType = asString(body.fileType).trim() || "unknown";
      fileSizeKb = Number(body.fileSizeKb ?? 0);
      if (fileBuffer && (!Number.isFinite(fileSizeKb) || fileSizeKb <= 0)) {
        fileSizeKb = Math.ceil(fileBuffer.byteLength / 1024);
      }
      pageCount = Number(body.pageCount ?? 0);
      visibility = asString(body.visibility).trim() === "Public" ? "Public" : "Private";

      const rawMeta = body.metadata;
      if (rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)) {
        metadata = rawMeta as Record<string, string>;
      } else if (typeof rawMeta === "string") {
        const s = rawMeta.trim();
        try {
          metadata = s ? (JSON.parse(s) as Record<string, string>) : {};
        } catch {
          return res.status(400).json({ message: "Invalid metadata JSON" });
        }
      } else {
        metadata = {};
      }

      if (!categoryId) return res.status(400).json({ message: "Category is required" });
      if (!displayName) return res.status(400).json({ message: "File is required" });

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
          return res.status(400).json({ message: "Required metadata is missing" });
        }
      }

      const documentId = crypto.randomUUID();
      const docCode = buildDocCode();
      const storedPath = `uploads/${documentId}-${safeStorageName}`;
      let mainAbsoluteForOcr: string | null = null;
      const ocrStatusDb: "pending" | "none" = fileBuffer ? "pending" : "none";

      if (fileBuffer) {
        try {
          const main = await writeUploadedDocumentFile(env.storageRoot, documentId, safeStorageName, fileBuffer);
          stagedAbsolutes.push(main.absolutePath);
          mainAbsoluteForOcr = main.absolutePath;
        } catch (e) {
          for (const p of stagedAbsolutes) await unlinkQuiet(p);
          const message = e instanceof Error ? e.message : "Failed to store document file";
          return res.status(400).json({ message });
        }
      }

      await conn.beginTransaction();
      txStarted = true;

      await conn.query(
        `INSERT INTO \`${dbName}\`.documents
          (id, category_id, uploaded_by, doc_code, name, file_path, ocr_text_path, ocr_status, file_type, file_size_kb, page_count, visibility, status)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'active')`,
        [
          documentId,
          categoryId,
          req.user?.id ?? "",
          docCode,
          displayName,
          storedPath,
          ocrStatusDb,
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
      committed = true;
      if (mainAbsoluteForOcr) {
        enqueueDocumentOcr({
          dbName,
          organizationId: req.user?.organizationId ?? "",
          documentId,
          absoluteMainPath: mainAbsoluteForOcr,
          safeStorageName,
        });
      }

      void notifyOrgAdmin(req.user?.organizationId ?? "", "document_uploads", {
        actorName: req.user?.fullName,
        actorEmail: req.user?.email,
        fileName: displayName,
        categoryName: categoryId,
      });

      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Document Uploaded",
          module: "Documents",
          description: `Uploaded "${displayName}".`,
        });
      }

      return res.status(201).json({
        id: documentId,
        docCode,
        name: displayName,
        visibility,
        ocrTextPath: "",
        ocrStatus: mapDbOcrStatusToApi(ocrStatusDb),
      });
    } catch (error) {
      if (txStarted) await conn.rollback().catch(() => {});
      if (!committed) {
        for (const p of stagedAbsolutes) await unlinkQuiet(p);
      }
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

      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "User Invited",
          module: "Users",
          description: `Invited ${name} (${email}).`,
        });
      }

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

      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "User Updated",
          module: "Users",
          description: `Updated user ${name} (${email}).`,
        });
      }

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
      const [targetRows] = await dbPool.query(
        `SELECT name, email FROM \`${dbName}\`.users WHERE id = ? LIMIT 1`,
        [id],
      );
      const target = (targetRows as Array<{ name: string; email: string }>)[0];
      const targetLabel = asString(target?.name).trim() || asString(target?.email).trim() || id;
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

      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "User Removed",
          module: "Users",
          description: `Removed user ${targetLabel}.`,
        });
      }

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
      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Password Reset",
          module: "Users",
          description: `Reset password for user ${id}.`,
        });
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
      await ensureTenantCategoriesSoftDeleteColumn(dbName);
      await ensureTenantDocumentsOcrSchema(dbName);

      const uploadFiles = (req as Request & { files?: Express.Multer.File[] }).files;
      const multipartFiles = Array.isArray(uploadFiles) && uploadFiles.length > 0 ? uploadFiles : null;

      if (multipartFiles) {
        type ManifestEntry = {
          fileType?: string;
          fileSizeKb?: number;
          pageCount?: number;
          metadata?: Record<string, string>;
        };
        const categoryId = firstMultipartField(req.body?.categoryId).trim();
        const visibility = firstMultipartField(req.body?.visibility) === "Public" ? "Public" : "Private";
        const manifestRaw = firstMultipartField(req.body?.manifest).trim();
        if (!categoryId) return res.status(400).json({ message: "Category is required" });
        let manifest: ManifestEntry[];
        try {
          manifest = manifestRaw ? (JSON.parse(manifestRaw) as ManifestEntry[]) : [];
        } catch {
          return res.status(400).json({ message: "Invalid manifest JSON" });
        }
        if (!Array.isArray(manifest) || manifest.length === 0) {
          return res.status(400).json({ message: "Manifest is required" });
        }
        if (manifest.length !== multipartFiles.length) {
          return res.status(400).json({ message: "Each uploaded file must have matching manifest entries in order" });
        }

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
          return res.status(404).json({ message: "Category not found" });
        }

        const [fieldRows] = await conn.query(
          `SELECT id, is_required
             FROM \`${dbName}\`.category_metadata_fields
            WHERE category_id = ?`,
          [categoryId],
        );
        const fields = fieldRows as Array<{ id: string; is_required: number }>;

        for (let i = 0; i < multipartFiles.length; i += 1) {
          const uf = multipartFiles[i]!;
          const label = uf.originalname.trim() || `file_${i + 1}`;
          const metadata = manifest[i]?.metadata ?? {};
          for (const field of fields) {
            if (Number(field.is_required ?? 0) === 1 && !asString(metadata[field.id]).trim()) {
              return res.status(400).json({ message: `Required metadata missing for file ${label}` });
            }
          }
        }

        type Prepared = {
          documentId: string;
          docCode: string;
          displayName: string;
          storedPath: string;
          absoluteMainPath: string;
          safeStorageName: string;
          fileType: string;
          fileSizeKb: number;
          pageCount: number;
          metadata: Record<string, string>;
        };

        const stagedAbsolutes: string[] = [];
        const prepared: Prepared[] = [];
        try {
          for (let i = 0; i < multipartFiles.length; i += 1) {
            const uf = multipartFiles[i]!;
            const m = manifest[i] ?? {};
            const safeName = sanitizeStoredFileName(uf.originalname);
            const displayName = uf.originalname.trim().slice(0, 200) || safeName;
            const documentId = crypto.randomUUID();
            const docCode = buildDocCode();
            const main = await writeUploadedDocumentFile(env.storageRoot, documentId, safeName, uf.buffer);
            stagedAbsolutes.push(main.absolutePath);
            const fileType = asString(m.fileType).trim() || uf.mimetype || "unknown";
            const fileSizeKb = Number.isFinite(Number(m.fileSizeKb))
              ? Math.max(0, Math.round(Number(m.fileSizeKb)))
              : Math.max(0, Math.ceil(uf.size / 1024));
            const pageCount = Number.isFinite(Number(m.pageCount)) ? Math.max(0, Math.round(Number(m.pageCount))) : 0;
            prepared.push({
              documentId,
              docCode,
              displayName,
              storedPath: main.relativePath,
              absoluteMainPath: main.absolutePath,
              safeStorageName: safeName,
              fileType,
              fileSizeKb,
              pageCount,
              metadata: typeof m.metadata === "object" && m.metadata ? m.metadata : {},
            });
          }
        } catch (e) {
          for (const p of stagedAbsolutes) await unlinkQuiet(p);
          const message = e instanceof Error ? e.message : "Failed to store document files";
          return res.status(400).json({ message });
        }

        let txStarted = false;
        let committed = false;
        try {
          await conn.beginTransaction();
          txStarted = true;
          const created: Array<{ id: string; docCode: string; name: string; ocrTextPath: string; ocrStatus: string }> = [];
          for (const p of prepared) {
            await conn.query(
              `INSERT INTO \`${dbName}\`.documents
                (id, category_id, uploaded_by, doc_code, name, file_path, ocr_text_path, ocr_status, file_type, file_size_kb, page_count, visibility, status)
               VALUES (?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, ?, ?, 'active')`,
              [
                p.documentId,
                categoryId,
                req.user?.id ?? "",
                p.docCode,
                p.displayName,
                p.storedPath,
                p.fileType,
                p.fileSizeKb,
                p.pageCount,
                visibility,
              ],
            );
            for (const field of fields) {
              const value = asString(p.metadata[field.id]).trim();
              if (!value) continue;
              await conn.query(
                `INSERT INTO \`${dbName}\`.document_metadata_values (id, document_id, field_id, value)
                 VALUES (?, ?, ?, ?)`,
                [crypto.randomUUID(), p.documentId, field.id, value],
              );
            }
            created.push({
              id: p.documentId,
              docCode: p.docCode,
              name: p.displayName,
              ocrTextPath: "",
              ocrStatus: "Pending",
            });
          }
          await conn.commit();
          committed = true;
          for (const p of prepared) {
            enqueueDocumentOcr({
              dbName,
              organizationId: req.user?.organizationId ?? "",
              documentId: p.documentId,
              absoluteMainPath: p.absoluteMainPath,
              safeStorageName: p.safeStorageName,
            });
          }
          if (req.user?.id && req.user?.organizationId) {
            void recordOrgActivity(req.user.id, req.user.organizationId, {
              action: "Bulk Upload",
              module: "Documents",
              description: `Bulk uploaded ${created.length} document(s).`,
            });
          }
          return res.status(201).json({ uploaded: created.length, documents: created });
        } catch (error) {
          if (txStarted) await conn.rollback().catch(() => {});
          if (!committed) {
            for (const p of stagedAbsolutes) await unlinkQuiet(p);
          }
          const message = error instanceof Error ? error.message : "Failed to bulk upload documents";
          return res.status(400).json({ message });
        }
      }

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
        const safeStorageName = sanitizeStoredFileName(fileName);
        const storedPath = `uploads/${documentId}-${safeStorageName}`;
        await conn.query(
          `INSERT INTO \`${dbName}\`.documents
            (id, category_id, uploaded_by, doc_code, name, file_path, ocr_text_path, ocr_status, file_type, file_size_kb, page_count, visibility, status)
           VALUES (?, ?, ?, ?, ?, ?, NULL, 'none', ?, ?, ?, ?, 'active')`,
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

      if (req.user?.id && req.user?.organizationId && successCount > 0) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Bulk Upload",
          module: "Documents",
          description: `Bulk uploaded ${successCount} document(s).`,
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

  async getOrgAdminDocumentPreview(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      const pageRaw = asString(req.params.pageNum).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const pageNum = Number.parseInt(pageRaw, 10);
      if (!Number.isFinite(pageNum) || pageNum < 1) {
        return res.status(400).json({ message: "Invalid page" });
      }
      await ensureTenantDocumentsOcrSchema(dbName);
      const [rows] = await dbPool.query(
        `SELECT preview_page_count
           FROM \`${dbName}\`.documents
          WHERE id = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [id],
      );
      const maxPage = Math.max(
        0,
        Math.floor(Number((rows as Array<{ preview_page_count: number }>)[0]?.preview_page_count ?? 0)),
      );
      if (maxPage < 1 || pageNum > maxPage) {
        return res.status(404).json({ message: "Preview not found" });
      }
      const relative = previewPageRelativePath(id, pageNum);
      const absolute = absoluteFromStorageRoot(env.storageRoot, relative);
      if (!isPathWithinStorageRoot(env.storageRoot, absolute)) {
        return res.status(400).json({ message: "Invalid path" });
      }
      if (!existsSync(absolute)) return res.status(404).json({ message: "Preview file missing" });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.sendFile(absolute, (err) => {
        if (err && !res.headersSent) res.status(500).json({ message: "Failed to send preview" });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load preview";
      return res.status(500).json({ message });
    }
  },

  async getOrgAdminDocumentFile(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const [rows] = await dbPool.query(
        `SELECT d.name, d.file_path, d.file_type
           FROM \`${dbName}\`.documents d
          WHERE d.id = ?
            AND d.status <> 'deleted'
          LIMIT 1`,
        [id],
      );
      const row = (rows as Array<{ name: string; file_path: string | null; file_type: string }>)[0];
      const relative = asString(row?.file_path).trim();
      if (!row || !relative) return res.status(404).json({ message: "File not found" });

      const absolute = absoluteFromStorageRoot(env.storageRoot, relative);
      if (!isPathWithinStorageRoot(env.storageRoot, absolute)) {
        return res.status(400).json({ message: "Invalid path" });
      }
      if (!existsSync(absolute)) return res.status(404).json({ message: "File missing on disk" });

      const mime = mimeTypeForDocumentFile(row.name, absolute);
      res.setHeader("Content-Type", mime);
      const safeName = row.name.replace(/[\r\n"]/g, "_").trim() || "document";
      const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"`);
      res.sendFile(absolute, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ message: "Failed to send file" });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download file";
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
      const organizationId = req.user?.organizationId;
      if (req.user?.id && organizationId) {
        void recordOrgActivity(req.user.id, organizationId, {
          action: archived ? "Document Archived" : "Document Restored",
          module: "Documents",
          description: archived ? "Document archived." : "Document restored to active.",
        });
        if (archived) {
          void removeDocumentFromSearch(organizationId, id);
        } else {
          void indexDocumentInSearch({ organizationId, dbName, documentId: id });
        }
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
      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Metadata Updated",
          module: "Documents",
          description: `Updated metadata for document ${id}.`,
        });
      }
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
      const [docNameRows] = await dbPool.query(
        `SELECT name FROM \`${dbName}\`.documents WHERE id = ? AND status <> 'deleted' LIMIT 1`,
        [id],
      );
      const docName = asString((docNameRows as Array<{ name: string }>)[0]?.name).trim() || id;
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
      if (req.user?.id && req.user?.organizationId) {
        void recordOrgActivity(req.user.id, req.user.organizationId, {
          action: "Document Deleted",
          module: "Documents",
          description: `Deleted "${docName}".`,
        });
      }
      const organizationId = req.user?.organizationId ?? (await getOrganizationIdFromDbName(dbName));
      if (organizationId) void removeDocumentFromSearch(organizationId, id);
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete document";
      return res.status(400).json({ message });
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

  async getUserDocument(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const doc = await getDocumentFromTenant(dbName, id, req.user?.id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      return res.status(200).json(doc);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load document";
      return res.status(500).json({ message });
    }
  },

  async getUserDocumentFile(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      const userId = req.user?.id;
      if (!id) return res.status(400).json({ message: "Document id is required" });
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const [rows] = await dbPool.query(
        `SELECT d.name, d.file_path, d.file_type
           FROM \`${dbName}\`.documents d
          WHERE d.id = ?
            AND d.uploaded_by = ?
            AND d.status <> 'deleted'
          LIMIT 1`,
        [id, userId],
      );
      const row = (rows as Array<{ name: string; file_path: string | null; file_type: string }>)[0];
      const relative = asString(row?.file_path).trim();
      if (!row || !relative) return res.status(404).json({ message: "File not found" });

      const absolute = absoluteFromStorageRoot(env.storageRoot, relative);
      if (!isPathWithinStorageRoot(env.storageRoot, absolute)) {
        return res.status(400).json({ message: "Invalid path" });
      }
      if (!existsSync(absolute)) return res.status(404).json({ message: "File missing on disk" });

      const mime = mimeTypeForDocumentFile(row.name, absolute);
      res.setHeader("Content-Type", mime);
      const safeName = row.name.replace(/[\r\n"]/g, "_").trim() || "document";
      const asciiName = safeName.replace(/[^\x20-\x7E]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"`);
      res.sendFile(absolute, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ message: "Failed to send file" });
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download file";
      return res.status(500).json({ message });
    }
  },

  async updateUserDocumentArchiveStatus(req: Request, res: Response) {
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
            AND uploaded_by = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [archived ? "archived" : "active", id, req.user?.id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "Document not found or access denied" });
      }
      void recordOrgActivity(req.user!.id, req.user!.organizationId, {
        action: archived ? "Document Archived" : "Document Restored",
        module: "Documents",
        description: `Document ${id} ${archived ? "archived" : "restored"}.`,
      });
      const organizationId = req.user?.organizationId;
      if (organizationId) {
        if (archived) {
          void removeDocumentFromSearch(organizationId, id);
        } else {
          void indexDocumentInSearch({ organizationId, dbName, documentId: id });
        }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update archive status";
      return res.status(400).json({ message });
    }
  },

  async updateUserDocumentMetadata(req: Request, res: Response) {
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
            AND uploaded_by = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [id, req.user?.id],
      );
      const doc = (docRows as Array<{ category_id: string }>)[0];
      if (!doc?.category_id) {
        await conn.rollback();
        return res.status(404).json({ message: "Document not found or access denied" });
      }

      const [fieldRows] = await conn.query(
        `SELECT id, field_name
           FROM \`${dbName}\`.category_metadata_fields
          WHERE category_id = ?`,
        [doc.category_id],
      );
      const allowedFields = new Map(
        (fieldRows as Array<{ id: string; field_name: string }>).map((f) => [f.field_name.toLowerCase(), f.id]),
      );

      for (const [key, value] of Object.entries(metadata)) {
        const fieldId = allowedFields.get(key.toLowerCase());
        if (!fieldId) return res.status(400).json({ message: `Invalid metadata field: ${key}` });
        await conn.query(
          `INSERT INTO \`${dbName}\`.document_metadata_values (document_id, field_id, value)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE value = VALUES(value)`,
          [id, fieldId, value],
        );
      }

      await conn.commit();
      void recordOrgActivity(req.user!.id, req.user!.organizationId, {
        action: "Metadata Updated",
        module: "Documents",
        description: `Metadata updated for document ${id}.`,
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      await conn.rollback();
      const message = error instanceof Error ? error.message : "Failed to update metadata";
      return res.status(400).json({ message });
    } finally {
      conn.release();
    }
  },

  async deleteUserDocument(req: Request, res: Response) {
    try {
      const dbName = await getOrgDbNameFromSession(req.user?.organizationId);
      if (!dbName) return res.status(404).json({ message: "Organization not found" });
      const id = asString(req.params.id).trim();
      if (!id) return res.status(400).json({ message: "Document id is required" });
      const [result] = await dbPool.query(
        `UPDATE \`${dbName}\`.documents
            SET status = 'deleted', updated_at = NOW()
          WHERE id = ?
            AND uploaded_by = ?
            AND status <> 'deleted'
          LIMIT 1`,
        [id, req.user?.id],
      );
      if (Number((result as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return res.status(404).json({ message: "Document not found or access denied" });
      }
      void recordOrgActivity(req.user!.id, req.user!.organizationId, {
        action: "Document Deleted",
        module: "Documents",
        description: `Document ${id} deleted.`,
      });
      const organizationId = req.user?.organizationId;
      if (organizationId) void removeDocumentFromSearch(organizationId, id);
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

  async advancedSearchOrgAdminDocuments(req: Request, res: Response) {
    return runAdvancedSearch(req, res);
  },

  async advancedSearchUserDocuments(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    return runAdvancedSearch(req, res, { uploadedByUserId: userId });
  },

  async searchOrgAdminDocuments(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const dbName = await getOrgDbNameFromSession(organizationId);
      if (!dbName || !organizationId) return res.status(404).json({ message: "Organization not found" });

      const q = asString(req.query.q).trim();
      if (!q) return res.status(200).json({ query: q, results: [], total: 0 });

      const metadataResults = await searchActiveReadyDocumentsForGlobalSearch(dbName, q);
      const results = await runGlobalSearch(metadataResults, organizationId, dbName, q);
      return res.status(200).json({ query: q, results, total: results.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to search documents";
      return res.status(500).json({ message });
    }
  },

  async reindexOrgAdminSearch(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const dbName = await getOrgDbNameFromSession(organizationId);
      if (!dbName || !organizationId) return res.status(404).json({ message: "Organization not found" });

      const result = await reindexTenantSearchDocuments({ organizationId, dbName });
      return res.status(200).json({
        message: "Search index rebuild started",
        indexed: result.indexed,
        skipped: result.skipped,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reindex documents";
      return res.status(500).json({ message });
    }
  },

  async searchUserOwnDocuments(req: Request, res: Response) {
    try {
      const organizationId = req.user?.organizationId;
      const dbName = await getOrgDbNameFromSession(organizationId);
      if (!dbName || !organizationId) return res.status(404).json({ message: "Organization not found" });

      const q = asString(req.query.q).trim();
      if (!q) return res.status(200).json({ query: q, results: [], total: 0 });

      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const metadataResults = await searchActiveReadyDocumentsForGlobalSearch(dbName, q, { uploadedBy: userId });
      const results = await runGlobalSearch(metadataResults, organizationId, dbName, q, {
        uploadedByUserId: userId,
      });
      return res.status(200).json({ query: q, results, total: results.length });
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
