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
import { clearDocumentPreviewDir, writeOcrOutputFile } from "./documentStorageService";

export type DocumentOcrJob = {
  dbName: string;
  documentId: string;
  absoluteMainPath: string;
  safeStorageName: string;
};

let jobChain: Promise<void> = Promise.resolve();

const runDocumentOcrJob = async (job: DocumentOcrJob): Promise<void> => {
  logger.debug("ocr_job_start", { documentId: job.documentId, dbName: job.dbName });
  try {
    const buf = await readFile(job.absoluteMainPath);
    const ext = sniffExtension(buf, job.safeStorageName);
    await clearDocumentPreviewDir(env.storageRoot, job.documentId);

    let ocrTextBody = "";

    if (extensionUsesExternalOcrService(ext)) {
      const url = env.ocrServiceUrl?.trim();
      const minNative = env.ocrPdfMinNativeCharsToSkipExternal;

      if (ext === ".pdf" && minNative > 0) {
        const native = (await extractLocalDocumentText(buf, job.safeStorageName)).trim();
        if (native.length >= minNative) {
          ocrTextBody = native;
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
          const { text } = await callOcrService(url, buf, job.safeStorageName, env.ocrServiceTimeoutMs);
          ocrTextBody = text.trim();
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
        const { text } = await callOcrService(url, buf, job.safeStorageName, env.ocrServiceTimeoutMs);
        ocrTextBody = text.trim();
      }
    } else {
      ocrTextBody = (await extractLocalDocumentText(buf, job.safeStorageName)).trim();
    }

    if (ocrTextBody) {
      const ocr = await writeOcrOutputFile(env.storageRoot, job.documentId, ocrTextBody);
      await dbPool.query(
        `UPDATE \`${job.dbName}\`.documents
            SET ocr_text_path = ?, ocr_status = 'ready', preview_page_count = 0, updated_at = NOW()
          WHERE id = ?
          LIMIT 1`,
        [ocr.relativePath, job.documentId],
      );
      logger.info("ocr_job_ready", { documentId: job.documentId, fileName: job.safeStorageName, ext });
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
          SET ocr_status = 'failed', preview_page_count = 0, updated_at = NOW()
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
