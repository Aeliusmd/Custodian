import mammoth from "mammoth";
import path from "path";
import { pathToFileURL } from "url";
import Tesseract from "tesseract.js";
import * as XLSX from "xlsx";
import { env } from "../config/env";
import { logger } from "../config/logger";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text?: string; numpages?: number }>;

/** `out/` — resolved via package main entry (subpaths like `/package.json` are not exported). */
const pdfToPngOutDir = path.dirname(require.resolve("pdf-to-png-converter"));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pdfToPng, VerbosityLevel } = require("pdf-to-png-converter") as {
  pdfToPng: (
    pdfFile: string | ArrayBufferLike | Uint8Array,
    props?: {
      viewportScale?: number;
      disableFontFace?: boolean;
      useSystemFonts?: boolean;
      enableXfa?: boolean;
      pagesToProcess?: number[];
      verbosityLevel?: number;
      returnPageContent?: boolean;
      processPagesInParallel?: boolean;
      concurrencyLimit?: number;
    },
  ) => Promise<Array<{ pageNumber: number; content?: Buffer }>>;
  VerbosityLevel: { ERRORS: number };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NodeCanvasFactory } = require(path.join(pdfToPngOutDir, "node.canvas.factory.js")) as {
  NodeCanvasFactory: new () => {
    create: (w: number, h: number) => {
      canvas: { toBuffer: (mime: string) => Buffer };
      context: { canvas?: unknown } & Record<string, unknown>;
    };
    destroy: (pair: { canvas: unknown; context: unknown }) => void;
  };
};

const MAX_CANVAS_PX = 100_000_000;

/** pdfjs 5 requires factory URLs to end with `/`. Paths ending in Windows `\\` fail validation. */
const toPdfJsFactoryUrl = (absDir: string): string => {
  const resolved = path.resolve(absDir);
  const withTrailer = resolved.endsWith(path.sep) ? resolved : resolved + path.sep;
  let href = pathToFileURL(withTrailer).href;
  if (!href.endsWith("/")) href += "/";
  return href;
};

/** pdfjs-dist root: `legacy/build/pdf.mjs` → up two levels (no reliance on `package.json` subpath). */
const pdfJsPackageRoot = (): string =>
  path.resolve(path.dirname(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")), "..", "..");

/**
 * Rasterize PDF pages using pdf.js + Node canvas (same stack as pdf-to-png-converter) with
 * `file://…/cmaps/` URLs so pdfjs validates on Windows.
 */
const rasterizePdfPagesForOcr = async (
  buffer: Buffer,
  pageNumbers: number[],
  viewportScale: number,
): Promise<Array<{ pageNumber: number; content: Buffer }>> => {
  const pdfRoot = pdfJsPackageRoot();
  const cMapUrl = toPdfJsFactoryUrl(path.join(pdfRoot, "cmaps"));
  const standardFontDataUrl = toPdfJsFactoryUrl(path.join(pdfRoot, "standard_fonts"));

  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdfjs 5 rejects Node `Buffer` for `data` even though Buffer extends Uint8Array — use a plain view/copy.
  const pdfData = new Uint8Array(buffer);
  const pdfDocument = await getDocument({
    data: pdfData,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    disableFontFace: true,
    useSystemFonts: false,
    enableXfa: true,
    verbosity: 0,
  }).promise;

  const numPages = pdfDocument.numPages;
  const pages = [...new Set(pageNumbers)]
    .filter((p) => Number.isInteger(p) && p >= 1 && p <= numPages)
    .sort((a, b) => a - b);
  if (pages.length === 0) {
    logger.warn("pdf_rasterize_no_valid_pages", { numPages, requestedSample: pageNumbers.slice(0, 10) });
    await pdfDocument.cleanup();
    return [];
  }

  const canvasFactory = new NodeCanvasFactory();
  const pngs: Array<{ pageNumber: number; content: Buffer }> = [];
  try {
    for (const pageNumber of pages) {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: viewportScale });
      if (viewport.width * viewport.height > MAX_CANVAS_PX) {
        page.cleanup();
        logger.warn("pdf_page_skipped_canvas_limit", { pageNumber });
        continue;
      }
      const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);
      try {
        const renderTask = page.render({
          canvasContext: context as never,
          viewport,
          canvas: canvas as never,
        });
        await renderTask.promise;
        pngs.push({ pageNumber, content: canvas.toBuffer("image/png") });
      } finally {
        page.cleanup();
        canvasFactory.destroy({ canvas, context });
      }
    }
  } finally {
    await pdfDocument.cleanup();
  }
  return pngs;
};

/** Serialize OCR through one Tesseract worker (not concurrency-safe). */
let ocrChain: Promise<unknown> = Promise.resolve();

let workerPromise: Promise<Tesseract.Worker> | null = null;

const getOcrWorker = (): Promise<Tesseract.Worker> => {
  if (!workerPromise) {
    workerPromise = (async () => {
      const langs = env.ocrLanguages.trim() || "eng";
      const worker = await Tesseract.createWorker(langs, Tesseract.OEM.LSTM_ONLY, {
        logger: () => {},
      });
      // OEM is fixed at createWorker — do not set tessedit_ocr_engine_mode here (runtime warning).
      // Use PSM.AUTO, not AUTO_OSD: AUTO_OSD needs osd.traineddata (orientation/script detect), often missing in tesseract.js bundles → noisy stderr; OCR still fell back but confused operators.
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: "1",
      });
      return worker;
    })();
  }
  return workerPromise;
};

const recognizeImageBuffer = async (imageBuffer: Buffer): Promise<string> => {
  const run = ocrChain.then(async () => {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(imageBuffer);
    return (data.text ?? "").trim();
  });
  ocrChain = run.then(() => {}, () => {});
  return run;
};

/** Rasterized PDF pages (same pipeline as OCR) for preview images + Tesseract input. */
const getRasterizedPngsForPdf = async (buffer: Buffer): Promise<Array<{ pageNumber: number; content: Buffer }>> => {
  const maxPages = Math.max(1, Math.min(100, env.ocrPdfMaxPages));
  const viewportScale = Math.min(4, Math.max(1, env.ocrViewportScale));

  let pageCount = maxPages;
  try {
    const parsed = await pdfParse(buffer);
    const n = Number(parsed.numpages ?? 0);
    if (Number.isFinite(n) && n > 0) pageCount = Math.min(n, maxPages);
  } catch {
    pageCount = maxPages;
  }

  const pagesToProcess = Array.from({ length: pageCount }, (_, i) => i + 1);

  try {
    const pngs = await rasterizePdfPagesForOcr(buffer, pagesToProcess, viewportScale);
    if (pngs.length > 0) {
      return [...pngs].sort((a, b) => a.pageNumber - b.pageNumber);
    }
    logger.warn("pdf_to_png_empty_primary", { requestedPages: pagesToProcess.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("pdf_to_png_failed_primary", { message: msg });
  }

  // Fallback to package converter for PDFs that fail custom pdf.js rasterization.
  try {
    const fallback = await pdfToPng(buffer, {
      pagesToProcess,
      viewportScale,
      disableFontFace: true,
      useSystemFonts: false,
      enableXfa: true,
      returnPageContent: true,
      processPagesInParallel: false,
      verbosityLevel: VerbosityLevel.ERRORS,
    });
    const pngs = fallback
      .filter((p) => p.content && p.content.length > 0)
      .map((p) => ({ pageNumber: p.pageNumber, content: p.content as Buffer }))
      .sort((a, b) => a.pageNumber - b.pageNumber);
    if (pngs.length > 0) {
      logger.info("pdf_to_png_fallback_ok", { pageCount: pngs.length });
      return pngs;
    }
    logger.warn("pdf_to_png_fallback_empty", { requestedPages: pagesToProcess.length });
    return [];
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("pdf_to_png_failed", { message: msg });
    return [];
  }
};

const ocrPdfPages = async (buffer: Buffer): Promise<string> => {
  const sorted = await getRasterizedPngsForPdf(buffer);
  const parts: string[] = [];
  for (const page of sorted) {
    if (!page.content?.length) continue;
    const text = await recognizeImageBuffer(page.content);
    if (text) parts.push(text);
  }
  return parts.join("\n\n").trim();
};

/** If the extension is wrong or missing, infer type from magic bytes so OCR still runs. */
const sniffExtension = (buffer: Buffer, fileName: string): string => {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-") return ".pdf";
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return ".png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpeg";
  if (buffer.length >= 4 && buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x0) return ".tif";
  if (buffer.length >= 4 && buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x0 && buffer[3] === 0x2a) return ".tif";
  if (buffer.length >= 4 && buffer[0] === 0x42 && buffer[1] === 0x4d) return ".bmp";
  if (buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return ".webp";
  return path.extname(fileName).toLowerCase();
};

/**
 * Full document text: native extraction for office/spreadsheets, then
 * **Tesseract 5 LSTM** (via tesseract.js) for images and for PDFs that lack a text layer.
 */
export const extractDocumentFullText = async (buffer: Buffer, fileName: string): Promise<string> => {
  const ext = sniffExtension(buffer, fileName);

  if (ext === ".txt" || ext === ".csv") {
    return buffer.toString("utf8").trim();
  }

  if (ext === ".docx") {
    try {
      const r = await mammoth.extractRawText({ buffer });
      return (r.value ?? "").trim();
    } catch {
      return "";
    }
  }

  if (ext === ".xlsx" || ext === ".xls") {
    try {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const first = wb.SheetNames[0];
      if (!first) return "";
      const sheet = wb.Sheets[first];
      if (!sheet) return "";
      return (XLSX.utils.sheet_to_csv(sheet) ?? "").trim();
    } catch {
      return "";
    }
  }

  if (ext === ".pdf") {
    let native = "";
    try {
      const parsed = await pdfParse(buffer);
      native = (parsed.text ?? "").trim();
    } catch {
      native = "";
    }
    if (native.length >= 200) return native;
    const ocr = await ocrPdfPages(buffer);
    return ocr.length > native.length ? ocr : native;
  }

  if ([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"].includes(ext)) {
    return recognizeImageBuffer(buffer);
  }

  return "";
};

/** Text + page images for the OCR job (previews on disk; OCR text file separate). */
export type OcrJobExtractionResult = {
  text: string;
  previewPngPages: Array<{ pageNumber: number; buffer: Buffer }>;
};

export const extractDocumentForOcrJob = async (buffer: Buffer, fileName: string): Promise<OcrJobExtractionResult> => {
  const ext = sniffExtension(buffer, fileName);
  const empty = (): OcrJobExtractionResult => ({ text: "", previewPngPages: [] });

  if (ext === ".txt" || ext === ".csv") {
    return { text: buffer.toString("utf8").trim(), previewPngPages: [] };
  }

  if (ext === ".docx") {
    try {
      const r = await mammoth.extractRawText({ buffer });
      return { text: (r.value ?? "").trim(), previewPngPages: [] };
    } catch {
      return empty();
    }
  }

  if (ext === ".xlsx" || ext === ".xls") {
    try {
      const wb = XLSX.read(buffer, { type: "buffer" });
      const first = wb.SheetNames[0];
      if (!first) return empty();
      const sheet = wb.Sheets[first];
      if (!sheet) return empty();
      return { text: (XLSX.utils.sheet_to_csv(sheet) ?? "").trim(), previewPngPages: [] };
    } catch {
      return empty();
    }
  }

  if (ext === ".pdf") {
    let native = "";
    try {
      const parsed = await pdfParse(buffer);
      native = (parsed.text ?? "").trim();
    } catch {
      native = "";
    }
    const raster = await getRasterizedPngsForPdf(buffer);
    const previewPngPages = raster
      .filter((p) => p.content?.length)
      .map((p) => ({ pageNumber: p.pageNumber, buffer: p.content }));

    if (native.length >= 200) {
      return { text: native, previewPngPages };
    }

    const parts: string[] = [];
    for (const page of raster) {
      if (!page.content?.length) continue;
      const text = await recognizeImageBuffer(page.content);
      if (text) parts.push(text);
    }
    const ocrText = parts.join("\n\n").trim();
    const finalText = ocrText.length > native.length ? ocrText : native;
    return { text: finalText, previewPngPages };
  }

  if ([".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"].includes(ext)) {
    const text = await recognizeImageBuffer(buffer);
    return {
      text: text.trim(),
      previewPngPages: buffer.length ? [{ pageNumber: 1, buffer: Buffer.from(buffer) }] : [],
    };
  }

  return empty();
};
