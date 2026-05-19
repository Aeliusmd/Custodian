import { dbPool } from "../config/db";
import { searchDocumentContent, isMeilisearchEnabled } from "./meilisearchClient";
import { searchOcrTextContentFallback } from "./documentSearchIndexService";

export type MetadataSearchMatch = { fieldName: string; value: string };

export type MetadataSearchResult = {
  id: string;
  documentName: string;
  category: string;
  uploadDate: string;
  uploadedBy: string;
  matchedMetadata: MetadataSearchMatch[];
  snippet: string;
  keywords: string[];
};

const GLOBAL_SEARCH_METADATA_LIMIT = 50;

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);
const asString = (value: unknown): string => (typeof value === "string" ? value : "");

type DocAccumulator = {
  name: string;
  created_at: Date;
  category_name: string;
  uploader_name: string;
  matches: MetadataSearchMatch[];
};

const mergeMetadataRow = (byDoc: Map<string, DocAccumulator>, row: {
  id: string;
  name: string;
  created_at: Date;
  category_name: string;
  uploader_name: string;
  field_name?: string;
  value?: string;
  match?: MetadataSearchMatch;
}): void => {
  const match = row.match ?? (row.field_name && row.value
    ? { fieldName: asString(row.field_name).trim(), value: asString(row.value).trim() }
    : null);
  if (!match?.fieldName || !match.value) return;

  const existing = byDoc.get(row.id);
  if (existing) {
    const already = existing.matches.some((m) => m.fieldName === match.fieldName && m.value === match.value);
    if (!already) existing.matches.push(match);
  } else {
    byDoc.set(row.id, {
      name: row.name,
      created_at: row.created_at,
      category_name: row.category_name,
      uploader_name: row.uploader_name,
      matches: [match],
    });
  }
};

const toMetadataSearchResults = (byDoc: Map<string, DocAccumulator>, q: string): MetadataSearchResult[] =>
  Array.from(byDoc.entries())
    .slice(0, GLOBAL_SEARCH_METADATA_LIMIT)
    .map(([id, doc]) => {
      const matchedMetadata = doc.matches;
      const first = matchedMetadata[0];
      const snippet =
        matchedMetadata.length === 1 && first
          ? `${first.fieldName}: ${first.value}`
          : matchedMetadata.map((m) => `${m.fieldName}: ${m.value}`).join(" · ");
      return {
        id,
        documentName: doc.name,
        category: doc.category_name,
        uploadDate: toIsoDate(new Date(doc.created_at)),
        uploadedBy: doc.uploader_name,
        matchedMetadata,
        snippet,
        keywords: [q, ...matchedMetadata.map((m) => m.value)],
      };
    });

/** Active documents with OCR ready — metadata values, document name, or category. */
export const searchActiveReadyDocumentsForGlobalSearch = async (
  dbName: string,
  q: string,
  options?: { uploadedBy?: string },
): Promise<MetadataSearchResult[]> => {
  const like = `%${q}%`;
  const userFilter = options?.uploadedBy ? `AND d.uploaded_by = ?` : "";
  const userParams: unknown[] = options?.uploadedBy ? [options.uploadedBy, like] : [like];

  const [metaRows] = await dbPool.query(
    `SELECT d.id, d.name, d.created_at,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploader_name,
            cmf.field_name,
            dmv.value
       FROM \`${dbName}\`.documents d
       INNER JOIN \`${dbName}\`.document_metadata_values dmv ON dmv.document_id = d.id
       INNER JOIN \`${dbName}\`.category_metadata_fields cmf ON cmf.id = dmv.field_id
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.status = 'active'
        AND d.ocr_status = 'ready'
        ${userFilter}
        AND LOWER(dmv.value) LIKE LOWER(?)
      ORDER BY d.created_at DESC
      LIMIT 200`,
    userParams,
  );

  const [nameRows] = await dbPool.query(
    `SELECT d.id, d.name, d.created_at,
            COALESCE(c.name, 'Uncategorized') AS category_name,
            COALESCE(u.name, 'Unknown') AS uploader_name
       FROM \`${dbName}\`.documents d
       LEFT JOIN \`${dbName}\`.categories c ON c.id = d.category_id
       LEFT JOIN \`${dbName}\`.users u ON u.id = d.uploaded_by
      WHERE d.status = 'active'
        AND d.ocr_status = 'ready'
        ${userFilter}
        AND (LOWER(d.name) LIKE LOWER(?) OR LOWER(COALESCE(c.name, '')) LIKE LOWER(?))
      ORDER BY d.created_at DESC
      LIMIT 50`,
    options?.uploadedBy ? [options.uploadedBy, like, like] : [like, like],
  );

  const byDoc = new Map<string, DocAccumulator>();

  for (const row of metaRows as Array<{
    id: string;
    name: string;
    created_at: Date;
    category_name: string;
    uploader_name: string;
    field_name: string;
    value: string;
  }>) {
    mergeMetadataRow(byDoc, row);
  }

  for (const row of nameRows as Array<{
    id: string;
    name: string;
    created_at: Date;
    category_name: string;
    uploader_name: string;
  }>) {
    const name = asString(row.name).trim();
    const category = asString(row.category_name).trim();
    const qLower = q.toLowerCase();
    if (name.toLowerCase().includes(qLower)) {
      mergeMetadataRow(byDoc, {
        ...row,
        match: { fieldName: "Document name", value: name },
      });
    }
    if (category && category.toLowerCase().includes(qLower)) {
      mergeMetadataRow(byDoc, {
        ...row,
        match: { fieldName: "Category", value: category },
      });
    }
  }

  return toMetadataSearchResults(byDoc, q);
};

export type ContentMatch = {
  pageNumber: number;
  snippet: string;
  snippetHtml: string;
};

export type GlobalSearchResult = {
  id: string;
  documentName: string;
  category: string;
  uploadDate: string;
  uploadedBy: string;
  snippet: string;
  snippetHtml?: string;
  matchType: "metadata" | "content" | "both";
  pageNumber?: number;
  contentMatches?: ContentMatch[];
  matchedMetadata?: MetadataSearchMatch[];
  keywords: string[];
};

const dedupeContentHits = (
  hits: Awaited<ReturnType<typeof searchDocumentContent>>,
): Awaited<ReturnType<typeof searchDocumentContent>> => {
  const byDoc = new Map<string, typeof hits>();
  for (const hit of hits) {
    const list = byDoc.get(hit.documentId) ?? [];
    list.push(hit);
    byDoc.set(hit.documentId, list);
  }

  const out: typeof hits = [];
  for (const list of byDoc.values()) {
    const pageHits = list.filter((h) => h.pageNumber > 0);
    if (pageHits.length > 0) {
      out.push(...pageHits);
    } else {
      out.push(...list.map((h) => ({ ...h, pageNumber: 1 })));
    }
  }
  return out;
};

const mergeGlobalSearchResults = (
  metadataResults: MetadataSearchResult[],
  contentHits: Awaited<ReturnType<typeof searchDocumentContent>>,
  query: string,
): GlobalSearchResult[] => {
  const byDoc = new Map<string, GlobalSearchResult>();

  for (const m of metadataResults) {
    byDoc.set(m.id, {
      id: m.id,
      documentName: m.documentName,
      category: m.category,
      uploadDate: m.uploadDate,
      uploadedBy: m.uploadedBy,
      snippet: m.snippet,
      matchType: "metadata",
      matchedMetadata: m.matchedMetadata,
      keywords: m.keywords,
    });
  }

  const contentByDoc = new Map<string, ContentMatch[]>();
  for (const hit of contentHits) {
    if (!hit.documentId) continue;
    const list = contentByDoc.get(hit.documentId) ?? [];
    const exists = list.some((x) => x.pageNumber === hit.pageNumber);
    if (!exists) {
      list.push({
        pageNumber: hit.pageNumber,
        snippet: hit.snippet,
        snippetHtml: hit.snippetHtml,
      });
    }
    contentByDoc.set(hit.documentId, list);
  }

  for (const [documentId, matches] of contentByDoc) {
    const first = matches[0];
    if (!first) continue;

    const existing = byDoc.get(documentId);
    if (existing) {
      existing.matchType = "both";
      existing.contentMatches = matches;
      existing.pageNumber = first.pageNumber;
      if (!existing.snippetHtml) {
        existing.snippet = first.snippet;
        existing.snippetHtml = first.snippetHtml;
      }
      if (!existing.keywords.includes(query)) existing.keywords.unshift(query);
    } else {
      const hit = contentHits.find((h) => h.documentId === documentId);
      byDoc.set(documentId, {
        id: documentId,
        documentName: hit?.documentName ?? "Document",
        category: hit?.category ?? "",
        uploadDate: "",
        uploadedBy: hit?.uploadedBy ?? "",
        snippet: first.snippet,
        snippetHtml: first.snippetHtml,
        matchType: "content",
        pageNumber: first.pageNumber,
        contentMatches: matches,
        keywords: [query],
      });
    }
  }

  return Array.from(byDoc.values());
};

export const runGlobalSearch = async (
  metadataResults: MetadataSearchResult[],
  organizationId: string,
  dbName: string,
  query: string,
  options?: { uploadedByUserId?: string },
): Promise<GlobalSearchResult[]> => {
  let contentHits: Awaited<ReturnType<typeof searchDocumentContent>> = [];

  if (isMeilisearchEnabled()) {
    contentHits = await searchDocumentContent(organizationId, query, {
      ...(options?.uploadedByUserId ? { uploadedByUserId: options.uploadedByUserId } : {}),
      limit: 100,
    });
  }

  if (contentHits.length === 0) {
    contentHits = await searchOcrTextContentFallback(dbName, query, {
      ...(options?.uploadedByUserId ? { uploadedByUserId: options.uploadedByUserId } : {}),
      limit: 100,
    });
  }

  contentHits = dedupeContentHits(contentHits);

  if (contentHits.length === 0 && metadataResults.length === 0) {
    return [];
  }

  const merged = mergeGlobalSearchResults(metadataResults, contentHits, query);

  for (const m of metadataResults) {
    const row = merged.find((r) => r.id === m.id);
    if (row && !row.uploadDate) row.uploadDate = m.uploadDate;
  }

  return merged;
};
