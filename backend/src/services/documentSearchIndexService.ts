import { readFile } from "fs/promises";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { absoluteFromStorageRoot, splitFlatOcrTextIntoPages, type OcrPageText } from "./documentStorageService";
import {
  deleteDocumentPagesFromIndex,
  indexPageDocuments,
  isMeilisearchEnabled,
  type MeilisearchContentHit,
  type MeilisearchPageDocument,
} from "./meilisearchClient";

const pageIndexId = (organizationId: string, documentId: string, pageNumber: number): string =>
  `${organizationId}_${documentId}_p${pageNumber}`;

export const loadOcrPagesForDocument = async (
  storageRoot: string,
  documentId: string,
  flatTextFallback?: string,
): Promise<OcrPageText[]> => {
  const pagesPath = absoluteFromStorageRoot(storageRoot, `uploads/ocr/${documentId}.pages.json`);
  try {
    const raw = await readFile(pagesPath, "utf8");
    const parsed = JSON.parse(raw) as { pages?: Array<{ page?: number; text?: string }> };
    const pages = (parsed.pages ?? [])
      .map((p) => ({ page: Math.max(1, Math.floor(Number(p.page ?? 1))), text: String(p.text ?? "").trim() }))
      .filter((p) => p.text);
    if (pages.length > 0) return pages;
  } catch {
    // fall through
  }

  const text = flatTextFallback?.trim() ?? "";
  if (!text) {
    try {
      const txtPath = absoluteFromStorageRoot(storageRoot, `uploads/ocr/${documentId}.txt`);
      const fromFile = (await readFile(txtPath, "utf8")).trim();
      return splitFlatOcrTextIntoPages(fromFile);
    } catch {
      return [];
    }
  }
  return splitFlatOcrTextIntoPages(text);
};

type DocumentIndexContext = {
  documentName: string;
  category: string;
  uploadedBy: string;
  uploadedByUserId: string;
};

const loadDocumentIndexContext = async (dbName: string, documentId: string): Promise<DocumentIndexContext | null> => {
  const [rows] = await dbPool.query(
    `SELECT d.name, d.uploaded_by,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploader_name
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.id = ?
        AND d.status = 'active'
        AND d.ocr_status = 'ready'
      LIMIT 1`,
    [documentId],
  );
  const row = (rows as Array<{
    name: string;
    uploaded_by: string;
    category_name: string;
    uploader_name: string;
  }>)[0];
  if (!row) return null;

  return {
    documentName: row.name,
    category: row.category_name,
    uploadedBy: row.uploader_name,
    uploadedByUserId: row.uploaded_by,
  };
};

export const indexDocumentInSearch = async (params: {
  organizationId: string;
  dbName: string;
  documentId: string;
  ocrText?: string;
}): Promise<void> => {
  if (!isMeilisearchEnabled()) return;

  try {
    const ctx = await loadDocumentIndexContext(params.dbName, params.documentId);
    if (!ctx) return;

    const pages = await loadOcrPagesForDocument(env.storageRoot, params.documentId, params.ocrText);
    if (pages.length === 0) {
      await deleteDocumentPagesFromIndex(params.organizationId, params.documentId);
      return;
    }

    await deleteDocumentPagesFromIndex(params.organizationId, params.documentId);

    const docs: MeilisearchPageDocument[] = pages.map((p) => ({
      id: pageIndexId(params.organizationId, params.documentId, p.page),
      organizationId: params.organizationId,
      documentId: params.documentId,
      pageNumber: p.page,
      documentName: ctx.documentName,
      category: ctx.category,
      uploadedBy: ctx.uploadedBy,
      uploadedByUserId: ctx.uploadedByUserId,
      documentStatus: "active",
      content: p.text,
    }));

    const fullText = pages.map((p) => p.text).join("\n\n");
    if (fullText.trim()) {
      docs.push({
        id: `${params.organizationId}_${params.documentId}_full`,
        organizationId: params.organizationId,
        documentId: params.documentId,
        pageNumber: 0,
        documentName: ctx.documentName,
        category: ctx.category,
        uploadedBy: ctx.uploadedBy,
        uploadedByUserId: ctx.uploadedByUserId,
        documentStatus: "active",
        content: fullText,
      });
    }

    const indexed = await indexPageDocuments(docs);
    if (indexed) {
      logger.info("search_index_document_ready", {
        documentId: params.documentId,
        pages: docs.length,
      });
    }
  } catch (e) {
    logger.warn("search_index_document_failed", {
      documentId: params.documentId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};

const normalizeSearchText = (value: string): string => value.toLowerCase().replace(/\s+/g, " ").trim();

const queryMatchesOcrText = (text: string, query: string): boolean => {
  const hay = normalizeSearchText(text);
  const needle = normalizeSearchText(query);
  if (!hay || !needle) return false;
  if (hay.includes(needle)) return true;
  const words = needle.split(" ").filter((w) => w.length >= 3);
  if (words.length < 2) return false;
  return words.every((w) => hay.includes(w));
};

const buildOcrSnippet = (text: string, query: string): { snippet: string; snippetHtml: string; pageNumber: number } => {
  const hay = text.replace(/\r\n/g, "\n");
  const hayLower = hay.toLowerCase();
  const words = normalizeSearchText(query).split(" ").filter((w) => w.length >= 2);
  let idx = hayLower.indexOf(normalizeSearchText(query));
  if (idx < 0) {
    for (const w of words) {
      idx = hayLower.indexOf(w);
      if (idx >= 0) break;
    }
  }
  if (idx < 0) idx = 0;

  const start = Math.max(0, idx - 80);
  const end = Math.min(hay.length, idx + 220);
  let snippet = hay.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < hay.length) snippet = `${snippet}…`;

  let snippetHtml = snippet;
  for (const w of words) {
    if (w.length < 2) continue;
    const re = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    snippetHtml = snippetHtml.replace(re, "<mark>$1</mark>");
  }

  const pageNumber = Math.max(1, hay.slice(0, idx).split("\f").length);

  return { snippet, snippetHtml, pageNumber };
};

/** Search OCR files on disk when Meilisearch is unavailable or returned no hits. */
export const searchOcrTextContentFallback = async (
  dbName: string,
  query: string,
  options?: { uploadedByUserId?: string; limit?: number },
): Promise<MeilisearchContentHit[]> => {
  const q = query.trim();
  if (!q) return [];

  const userFilter = options?.uploadedByUserId ? `AND d.uploaded_by = ?` : "";
  const queryParams: unknown[] = options?.uploadedByUserId ? [options.uploadedByUserId] : [];

  const [rows] = await dbPool.query(
    `SELECT d.id, d.name, d.ocr_text_path,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploader_name
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.status = 'active'
        AND d.ocr_status = 'ready'
        AND d.ocr_text_path IS NOT NULL
        ${userFilter}
      ORDER BY d.updated_at DESC
      LIMIT 150`,
    queryParams,
  );

  const limit = options?.limit ?? 50;
  const hits: MeilisearchContentHit[] = [];

  for (const row of rows as Array<{
    id: string;
    name: string;
    ocr_text_path: string;
    category_name: string;
    uploader_name: string;
  }>) {
    if (hits.length >= limit) break;

    let text = "";
    try {
      const rel = row.ocr_text_path?.trim() || `uploads/ocr/${row.id}.txt`;
      const abs = absoluteFromStorageRoot(env.storageRoot, rel);
      text = await readFile(abs, "utf8");
    } catch {
      continue;
    }

    if (!queryMatchesOcrText(text, q)) continue;

    const pages = await loadOcrPagesForDocument(env.storageRoot, row.id, text);
    let matchPage = pages.find((p) => queryMatchesOcrText(p.text, q));
    const searchText = matchPage?.text ?? text;
    const { snippet, snippetHtml, pageNumber } = buildOcrSnippet(searchText, q);

    hits.push({
      documentId: row.id,
      pageNumber: matchPage?.page ?? pageNumber,
      documentName: row.name,
      category: row.category_name,
      uploadedBy: row.uploader_name,
      snippet,
      snippetHtml,
    });
  }

  if (hits.length > 0) {
    logger.info("search_ocr_text_fallback_hits", { query: q, count: hits.length });
  }

  return hits;
};

export const removeDocumentFromSearch = async (organizationId: string, documentId: string): Promise<void> => {
  if (!isMeilisearchEnabled()) return;
  await deleteDocumentPagesFromIndex(organizationId, documentId);
};

export const reindexTenantSearchDocuments = async (params: {
  organizationId: string;
  dbName: string;
  uploadedByUserId?: string;
}): Promise<{ indexed: number; skipped: number }> => {
  if (!isMeilisearchEnabled()) {
    return { indexed: 0, skipped: 0 };
  }

  const userFilter = params.uploadedByUserId ? `AND d.uploaded_by = ?` : "";
  const queryParams: unknown[] = params.uploadedByUserId ? [params.uploadedByUserId] : [];

  const [rows] = await dbPool.query(
    `SELECT d.id
       FROM \`${params.dbName}\`.documents d
      WHERE d.status = 'active'
        AND d.ocr_status = 'ready'
        ${userFilter}
      ORDER BY d.updated_at DESC`,
    queryParams,
  );

  const ids = (rows as Array<{ id: string }>).map((r) => r.id);
  let indexed = 0;
  let skipped = 0;

  for (const documentId of ids) {
    try {
      await indexDocumentInSearch({
        organizationId: params.organizationId,
        dbName: params.dbName,
        documentId,
      });
      indexed += 1;
    } catch {
      skipped += 1;
    }
  }

  logger.info("search_reindex_tenant_complete", {
    dbName: params.dbName,
    indexed,
    skipped,
    total: ids.length,
  });

  return { indexed, skipped };
};
