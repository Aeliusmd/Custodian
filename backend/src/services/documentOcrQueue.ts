import { readFile } from "fs/promises";
import { dbPool } from "../config/db";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { extractDocumentForOcrJob } from "./documentTextExtractionService";
import {
  clearDocumentPreviewDir,
  writeOcrOutputFile,
  writePreviewPngPage,
} from "./documentStorageService";

export type DocumentOcrJob = {
  dbName: string;
  documentId: string;
  absoluteMainPath: string;
  safeStorageName: string;
};

/** One OCR job at a time (Tesseract worker is not safely parallel). */
let jobChain: Promise<void> = Promise.resolve();

const runDocumentOcrJob = async (job: DocumentOcrJob): Promise<void> => {
  logger.debug("ocr_job_start", { documentId: job.documentId, dbName: job.dbName });
  try {
    const buf = await readFile(job.absoluteMainPath);
    const { text, previewPngPages } = await extractDocumentForOcrJob(buf, job.safeStorageName);

    await clearDocumentPreviewDir(env.storageRoot, job.documentId);
    const sorted = [...previewPngPages].sort((a, b) => a.pageNumber - b.pageNumber);
    for (const page of sorted) {
      if (!page.buffer?.length) continue;
      await writePreviewPngPage(env.storageRoot, job.documentId, page.pageNumber, page.buffer);
    }
    const previewCount = sorted.filter((p) => p.buffer?.length).length;

    const trimmed = text.trim();
    if (trimmed) {
      const ocr = await writeOcrOutputFile(env.storageRoot, job.documentId, trimmed);
      await dbPool.query(
        `UPDATE \`${job.dbName}\`.documents
            SET ocr_text_path = ?, ocr_status = 'ready', preview_page_count = ?, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [ocr.relativePath, previewCount, job.documentId],
      );
      logger.info("ocr_job_ready", { documentId: job.documentId, fileName: job.safeStorageName, previewCount });
    } else if (previewCount > 0) {
      await dbPool.query(
        `UPDATE \`${job.dbName}\`.documents
            SET ocr_text_path = NULL, ocr_status = 'none', preview_page_count = ?, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [previewCount, job.documentId],
      );
      logger.info("ocr_job_preview_only", { documentId: job.documentId, fileName: job.safeStorageName, previewCount });
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
  } catch {
    await dbPool.query(
      `UPDATE \`${job.dbName}\`.documents
          SET ocr_status = 'failed', updated_at = NOW()
        WHERE id = ?
        LIMIT 1`,
      [job.documentId],
    );
    logger.warn("ocr_job_failed", { documentId: job.documentId });
  }
};

/** Queue OCR after the document row is committed and the binary is on disk. */
export const enqueueDocumentOcr = (job: DocumentOcrJob): void => {
  jobChain = jobChain
    .then(() => runDocumentOcrJob(job))
    .catch(() => {});
};
