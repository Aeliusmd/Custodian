import path from "path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (data: Buffer) => Promise<{ text?: string }>;

/** If the extension is wrong or missing, infer type from magic bytes. */
export const sniffExtension = (buffer: Buffer, fileName: string): string => {
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

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"] as const;

/** Types handled by the external OCR HTTP service (PDF / images). */
export const extensionUsesExternalOcrService = (ext: string): boolean => {
  return ext === ".pdf" || (IMAGE_EXT as readonly string[]).includes(ext);
};

/**
 * Plain text extracted in Node (no external OCR service).
 * PDF: embedded text layer only via pdf-parse.
 */
export const extractLocalDocumentText = async (buffer: Buffer, fileName: string): Promise<string> => {
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
    try {
      const parsed = await pdfParse(buffer);
      return (parsed.text ?? "").trim();
    } catch {
      return "";
    }
  }

  return "";
};
