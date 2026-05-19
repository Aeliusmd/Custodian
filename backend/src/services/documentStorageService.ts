import { mkdir, rm, unlink, writeFile } from "fs/promises";
import path from "path";

const normalizeRelative = (relative: string): string =>
  relative.replace(/^[/\\]+/, "").replace(/\.\./g, "");

export const absoluteFromStorageRoot = (storageRoot: string, relative: string): string =>
  path.join(storageRoot, normalizeRelative(relative));

export async function writeUploadedDocumentFile(
  storageRoot: string,
  documentId: string,
  safeFileName: string,
  buffer: Buffer,
): Promise<{ relativePath: string; absolutePath: string }> {
  const relativePath = `uploads/${documentId}-${safeFileName}`;
  const absolutePath = absoluteFromStorageRoot(storageRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return { relativePath, absolutePath };
}

export type OcrPageText = { page: number; text: string };

export async function writeOcrOutputFile(
  storageRoot: string,
  documentId: string,
  text: string,
): Promise<{ relativePath: string; absolutePath: string }> {
  const relativePath = `uploads/ocr/${documentId}.txt`;
  const absolutePath = absoluteFromStorageRoot(storageRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text, "utf8");
  return { relativePath, absolutePath };
}

export async function writeOcrPagesFile(
  storageRoot: string,
  documentId: string,
  pages: OcrPageText[],
): Promise<{ relativePath: string; absolutePath: string }> {
  const relativePath = `uploads/ocr/${documentId}.pages.json`;
  const absolutePath = absoluteFromStorageRoot(storageRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, JSON.stringify({ pages }), "utf8");
  return { relativePath, absolutePath };
}

export const splitFlatOcrTextIntoPages = (text: string): OcrPageText[] => {
  const t = text.replace(/\r\n/g, "\n").trim();
  if (!t) return [];
  const parts = t.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  return parts.map((part, i) => ({ page: i + 1, text: part }));
};

/** Relative path for a rendered preview page PNG (1-based page index). */
export const previewPageRelativePath = (documentId: string, pageOneBased: number): string =>
  `uploads/previews/${documentId}/${pageOneBased}.png`;

export async function clearDocumentPreviewDir(storageRoot: string, documentId: string): Promise<void> {
  const dir = absoluteFromStorageRoot(storageRoot, `uploads/previews/${documentId}`);
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}

export async function writePreviewPngPage(
  storageRoot: string,
  documentId: string,
  pageOneBased: number,
  buffer: Buffer,
): Promise<{ relativePath: string; absolutePath: string }> {
  const relativePath = previewPageRelativePath(documentId, pageOneBased);
  const absolutePath = absoluteFromStorageRoot(storageRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return { relativePath, absolutePath };
}

export async function unlinkQuiet(absolutePath: string | null | undefined): Promise<void> {
  if (!absolutePath) return;
  await unlink(absolutePath).catch(() => {});
}
