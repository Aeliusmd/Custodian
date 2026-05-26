"use client";

import { useEffect, useRef, useState, useCallback, type KeyboardEvent, type ReactElement } from 'react';

const TEAL = '#0097B2';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

interface SearchResult {
  id: string;
  documentName: string;
  snippet: string;
  category: string;
  uploadDate: string;
  uploadedBy: string;
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
        )
      )}
    </>
  );
}

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setSubmitted(q);
    setIsLoading(true);
    setResults([]);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/protected/user/search?q=${encodeURIComponent(q.trim())}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Search failed (${res.status})`);
      }
      setResults(await res.json() as SearchResult[]);
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

  return (
    <div className="px-4 py-5 sm:p-6 min-h-full font-inter">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[#1a2340]">Global Search</h1>
        <p className="text-sm text-gray-400 mt-0.5">Search documents by name and category</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border-2 rounded-2xl px-4 sm:px-5 py-4 transition-all focus-within:border-[#0097B2] border-gray-200">
          <i className="ri-search-2-line text-xl text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents by name or category..."
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

      {error && (
        <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Loading State */}
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

      {/* No Results */}
      {!isLoading && submitted && results.length === 0 && !error && (
        <div className="max-w-3xl mx-auto text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-file-search-line text-2xl text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-[#1a2340] mb-2">No results found</h3>
          <p className="text-sm text-gray-400">No documents found for &ldquo;<strong>{submitted}</strong>&rdquo;. Try a different keyword.</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-gray-400 mb-4">
            Found <span className="font-semibold text-[#1a2340]">{results.length}</span> result{results.length !== 1 ? 's' : ''} for <span className="font-semibold text-[#1a2340]">&ldquo;{submitted}&rdquo;</span>
          </p>
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => setSelectedDoc(result)}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-[#0097B2]/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                    <i className="ri-file-pdf-2-line text-base" style={{ color: TEAL }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="text-sm font-bold text-[#1a2340] group-hover:text-[#0097B2] transition-colors">
                        {highlightText(result.documentName, submitted)}
                      </h3>
                      <i className="ri-external-link-line text-gray-300 group-hover:text-[#0097B2] flex-shrink-0 transition-colors" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[result.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {highlightText(result.category, submitted)}
                      </span>
                      <span className="text-xs text-gray-400">
                        <i className="ri-calendar-line mr-1" />{result.uploadDate}
                      </span>
                      <span className="text-xs text-gray-400">
                        <i className="ri-user-line mr-1" />{result.uploadedBy}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{result.snippet}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${TEAL}18` }}>
                  <i className="ri-file-pdf-2-line text-base" style={{ color: TEAL }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#1a2340] truncate max-w-[380px]">{selectedDoc.documentName}</h2>
                  <p className="text-xs text-gray-400">{selectedDoc.category} · {selectedDoc.uploadedBy}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDoc(null)} aria-label="Close preview" title="Close preview" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Document Info</p>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedDoc.snippet}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Matched Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDoc.keywords.map((kw) => (
                    <span key={kw} className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap" type="button">
                <i className="ri-download-2-line" />
                Download
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap" style={{ background: TEAL }} type="button">
                <i className="ri-eye-line" />
                Open Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
