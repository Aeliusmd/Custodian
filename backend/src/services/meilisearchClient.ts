import { MeiliSearch } from "meilisearch";
import { env } from "../config/env";
import { logger } from "../config/logger";

let client: MeiliSearch | null = null;
let indexReady = false;

export const isMeilisearchEnabled = (): boolean => Boolean(env.meilisearchHost?.trim());

const getClient = (): MeiliSearch | null => {
  if (!isMeilisearchEnabled()) return null;
  if (!client) {
    const config: { host: string; apiKey?: string } = { host: env.meilisearchHost };
    if (env.meilisearchApiKey) config.apiKey = env.meilisearchApiKey;
    client = new MeiliSearch(config);
  }
  return client;
};

export const ensureSearchIndex = async (): Promise<boolean> => {
  const ms = getClient();
  if (!ms) return false;
  if (indexReady) return true;

  const indexUid = env.meilisearchIndexUid;
  try {
    await ms.health();
  } catch (e) {
    logger.warn("meilisearch_health_failed", {
      host: env.meilisearchHost,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }

  try {
    try {
      await ms.createIndex(indexUid, { primaryKey: "id" });
    } catch {
      // index may already exist
    }

    const index = ms.index(indexUid);
    try {
      const task = await index.updateSettings({
        searchableAttributes: ["content", "documentName", "category", "uploadedBy"],
        filterableAttributes: ["organizationId", "uploadedByUserId", "documentId", "documentStatus"],
        displayedAttributes: [
          "id",
          "organizationId",
          "documentId",
          "pageNumber",
          "documentName",
          "category",
          "uploadedBy",
          "uploadedByUserId",
          "documentStatus",
          "content",
        ],
      });
      await ms.tasks.waitForTask(task.taskUid, { timeOutMs: 60_000 });
    } catch (e) {
      logger.warn("meilisearch_update_settings_failed", {
        indexUid,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    indexReady = true;
    return true;
  } catch (e) {
    logger.warn("meilisearch_ensure_index_failed", {
      host: env.meilisearchHost,
      indexUid,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
};

export type MeilisearchPageDocument = {
  id: string;
  organizationId: string;
  documentId: string;
  pageNumber: number;
  documentName: string;
  category: string;
  uploadedBy: string;
  uploadedByUserId: string;
  documentStatus: string;
  content: string;
};

export const indexPageDocuments = async (docs: MeilisearchPageDocument[]): Promise<boolean> => {
  if (docs.length === 0) return false;
  const ms = getClient();
  if (!ms) return false;
  const ready = await ensureSearchIndex();
  if (!ready) return false;

  const index = ms.index(env.meilisearchIndexUid);
  const task = await index.addDocuments(docs);
  await ms.tasks.waitForTask(task.taskUid, { timeOutMs: 120_000 });
  return true;
};

export const deleteDocumentPagesFromIndex = async (
  organizationId: string,
  documentId: string,
): Promise<void> => {
  const ms = getClient();
  if (!ms) return;
  const ready = await ensureSearchIndex();
  if (!ready) return;

  const index = ms.index(env.meilisearchIndexUid);
  try {
    const task = await index.deleteDocuments({
      filter: `organizationId = "${organizationId}" AND documentId = "${documentId}"`,
    });
    await ms.tasks.waitForTask(task.taskUid, { timeOutMs: 60_000 });
  } catch (e) {
    logger.warn("meilisearch_delete_document_failed", {
      documentId,
      message: e instanceof Error ? e.message : String(e),
    });
  }
};

export type MeilisearchContentHit = {
  documentId: string;
  pageNumber: number;
  documentName: string;
  category: string;
  uploadedBy: string;
  snippet: string;
  snippetHtml: string;
};

export const searchDocumentContent = async (
  organizationId: string,
  query: string,
  options?: { uploadedByUserId?: string; limit?: number },
): Promise<MeilisearchContentHit[]> => {
  const ms = getClient();
  if (!ms || !query.trim()) return [];

  const ready = await ensureSearchIndex();
  if (!ready) return [];

  const filters = [`organizationId = "${organizationId}"`, `documentStatus = "active"`];
  if (options?.uploadedByUserId) {
    filters.push(`uploadedByUserId = "${options.uploadedByUserId}"`);
  }

  const index = ms.index(env.meilisearchIndexUid);
  let result;
  try {
    result = await index.search(query.trim(), {
      filter: filters.join(" AND "),
      limit: options?.limit ?? 40,
      attributesToHighlight: ["content"],
      attributesToCrop: ["content"],
      cropLength: 220,
      highlightPreTag: "<mark>",
      highlightPostTag: "</mark>",
      showMatchesPosition: true,
    });
  } catch (e) {
    logger.warn("meilisearch_search_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return [];
  }

  return result.hits.map((hit) => {
    const h = hit as Record<string, unknown>;
    const formatted = (h._formatted as Record<string, string> | undefined)?.content ?? "";
    const rawContent = String(h.content ?? "");
    const snippetHtml = formatted || rawContent.slice(0, 220);
    const snippet = stripHighlightMarkup(snippetHtml).slice(0, 280);

    const rawPage = Math.floor(Number(h.pageNumber ?? 1));
    return {
      documentId: String(h.documentId ?? ""),
      pageNumber: rawPage > 0 ? rawPage : 1,
      documentName: String(h.documentName ?? ""),
      category: String(h.category ?? ""),
      uploadedBy: String(h.uploadedBy ?? ""),
      snippet,
      snippetHtml,
    };
  });
};

const stripHighlightMarkup = (html: string): string =>
  html.replace(/<\/?mark>/gi, "").replace(/\s+/g, " ").trim();
