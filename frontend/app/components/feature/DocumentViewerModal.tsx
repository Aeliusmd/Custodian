'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentRecord, DocumentVersion } from '@/mocks/documents';
import {
  fileExtension,
  inferClientPreviewMode,
  MAX_TEXT_PREVIEW_BYTES,
  type ClientPreviewMode,
} from './documentViewerPreview';

const TEAL = '#0097B2';

/** Split OCR / snippet text into pseudo-pages for the viewer. */
function splitContentIntoPageSections(text: string): string[] {
  const t = text.replace(/\r\n/g, '\n').trim();
  if (!t) return [];
  const byFf = t.split(/\f/).map((s) => s.trim()).filter(Boolean);
  if (byFf.length > 1) return byFf;
  const byTripleNl = t.split(/\n{3,}/).map((s) => s.trim()).filter(Boolean);
  if (byTripleNl.length > 1) return byTripleNl;
  const byDoubleNl = t.split(/\n\n/).map((s) => s.trim()).filter(Boolean);
  if (byDoubleNl.length > 1) return byDoubleNl;
  const single = byDoubleNl[0] ?? t;
  if (single.length <= 6000) return [single];
  const chunk = 5000;
  const parts: string[] = [];
  for (let i = 0; i < single.length; i += chunk) parts.push(single.slice(i, i + chunk));
  return parts;
}

interface Props {
  doc: DocumentRecord;
  version?: DocumentVersion;
  onClose: () => void;
  onOpenVersionHistory?: () => void;
  /** Full URL to download the original file (e.g. `${API}/protected/org-admin/documents/:id/file`). */
  fileDownloadUrl?: string;
  onNotify?: (message: string, type: 'success' | 'error') => void;
  /** When `doc.previewPageCount > 0`, fetches each page PNG (credentials). */
  previewImageUrlForPage?: (pageOneBased: number) => string;
}

export default function DocumentViewerModal({
  doc,
  version,
  onClose,
  onOpenVersionHistory,
  fileDownloadUrl,
  onNotify,
  previewImageUrlForPage,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [pageImageSrc, setPageImageSrc] = useState<string | null>(null);
  const [pageImageLoading, setPageImageLoading] = useState(false);
  const [pageImageError, setPageImageError] = useState(false);

  const previewPageCount = Math.max(0, Math.floor(doc.previewPageCount ?? 0));
  const usePageImages = previewPageCount > 0 && typeof previewImageUrlForPage === 'function';

  const previewBlobUrlRef = useRef<string | null>(null);

  const clientMode: ClientPreviewMode | null = usePageImages
    ? null
    : fileDownloadUrl
      ? inferClientPreviewMode(doc.name, doc.fileType)
      : 'no-file-url';

  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRenderTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [pdfNumPages, setPdfNumPages] = useState(0);

  const mediaBlobUrlRef = useRef<string | null>(null);
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const [textBody, setTextBody] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);
  const [textTruncated, setTextTruncated] = useState(false);

  // Version label for the header (must stay a normal const — not inside useEffect).
  const fallbackVersion: DocumentVersion = {
    id: `${doc.id}-v0`,
    versionName: 'v1.0',
    date: doc.lastUpdated || doc.uploadDate || '',
    uploadedBy: doc.uploadedBy || 'Unknown',
    isCurrent: true,
  };
  const displayVersion = version ?? doc.versions.find((v) => v.isCurrent) ?? doc.versions[0] ?? fallbackVersion;
  const realContentBlocks = splitContentIntoPageSections(doc.contentSnippet ?? '');
  const textPageContent = realContentBlocks.length > 0 ? realContentBlocks : ['No preview content available yet for this document.'];
  const textTotalPages = textPageContent.length;

  const totalPages = usePageImages
    ? previewPageCount
    : clientMode === 'pdf-canvas' && pdfNumPages > 0
      ? pdfNumPages
      : clientMode === 'image' || clientMode === 'video' || clientMode === 'audio' || clientMode === 'unsupported-binary' || clientMode === 'no-file-url'
        ? 1
        : clientMode === 'text'
          ? 1
          : textTotalPages;

  useEffect(() => {
    queueMicrotask(() => {
      setCurrentPage(0);
      setZoom(100);
    });
  }, [doc.id]);

  useEffect(() => {
    if (!usePageImages || !previewImageUrlForPage) {
      return undefined;
    }
    const url = previewImageUrlForPage(currentPage + 1);
    if (!url) return undefined;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setPageImageLoading(true);
        setPageImageError(false);
      }
    });

    void fetch(url, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (previewBlobUrlRef.current) {
          URL.revokeObjectURL(previewBlobUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        previewBlobUrlRef.current = objectUrl;
        setPageImageSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPageImageError(true);
      })
      .finally(() => {
        if (!cancelled) setPageImageLoading(false);
      });

    return () => {
      cancelled = true;
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
  }, [doc.id, currentPage, usePageImages, previewImageUrlForPage]);

  // PDF.js: load document (cookie-auth file → ArrayBuffer).
  useEffect(() => {
    if (clientMode !== 'pdf-canvas' || !fileDownloadUrl) {
      pdfRenderTaskRef.current?.cancel?.();
      pdfRenderTaskRef.current = null;
      void pdfRef.current?.destroy().catch(() => {});
      pdfRef.current = null;
      queueMicrotask(() => {
        setPdfNumPages(0);
        setPdfLoading(false);
        setPdfError(false);
      });
      return undefined;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setPdfLoading(true);
      setPdfError(false);
      setPdfNumPages(0);
    });

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const { getDocument, GlobalWorkerOptions, version } = pdfjs;
        GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const res = await fetch(fileDownloadUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(String(res.status));
        const raw = await res.arrayBuffer();
        if (cancelled) return;

        const data = new Uint8Array(raw);
        const loadingTask = getDocument({
          data,
          useSystemFonts: true,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${version}/standard_fonts/`,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          void pdf.destroy().catch(() => {});
          return;
        }
        void pdfRef.current?.destroy().catch(() => {});
        pdfRef.current = pdf;
        setPdfNumPages(pdf.numPages);
      } catch {
        if (!cancelled) setPdfError(true);
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      pdfRenderTaskRef.current?.cancel?.();
      pdfRenderTaskRef.current = null;
      void pdfRef.current?.destroy().catch(() => {});
      pdfRef.current = null;
    };
  }, [clientMode, fileDownloadUrl, doc.id]);

  // PDF.js: render current page to canvas.
  useEffect(() => {
    if (clientMode !== 'pdf-canvas' || !pdfRef.current || !pdfCanvasRef.current || pdfNumPages < 1) {
      return undefined;
    }

    const pdf = pdfRef.current;
    const canvas = pdfCanvasRef.current;
    const pageNumber = Math.min(Math.max(currentPage + 1, 1), pdf.numPages);

    let cancelled = false;

    void (async () => {
      pdfRenderTaskRef.current?.cancel?.();
      pdfRenderTaskRef.current = null;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const baseW = 816;
        const viewport1 = page.getViewport({ scale: 1 });
        const scale = (baseW / viewport1.width) * (zoom / 100);
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const w = Math.floor(viewport.width);
        const h = Math.floor(viewport.height);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        const task = page.render({
          canvas,
          canvasContext: ctx,
          viewport,
          transform,
        });
        pdfRenderTaskRef.current = task;
        await task.promise;
      } catch {
        // RenderingCancelledException on fast page flip — ignore.
      }
    })();

    return () => {
      cancelled = true;
      pdfRenderTaskRef.current?.cancel?.();
      pdfRenderTaskRef.current = null;
    };
  }, [clientMode, currentPage, zoom, pdfNumPages, doc.id]);

  // Image / video / audio: single blob URL from authenticated file endpoint.
  useEffect(() => {
    if (!fileDownloadUrl || clientMode === 'no-file-url') {
      if (mediaBlobUrlRef.current) {
        URL.revokeObjectURL(mediaBlobUrlRef.current);
        mediaBlobUrlRef.current = null;
      }
      queueMicrotask(() => {
        setMediaBlobUrl(null);
        setMediaLoading(false);
        setMediaError(false);
      });
      return undefined;
    }
    if (clientMode !== 'image' && clientMode !== 'video' && clientMode !== 'audio') {
      if (mediaBlobUrlRef.current) {
        URL.revokeObjectURL(mediaBlobUrlRef.current);
        mediaBlobUrlRef.current = null;
      }
      queueMicrotask(() => {
        setMediaBlobUrl(null);
        setMediaLoading(false);
        setMediaError(false);
      });
      return undefined;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setMediaLoading(true);
      setMediaError(false);
    });

    void fetch(fileDownloadUrl, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const cl = r.headers.get('Content-Length');
        if (cl && Number(cl) > 80 * 1024 * 1024) {
          throw new Error('too_large');
        }
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (mediaBlobUrlRef.current) URL.revokeObjectURL(mediaBlobUrlRef.current);
        const u = URL.createObjectURL(blob);
        mediaBlobUrlRef.current = u;
        setMediaBlobUrl(u);
      })
      .catch(() => {
        if (!cancelled) setMediaError(true);
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });

    return () => {
      cancelled = true;
      if (mediaBlobUrlRef.current) {
        URL.revokeObjectURL(mediaBlobUrlRef.current);
        mediaBlobUrlRef.current = null;
      }
    };
  }, [clientMode, fileDownloadUrl, doc.id]);

  // Plain-text preview (bounded size).
  useEffect(() => {
    if (clientMode !== 'text' || !fileDownloadUrl) {
      queueMicrotask(() => {
        setTextBody('');
        setTextError(false);
        setTextTruncated(false);
        setTextLoading(false);
      });
      return undefined;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setTextLoading(true);
      setTextError(false);
      setTextTruncated(false);
      setTextBody('');
    });

    void fetch(fileDownloadUrl, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const cl = r.headers.get('Content-Length');
        if (cl && Number(cl) > MAX_TEXT_PREVIEW_BYTES) {
          return { text: '', truncated: true as const };
        }
        const buf = await r.arrayBuffer();
        if (buf.byteLength > MAX_TEXT_PREVIEW_BYTES) {
          const slice = buf.slice(0, MAX_TEXT_PREVIEW_BYTES);
          const dec = new TextDecoder('utf-8', { fatal: false });
          return { text: dec.decode(slice), truncated: true as const };
        }
        const dec = new TextDecoder('utf-8', { fatal: false });
        return { text: dec.decode(buf), truncated: false as const };
      })
      .then(({ text, truncated }) => {
        if (cancelled) return;
        setTextBody(text);
        setTextTruncated(truncated);
      })
      .catch(() => {
        if (!cancelled) setTextError(true);
      })
      .finally(() => {
        if (!cancelled) setTextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientMode, fileDownloadUrl, doc.id]);

  const fileIconClass = (() => {
    const ft = (doc.fileType || '').toUpperCase();
    if (ft.includes('PDF')) return 'ri-file-pdf-2-line';
    if (ft.includes('XLS')) return 'ri-file-excel-2-line';
    if (ft.includes('DOC')) return 'ri-file-word-2-line';
    if (ft.includes('PNG') || ft.includes('JPG') || ft.includes('JPEG') || ft.includes('GIF') || ft.includes('WEBP')) {
      return 'ri-image-2-line';
    }
    return 'ri-file-2-line';
  })();

  const handleDownload = () => {
    if (!fileDownloadUrl) {
      onNotify?.('Download is not available for this view.', 'error');
      return;
    }
    void (async () => {
      setDownloadBusy(true);
      try {
        const response = await fetch(fileDownloadUrl, { credentials: 'include' });
        if (!response.ok) {
          let msg = `Download failed (${response.status})`;
          try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) msg = body.message;
          } catch {
            // keep msg
          }
          onNotify?.(msg, 'error');
          return;
        }
        const blob = await response.blob();
        const cd = response.headers.get('Content-Disposition');
        let filename = doc.name;
        const quoted = cd?.match(/filename="([^"]+)"/i);
        const star = cd?.match(/filename\*=UTF-8''([^;\s]+)/i);
        const raw = quoted?.[1] ?? star?.[1];
        if (raw) {
          try {
            filename = decodeURIComponent(raw);
          } catch {
            filename = raw;
          }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        onNotify?.(`Downloaded "${filename}"`, 'success');
      } catch {
        onNotify?.('Download failed.', 'error');
      } finally {
        setDownloadBusy(false);
      }
    })();
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 60));

  const PAGE_W = 794;
  const PAGE_H = 1123;
  const scaledW = Math.round((PAGE_W * zoom) / 100);
  const scaledH = Math.round((PAGE_H * zoom) / 100);

  const centerCanvasLayout = usePageImages || clientMode === 'pdf-canvas' || clientMode === 'image';

  const outlineLabel = useCallback(
    (idx: number) => {
      if (usePageImages) return 'Page image';
      if (clientMode === 'pdf-canvas') return `Page ${idx + 1}`;
      if (clientMode === 'image') return 'Image';
      if (clientMode === 'video') return 'Video';
      if (clientMode === 'audio') return 'Audio';
      if (clientMode === 'text') return 'Text file';
      if (clientMode === 'unsupported-binary') return 'File preview';
      if (clientMode === 'no-file-url') return realContentBlocks.length > 0 ? `Preview Section ${idx + 1}` : 'Document Overview';
      return realContentBlocks.length > 0 ? `Preview Section ${idx + 1}` : 'Document Overview';
    },
    [clientMode, realContentBlocks.length, usePageImages],
  );

  const ext = fileExtension(doc.name);

  return (
    <div className="fixed inset-0 z-[1000] flex min-h-0 flex-col bg-[#1a2340]">
      {/* Top bar: 3-column grid — title | page/zoom | actions (no overlap) */}
      <div className="grid h-[52px] flex-shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-white/10 bg-[#1a2340] px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close viewer"
          >
            <i className="ri-close-line text-base" />
          </button>
          <div className="hidden h-5 w-px flex-shrink-0 bg-white/20 sm:block" />
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: `${TEAL}30` }}
            >
              <i className={`${fileIconClass} text-sm`} style={{ color: TEAL }} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{doc.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs text-white/50">{doc.category}</span>
                <span className="text-xs text-white/30">·</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs font-medium"
                  style={{ background: `${TEAL}30`, color: TEAL }}
                >
                  {displayVersion.versionName}
                </span>
                {displayVersion.isCurrent && (
                  <span className="rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs font-bold text-green-400">
                    LATEST
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-1.5 py-1 ring-1 ring-white/10 sm:gap-2 sm:px-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 0}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous page"
            >
              <i className="ri-arrow-left-s-line text-sm" />
            </button>
            <span className="select-none whitespace-nowrap text-xs text-white/70 tabular-nums">
              Page <span className="font-semibold text-white">{currentPage + 1}</span> / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={currentPage === totalPages - 1}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next page"
            >
              <i className="ri-arrow-right-s-line text-sm" />
            </button>
          </div>
          <div className="hidden h-5 w-px shrink-0 bg-white/20 sm:block" aria-hidden />
          <div className="flex items-center gap-1 rounded-lg bg-white/5 px-1.5 py-1 ring-1 ring-white/10">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={clientMode === 'video' || clientMode === 'audio'}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom out"
            >
              <i className="ri-subtract-line text-xs" />
            </button>
            <span className="w-9 select-none text-center text-xs text-white/70 tabular-nums">{zoom}%</span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={clientMode === 'video' || clientMode === 'audio'}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Zoom in"
            >
              <i className="ri-add-line text-xs" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
          {onOpenVersionHistory && (
            <button
              type="button"
              onClick={onOpenVersionHistory}
              className="hidden cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white whitespace-nowrap transition-colors hover:bg-white/20 sm:flex"
            >
              <i className="ri-history-line text-xs" />
              Version History
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadBusy || !fileDownloadUrl}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white whitespace-nowrap transition-colors disabled:opacity-60 sm:px-3"
            style={{ background: TEAL }}
          >
            <i className={downloadBusy ? 'ri-loader-4-line animate-spin text-xs' : 'ri-download-2-line text-xs'} />
            {downloadBusy ? 'Downloading…' : 'Download'}
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors ${
              sidebarOpen ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
            }`}
            title="Toggle outline panel"
            aria-expanded={sidebarOpen}
            aria-label="Toggle outline"
          >
            <i className="ri-layout-right-2-line text-sm" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={`flex min-h-0 flex-1 overflow-auto bg-[#252d45] p-4 sm:p-6 md:p-8 ${
            centerCanvasLayout ? 'items-center justify-center' : 'items-start justify-center'
          }`}
        >
          {usePageImages ? (
            <div className="flex w-full max-w-[100%] flex-col items-center justify-center gap-4 py-4">
              <div
                className="flex max-w-full flex-col items-center"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                }}
              >
                {pageImageLoading && (
                  <p className="text-white/70 text-sm">
                    <i className="ri-loader-4-line animate-spin mr-2 inline-block" aria-hidden />
                    Loading page…
                  </p>
                )}
                {pageImageError && !pageImageLoading && (
                  <p className="text-red-300 text-sm">Could not load this page.</p>
                )}
                {pageImageSrc && !pageImageError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pageImageSrc}
                    alt={`${doc.name} — page ${currentPage + 1}`}
                    className="h-auto max-h-[calc(100vh-220px)] w-auto max-w-[min(100%,56rem)] rounded-lg bg-white shadow-2xl"
                  />
                )}
              </div>
            </div>
          ) : clientMode === 'pdf-canvas' ? (
            <div className="flex w-full max-w-[100%] flex-col items-center justify-center gap-4 py-4">
              {pdfLoading && (
                <p className="text-white/70 text-sm">
                  <i className="ri-loader-4-line animate-spin mr-2 inline-block" aria-hidden />
                  Loading PDF…
                </p>
              )}
              {pdfError && !pdfLoading && (
                <p className="max-w-md text-center text-red-300 text-sm">
                  Could not load this PDF in the browser. Try downloading the file, or wait if the server is still
                  generating page previews.
                </p>
              )}
              {!pdfError && !pdfLoading && pdfNumPages > 0 && (
                <div className="max-w-full overflow-auto rounded-lg bg-neutral-900/40 p-2 shadow-2xl ring-1 ring-white/10">
                  <canvas ref={pdfCanvasRef} className="block rounded bg-white" />
                </div>
              )}
            </div>
          ) : clientMode === 'image' ? (
            <div className="flex w-full flex-col items-center justify-center gap-4 py-4">
              {mediaLoading && (
                <p className="text-white/70 text-sm">
                  <i className="ri-loader-4-line animate-spin mr-2 inline-block" aria-hidden />
                  Loading image…
                </p>
              )}
              {mediaError && !mediaLoading && <p className="text-red-300 text-sm">Could not load this image.</p>}
              {mediaBlobUrl && !mediaError && (
                <div
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaBlobUrl}
                    alt={doc.name}
                    className="h-auto max-h-[calc(100vh-220px)] w-auto max-w-[min(100%,56rem)] rounded-lg bg-white object-contain shadow-2xl"
                  />
                </div>
              )}
            </div>
          ) : clientMode === 'video' ? (
            <div className="flex w-full flex-col items-center justify-center gap-4 py-4">
              {mediaLoading && (
                <p className="text-white/70 text-sm">
                  <i className="ri-loader-4-line animate-spin mr-2 inline-block" aria-hidden />
                  Loading video…
                </p>
              )}
              {mediaError && !mediaLoading && <p className="text-red-300 text-sm">Could not load this video.</p>}
              {mediaBlobUrl && !mediaError && (
                <video
                  src={mediaBlobUrl}
                  controls
                  playsInline
                  className="max-h-[calc(100vh-220px)] w-full max-w-[min(100%,56rem)] rounded-lg bg-black shadow-2xl"
                />
              )}
            </div>
          ) : clientMode === 'audio' ? (
            <div className="flex w-full flex-col items-center justify-center gap-6 py-8">
              {mediaLoading && (
                <p className="text-white/70 text-sm">
                  <i className="ri-loader-4-line animate-spin mr-2 inline-block" aria-hidden />
                  Loading audio…
                </p>
              )}
              {mediaError && !mediaLoading && <p className="text-red-300 text-sm">Could not load this audio file.</p>}
              {mediaBlobUrl && !mediaError && (
                <audio src={mediaBlobUrl} controls className="w-full max-w-md" />
              )}
            </div>
          ) : clientMode === 'text' ? (
            <div className="flex h-full w-full max-w-4xl flex-col gap-3">
              {textLoading && (
                <p className="text-white/70 text-sm">
                  <i className="ri-loader-4-line animate-spin mr-2 inline-block" aria-hidden />
                  Loading text…
                </p>
              )}
              {textError && !textLoading && <p className="text-red-300 text-sm">Could not load this file as text.</p>}
              {!textLoading && !textError && (
                <>
                  {textTruncated && (
                    <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-100 ring-1 ring-amber-500/30">
                      Preview shows the first ~{(MAX_TEXT_PREVIEW_BYTES / 1024).toFixed(0)} KB only. Download the file to
                      see everything.
                    </p>
                  )}
                  <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#1e2740] p-4 text-xs leading-relaxed text-white/90 whitespace-pre-wrap break-words font-mono">
                    {textBody || '(empty file)'}
                  </pre>
                </>
              )}
            </div>
          ) : clientMode === 'unsupported-binary' ? (
            <div className="flex w-full max-w-lg flex-col items-center gap-4 rounded-xl border border-white/10 bg-[#1e2740] p-8 text-center shadow-xl">
              <i className="ri-file-forbid-line text-4xl text-white/40" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-white">No in-browser preview for this file type</p>
                <p className="mt-2 text-xs text-white/50">
                  {ext ? (
                    <>
                      <span className="font-mono text-white/70">.{ext}</span> files need a desktop app to view
                      faithfully. Download the original, or rely on extracted text when processing finishes.
                    </>
                  ) : (
                    <>Download the original to open it in the right application.</>
                  )}
                </p>
              </div>
              {doc.contentSnippet && (
                <div className="w-full rounded-lg border border-white/10 bg-black/20 p-4 text-left">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">Extracted text</p>
                  <p className="max-h-40 overflow-y-auto text-xs text-white/70 whitespace-pre-wrap">{doc.contentSnippet}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Text / metadata preview (no stored page images, no client file URL mode) */}
              <div
                style={{
                  width: `${scaledW}px`,
                  height: `${scaledH}px`,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <div
                  className="overflow-hidden rounded-lg bg-white"
                  style={{
                    width: `${PAGE_W}px`,
                    minHeight: `${PAGE_H}px`,
                    transformOrigin: 'top left',
                    transform: `scale(${zoom / 100})`,
                  }}
                >
                  <div className="border-b border-gray-100 px-12 pt-10 pb-6" style={{ background: `${TEAL}08` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-xl leading-tight font-bold text-[#1a2340]">{doc.name}</h1>
                        <p className="mt-1 text-sm text-gray-500">
                          {doc.category} · {displayVersion.versionName}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-400">Uploaded by</p>
                        <p className="text-sm font-semibold text-[#1a2340]">{displayVersion.uploadedBy}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{displayVersion.date}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {Object.entries(doc.metadata)
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1"
                          >
                            <span className="text-[10px] font-medium text-gray-400">{k}:</span>
                            <span className="text-[10px] font-semibold text-[#1a2340]">{v}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="px-12 py-8">
                    {clientMode === 'no-file-url' && (
                      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-900">
                        <p className="font-semibold">Limited preview</p>
                        <p className="mt-1 text-amber-800/90">
                          This screen does not have a secure file link. Connect the document API (file URL) for PDF,
                          image, video, and text previews.
                        </p>
                      </div>
                    )}
                    <div className="mb-6">
                      <h2 className="mb-1 border-b border-gray-100 pb-2 text-base font-bold text-[#1a2340]">
                        {realContentBlocks.length > 0 ? `Preview Section ${currentPage + 1}` : 'Document Overview'}
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {textPageContent[currentPage].split('\n\n').map((para, i) => (
                        <p key={i} className="text-sm leading-relaxed text-gray-700">
                          {para}
                        </p>
                      ))}
                    </div>
                    <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase">Document Details</h3>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="text-gray-500">Visibility</div>
                        <div className="font-medium text-[#1a2340]">{doc.visibility}</div>
                        <div className="text-gray-500">Upload Date</div>
                        <div className="font-medium text-[#1a2340]">{doc.uploadDate}</div>
                        <div className="text-gray-500">Last Updated</div>
                        <div className="font-medium text-[#1a2340]">{doc.lastUpdated}</div>
                        <div className="text-gray-500">File Type</div>
                        <div className="font-medium text-[#1a2340]">{doc.fileType}</div>
                        <div className="text-gray-500">File Size</div>
                        <div className="font-medium text-[#1a2340]">{doc.fileSize}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 px-12 py-4">
                    <span className="text-[10px] text-gray-300">{doc.name}</span>
                    <span className="text-[10px] text-gray-300">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right sidebar – outline */}
        {sidebarOpen && (
          <div className="flex w-[15rem] shrink-0 flex-col border-l border-white/10 bg-[#1e2740] sm:w-[17rem] lg:max-w-[20vw]">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-xs font-semibold tracking-wider text-white/50 uppercase">Document Outline</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {Array.from({ length: totalPages }, (_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentPage(idx)}
                  className={`w-full cursor-pointer border-l-2 px-4 py-2.5 text-left text-xs transition-all ${
                    currentPage === idx
                      ? 'font-semibold text-white'
                      : 'border-transparent text-white/40 hover:text-white/70'
                  }`}
                  style={currentPage === idx ? { borderColor: TEAL, background: `${TEAL}15` } : {}}
                >
                  <span
                    className="mb-0.5 block text-[10px]"
                    style={{ color: currentPage === idx ? TEAL : 'rgba(255,255,255,0.25)' }}
                  >
                    Page {idx + 1}
                  </span>
                  {outlineLabel(idx)}
                </button>
              ))}
            </div>

            {/* Version info in sidebar */}
            <div className="border-t border-white/10 px-4 py-3">
              <p className="mb-2 text-[10px] tracking-wider text-white/30 uppercase">Version Info</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Version</span>
                  <span className="text-[10px] font-medium text-white/70">{displayVersion.versionName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Date</span>
                  <span className="text-[10px] text-white/70">{displayVersion.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">By</span>
                  <span className="max-w-[80px] truncate text-[10px] text-white/70">{displayVersion.uploadedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Size</span>
                  <span className="text-[10px] text-white/70">{doc.fileSize}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom thumbnail strip — centered like a filmstrip */}
      <div className="flex max-w-full shrink-0 justify-center gap-2 overflow-x-auto overscroll-x-contain border-t border-white/10 bg-[#1a2340] px-4 py-3 sm:px-6">
        {Array.from({ length: totalPages }, (_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentPage(idx)}
            className="group flex flex-shrink-0 cursor-pointer flex-col items-center gap-1"
          >
            <div
              className={`flex h-20 w-14 flex-col items-center justify-center rounded-md border-2 transition-all ${
                currentPage === idx ? 'border-[#0097B2]' : 'border-white/10 hover:border-white/30'
              }`}
              style={{ background: currentPage === idx ? `${TEAL}20` : 'rgba(255,255,255,0.05)' }}
            >
              {usePageImages || clientMode === 'pdf-canvas' ? (
                <span className="text-lg font-semibold text-white/40">{idx + 1}</span>
              ) : (
                <div className="w-full space-y-1 px-2">
                  {[100, 80, 90, 70, 85].map((w, i) => (
                    <div key={i} className="h-0.5 rounded-full bg-white/20" style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}
            </div>
            <span className={`text-[9px] ${currentPage === idx ? 'text-white' : 'text-white/30'}`}>{idx + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
