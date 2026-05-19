"use client";

import { useEffect, useRef, useState, useCallback, type KeyboardEvent, type ReactElement } from 'react';
import DocumentViewerModal from '@/app/components/feature/DocumentViewerModal';
import { type DocumentRecord } from '@/mocks/documents';
import { downloadOrgAdminDocumentFile } from '@/app/org-admin/documents/lib/documentFileDownload';

const TEAL = '#0097B2';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

interface MetadataMatch {
  fieldName: string;
  value: string;
}

interface ContentMatch {
  pageNumber: number;
  snippet: string;
  snippetHtml?: string;
}

interface SearchResult {
  id: string;
  documentName: string;
  snippet: string;
  snippetHtml?: string;
  category: string;
  uploadDate: string;
  uploadedBy: string;
  matchType: 'metadata' | 'content' | 'both';
  pageNumber?: number;
  contentMatches?: ContentMatch[];
  matchedMetadata?: MetadataMatch[];
  keywords: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Financial Reports': 'bg-emerald-100 text-emerald-700',
  'IT & Security': 'bg-purple-100 text-purple-700',
  'Legal': 'bg-red-100 text-red-700',
  'Legal Contracts': 'bg-red-100 text-red-700',
  'HR Documents': 'bg-blue-100 text-blue-700',
  'Governance': 'bg-amber-100 text-amber-700',
  'Strategy': 'bg-indigo-100 text-indigo-700',
  'Contracts': 'bg-orange-100 text-orange-700',
  'Marketing': 'bg-pink-100 text-pink-700',
  'Compliance': 'bg-violet-100 text-violet-700',
  'Operations': 'bg-teal-100 text-teal-700',
};

function highlightText(text: string, keyword: string): ReactElement {
  if (!keyword.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^$()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 font-semibold rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SnippetBlock({ result, keyword }: { result: SearchResult; keyword: string }) {
  if (result.snippetHtml && (result.matchType === 'content' || result.matchType === 'both')) {
    return (
      <p
        className="text-sm text-gray-600 leading-relaxed line-clamp-3"
        dangerouslySetInnerHTML={{ __html: result.snippetHtml }}
      />
    );
  }
  return (
    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
      {highlightText(result.snippet, keyword)}
    </p>
  );
}

function searchResultToDoc(result: SearchResult): DocumentRecord {
  const metadata = Object.fromEntries(
    (result.matchedMetadata ?? []).map((m) => [m.fieldName, m.value]),
  );
  return {
    id: result.id,
    name: result.documentName,
    category: result.category,
    uploadedBy: result.uploadedBy,
    visibility: 'Private',
    uploadDate: result.uploadDate,
    lastUpdated: result.uploadDate,
    fileSize: '',
    fileType: 'PDF',
    metadata,
    versions: [],
  };
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);
  const [viewerInitialPage, setViewerInitialPage] = useState(1);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showActionMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    window.setTimeout(() => setActionMessage(null), 3000);
  };

  const fetchDocumentById = useCallback(async (id: string): Promise<DocumentRecord | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/protected/org-admin/documents/${encodeURIComponent(id)}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      return (await response.json()) as DocumentRecord;
    } catch {
      return null;
    }
  }, []);

  const openViewer = useCallback(
    async (result: SearchResult, pageNumber?: number) => {
      const page = pageNumber ?? result.pageNumber ?? 1;
      setViewerInitialPage(page);
      const fresh = await fetchDocumentById(result.id);
      if (fresh) {
        setViewerDoc(fresh);
        return;
      }
      setViewerDoc(searchResultToDoc(result));
      showActionMessage('Could not load full document details. Preview may be limited.', 'error');
    },
    [fetchDocumentById],
  );

  const handleDownload = useCallback(
    async (result: SearchResult) => {
      if (downloadBusy) return;
      setDownloadBusy(true);
      const fresh = await fetchDocumentById(result.id);
      const doc = fresh ?? searchResultToDoc(result);
      await downloadOrgAdminDocumentFile(API_BASE_URL, doc, (message, type) =>
        showActionMessage(message, type ?? 'success'),
      );
      setDownloadBusy(false);
    },
    [downloadBusy, fetchDocumentById],
  );

  const previewImageUrlForPage = useCallback(
    (pageOneBased: number) => {
      if (!viewerDoc?.id) return '';
      return `${API_BASE_URL}/protected/org-admin/documents/${encodeURIComponent(viewerDoc.id)}/preview/${pageOneBased}`;
    },
    [viewerDoc],
  );

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSubmitted(q);
    setIsLoading(true);
    setResults([]);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/protected/org-admin/search?q=${encodeURIComponent(q.trim())}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Search failed (${res.status})`);
      }
      const data = (await res.json()) as { results?: SearchResult[] };
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void doSearch(query);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matchTypeLabel = (t: SearchResult['matchType']) => {
    if (t === 'content') return 'In document text';
    if (t === 'both') return 'Metadata & content';
    return 'Metadata';
  };

  return (
    <div className="px-4 py-5 sm:p-6 min-h-full font-inter">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[#1a2340]">Global Search</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Search document text and metadata (e.g. search &ldquo;invoice&rdquo; to find matches inside files)
        </p>
      </div>

      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border-2 rounded-2xl px-4 sm:px-5 py-4 transition-all focus-within:border-[#0097B2] border-gray-200">
          <i className="ri-search-2-line text-xl text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search document content and metadata..."
            className="flex-1 min-w-0 outline-none text-base text-[#1a2340] bg-transparent placeholder-gray-300"
          />
          {query && (
            <button onClick={() => { setQuery(''); setSubmitted(''); setResults([]); }} aria-label="Clear search" title="Clear search" className="text-gray-300 hover:text-gray-500 cursor-pointer">
              <i className="ri-close-line text-lg" />
            </button>
          )}
          <button
            onClick={() => void doSearch(query)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            style={{ background: TEAL }}
          >
            Search
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`max-w-3xl mx-auto mb-4 rounded-lg border px-4 py-3 text-sm ${
            actionMessage.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {isLoading && (
        <div className="max-w-3xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && submitted && results.length === 0 && !error && (
        <div className="max-w-3xl mx-auto text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-file-search-line text-2xl text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-[#1a2340] mb-2">No results found</h3>
          <p className="text-sm text-gray-400">
            No documents matched &ldquo;<strong>{submitted}</strong>&rdquo; in text or metadata. Try another term or upload documents with OCR completed.
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-gray-400 mb-4">
            Found <span className="font-semibold text-[#1a2340]">{results.length}</span> document{results.length !== 1 ? 's' : ''} for &ldquo;<span className="font-semibold text-[#1a2340]">{submitted}</span>&rdquo;
          </p>
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#0097B2]/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                    <i className="ri-file-pdf-2-line text-base" style={{ color: TEAL }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[#1a2340]">
                        {highlightText(result.documentName, submitted)}
                      </h3>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                        {matchTypeLabel(result.matchType)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[result.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {highlightText(result.category, submitted)}
                      </span>
                      {result.uploadDate && (
                        <span className="text-xs text-gray-400">
                          <i className="ri-calendar-line mr-1" />{result.uploadDate}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        <i className="ri-user-line mr-1" />{result.uploadedBy}
                      </span>
                    </div>

                    {(result.matchType === 'content' || result.matchType === 'both') && result.snippet && (
                      <div className="mb-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                        <SnippetBlock result={result} keyword={submitted} />
                        {result.pageNumber && (
                          <p className="text-xs text-[#0097B2] font-medium mt-2 flex items-center gap-1">
                            <i className="ri-book-open-line" />
                            Found on page {result.pageNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {(result.contentMatches?.length ?? 0) > 1 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {result.contentMatches!.map((m) => (
                          <button
                            key={`${result.id}-p${m.pageNumber}`}
                            type="button"
                            onClick={() => void openViewer(result, m.pageNumber)}
                            className="text-xs px-2.5 py-1 rounded-full border border-[#0097B2]/30 text-[#0097B2] hover:bg-[#0097B2]/5 cursor-pointer"
                          >
                            Page {m.pageNumber}
                          </button>
                        ))}
                      </div>
                    )}

                    {(result.matchedMetadata?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {result.matchedMetadata!.map((m) => (
                          <span
                            key={`${m.fieldName}-${m.value}`}
                            className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#0097B2]/10 text-[#0097B2] border border-[#0097B2]/20"
                          >
                            {m.fieldName}: {highlightText(m.value, submitted)}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void openViewer(result)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
                        style={{ background: TEAL }}
                      >
                        <i className="ri-eye-line" />
                        {result.pageNumber ? `Open page ${result.pageNumber}` : 'Open document'}
                      </button>
                      <button
                        type="button"
                        disabled={downloadBusy}
                        onClick={() => void handleDownload(result)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer disabled:opacity-60"
                      >
                        <i className="ri-download-2-line" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewerDoc && (
        <DocumentViewerModal
          key={`${viewerDoc.id}-${viewerInitialPage}`}
          doc={viewerDoc}
          initialPage={viewerInitialPage}
          fileDownloadUrl={`${API_BASE_URL}/protected/org-admin/documents/${encodeURIComponent(viewerDoc.id)}/file`}
          previewImageUrlForPage={previewImageUrlForPage}
          onNotify={(message, type) => showActionMessage(message, type)}
          onClose={() => setViewerDoc(null)}
        />
      )}
    </div>
  );
}
