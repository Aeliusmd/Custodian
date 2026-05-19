import { logger } from "../config/logger";

export type OcrServicePage = { page: number; text: string };

export type OcrServiceResponse = {
  text: string;
  pages: OcrServicePage[];
};

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
