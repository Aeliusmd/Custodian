import { logger } from "../config/logger";

export type OcrServiceResponse = {
  text: string;
  pages: OcrServicePage[];
};

export type OcrServicePage = { page: number; text: string };

/**
 * POSTs the document bytes to the OCR HTTP service (e.g. `ocr-service` FastAPI).
 * Expected JSON: `{ "text": "..." }` or `{ "markdown": "..." }`, or a plain text body.
 */
export const callOcrService = async (
  serviceUrl: string,
  buffer: Buffer,
  fileName: string,
  timeoutMs: number,
): Promise<OcrServiceResponse> => {
  const file = new File([new Uint8Array(buffer)], fileName || "document.bin", {
    type: "application/octet-stream",
  });
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(serviceUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OCR service HTTP ${res.status}${errText ? `: ${errText.slice(0, 500)}` : ""}`);
    }

    const raw = await res.text();
    let text = "";
    let pages: OcrServicePage[] = [];
    try {
      const json = JSON.parse(raw) as {
        text?: string;
        markdown?: string;
        pages?: Array<{ page?: number; text?: string }>;
      };
      text = (json.text ?? json.markdown ?? "").trim();
      pages = (json.pages ?? [])
        .map((p) => ({
          page: Math.max(1, Math.floor(Number(p.page ?? 1))),
          text: String(p.text ?? "").trim(),
        }))
        .filter((p) => p.text);
    } catch {
      text = raw.trim();
    }

    if (!text) {
      throw new Error("OCR service returned empty body");
    }

    if (pages.length === 0) {
      pages = [{ page: 1, text }];
    }

    return { text, pages };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("ocr_service_call_failed", { message: msg, serviceUrl });
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

/** Derive the `/render-page` URL from the configured `/ocr` service URL. */
const renderPageUrlFrom = (ocrServiceUrl: string): string =>
  new URL("/render-page", ocrServiceUrl).toString();

/**
 * POSTs a PDF to the OCR service's `/render-page` endpoint and returns the PNG
 * image bytes for the requested 1-based page. Used for the page-by-page viewer.
 */
export const renderPdfPageImage = async (
  ocrServiceUrl: string,
  buffer: Buffer,
  fileName: string,
  pageOneBased: number,
  timeoutMs: number,
): Promise<Buffer> => {
  const renderUrl = renderPageUrlFrom(ocrServiceUrl);
  const file = new File([new Uint8Array(buffer)], fileName || "document.pdf", {
    type: "application/pdf",
  });
  const formData = new FormData();
  formData.append("file", file);
  formData.append("page", String(pageOneBased));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(renderUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Render service HTTP ${res.status}${errText ? `: ${errText.slice(0, 300)}` : ""}`);
    }
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.warn("render_page_call_failed", { message: msg, renderUrl, page: pageOneBased });
    throw e;
  } finally {
    clearTimeout(timer);
  }
};
