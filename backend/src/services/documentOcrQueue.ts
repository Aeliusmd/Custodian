import { readFile } from "fs/promises";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { callOcrService } from "./documentOcrExternalClient";
import {
  extensionUsesExternalOcrService,
  extractLocalDocumentText,
  sniffExtension,
} from "./documentTextExtractionService";
import { indexDocumentInSearch } from "./documentSearchIndexService";
import {
  clearDocumentPreviewDir,
  splitFlatOcrTextIntoPages,
  writeOcrOutputFile,
  writeOcrPagesFile,
  type OcrPageText,
} from "./documentStorageService";

export type DocumentOcrJob = {
  dbName: string;
  organizationId: string;
  documentId: string;
  absoluteMainPath: string;
  safeStorageName: string;
};

let jobChain: Promise<void> = Promise.resolve();

const OCR_RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryOcrError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("aborted") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("econnreset")
  );
};

const persistOcrPages = async (documentId: string, pages: OcrPageText[], flatText: string): Promise<void> => {
  const normalized = pages.length > 0 ? pages : splitFlatOcrTextIntoPages(flatText);
  await writeOcrOutputFile(env.storageRoot, documentId, flatText);
  if (normalized.length > 0) {
    await writeOcrPagesFile(env.storageRoot, documentId, normalized);
  }
};

const runDocumentOcrJob = async (job: DocumentOcrJob, attempt = 0): Promise<void> => {
  logger.debug("ocr_job_start", { documentId: job.documentId, dbName: job.dbName });
  try {
    const buf = await readFile(job.absoluteMainPath);
    const ext = sniffExtension(buf, job.safeStorageName);
    await clearDocumentPreviewDir(env.storageRoot, job.documentId);

    let ocrTextBody = "";
    let ocrPages: OcrPageText[] = [];

    if (extensionUsesExternalOcrService(ext)) {
      const url = env.ocrServiceUrl?.trim();
      const minNative = env.ocrPdfMinNativeCharsToSkipExternal;

      if (ext === ".pdf" && minNative > 0) {
        const native = (await extractLocalDocumentText(buf, job.safeStorageName)).trim();
        if (native.length >= minNative) {
          ocrTextBody = native;
          ocrPages = splitFlatOcrTextIntoPages(native);
          logger.info("ocr_job_pdf_skipped_external", {
            documentId: job.documentId,
            nativeChars: native.length,
            threshold: minNative,
          });
        } else if (!url) {
          logger.warn("ocr_job_no_service_url", { documentId: job.documentId, ext });
          await dbPool.query(
            `UPDATE \`${job.dbName}\`.documents
                SET ocr_status = 'failed', preview_page_count = 0, updated_at = NOW()
              WHERE id = ?
              LIMIT 1`,
            [job.documentId],
          );
          return;
        } else {
          const { text, pages } = await callOcrService(url, buf, job.safeStorageName, env.ocrServiceTimeoutMs);
          ocrTextBody = text.trim();
          ocrPages = pages.map((p) => ({ page: p.page, text: p.text }));
        }
      } else if (!url) {
        logger.warn("ocr_job_no_service_url", { documentId: job.documentId, ext });
        await dbPool.query(
          `UPDATE \`${job.dbName}\`.documents
              SET ocr_status = 'failed', preview_page_count = 0, updated_at = NOW()
            WHERE id = ?
            LIMIT 1`,
          [job.documentId],
        );
        return;
      } else {
        const { text, pages } = await callOcrService(url, buf, job.safeStorageName, env.ocrServiceTimeoutMs);
        ocrTextBody = text.trim();
        ocrPages = pages.map((p) => ({ page: p.page, text: p.text }));
      }
    } else {
      ocrTextBody = (await extractLocalDocumentText(buf, job.safeStorageName)).trim();
      ocrPages = splitFlatOcrTextIntoPages(ocrTextBody);
    }

    if (ocrTextBody) {
      await persistOcrPages(job.documentId, ocrPages, ocrTextBody);
      const pageCount = ocrPages.length > 0 ? ocrPages.length : splitFlatOcrTextIntoPages(ocrTextBody).length;
      await dbPool.query(
        `UPDATE \`${job.dbName}\`.documents
            SET ocr_text_path = ?, ocr_status = 'ready', preview_page_count = ?, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [`uploads/ocr/${job.documentId}.txt`, Math.max(0, pageCount), job.documentId],
      );
      logger.info("ocr_job_ready", { documentId: job.documentId, fileName: job.safeStorageName, ext, pageCount });

      void indexDocumentInSearch({
        organizationId: job.organizationId,
        dbName: job.dbName,
        documentId: job.documentId,
        ocrText: ocrTextBody,
      });
    } else {
      await dbPool.query(
        `UPDATE \`${job.dbName}\`.documents
            SET ocr_text_path = NULL, ocr_status = 'none', preview_page_count = 0, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [job.documentId],
      );
      logger.info("ocr_job_empty", { documentId: job.documentId, fileName: job.safeStorageName });
    }
  } catch (error) {
    if (attempt < OCR_RETRY_DELAYS_MS.length && shouldRetryOcrError(error)) {
      const delayMs = OCR_RETRY_DELAYS_MS[attempt] ?? 30_000;
      logger.warn("ocr_job_retry", {
        documentId: job.documentId,
        fileName: job.safeStorageName,
        attempt: attempt + 1,
        delayMs,
        message: error instanceof Error ? error.message : String(error),
      });
      await sleep(delayMs);
      return runDocumentOcrJob(job, attempt + 1);
    }

    await dbPool.query(
      `UPDATE \`${job.dbName}\`.documents
          SET ocr_status = 'failed', preview_page_count = 0, updated_at = NOW()
        WHERE id = ?
      LIMIT 1`,
      [job.documentId],
    );
    logger.warn("ocr_job_failed", {
      documentId: job.documentId,
      fileName: job.safeStorageName,
      filePath: job.absoluteMainPath,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

/** Queue OCR after the document row is committed and the binary is on disk. */
export const enqueueDocumentOcr = (job: DocumentOcrJob): void => {
  jobChain = jobChain
    .then(() => runDocumentOcrJob(job))
    .catch(() => {});
};
