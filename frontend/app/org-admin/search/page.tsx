"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import { MOCK_SEARCH_RESULTS, SEARCH_SUGGESTIONS, type SearchResult } from '../../../mocks/searchResults';

const TEAL = '#0097B2';

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

const CATEGORY_COLORS: Record<string, string> = {
  'Financial Reports': 'bg-emerald-100 text-emerald-700',
  'IT & Security': 'bg-purple-100 text-purple-700',
  'Legal': 'bg-red-100 text-red-700',
  'HR Documents': 'bg-blue-100 text-blue-700',
  'Governance': 'bg-amber-100 text-amber-700',
  'Strategy': 'bg-indigo-100 text-indigo-700',
  'Contracts': 'bg-orange-100 text-orange-700',
  'Marketing': 'bg-pink-100 text-pink-700',
};

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = SEARCH_SUGGESTIONS.filter((s: string) =>
    query && s.toLowerCase().includes(query.toLowerCase())
  );

  const doSearch = (q: string) => {
    if (!q.trim()) return;
    setSubmitted(q);
    setShowSuggestions(false);
    setIsLoading(true);
    setResults([]);
    setTimeout(() => {
      const found = MOCK_SEARCH_RESULTS.filter(
        (r: SearchResult) =>
          r.documentName.toLowerCase().includes(q.toLowerCase()) ||
          r.snippet.toLowerCase().includes(q.toLowerCase()) ||
          r.category.toLowerCase().includes(q.toLowerCase())
      );
      setResults(found);
      setIsLoading(false);
    }, 800);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch(query);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="px-4 py-5 sm:p-6 min-h-full font-inter" onClick={() => setShowSuggestions(false)}>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-bold text-[#1a2340]">Global Search</h1>
        <p className="text-sm text-gray-400 mt-0.5">Search inside document content with full-text search</p>
      </div>

      {/* Search Bar */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border-2 rounded-2xl px-4 sm:px-5 py-4 transition-all focus-within:border-[#0097B2] border-gray-200">
            <i className="ri-search-2-line text-xl text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search documents by content..."
              className="flex-1 min-w-0 outline-none text-base text-[#1a2340] bg-transparent placeholder-gray-300"
            />
            {query && (
              <button onClick={() => { setQuery(''); setSubmitted(''); setResults([]); }} aria-label="Clear search" title="Clear search" className="text-gray-300 hover:text-gray-500 cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            )}
            <button
              onClick={() => doSearch(query)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              style={{ background: TEAL }}
            >
              Search
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-xl overflow-hidden z-30">
              {filteredSuggestions.map((s: string, i: number) => (
                <button
                  key={i}
                  onClick={() => { setQuery(s); doSearch(s); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer text-left"
                >
                  <i className="ri-search-line text-gray-300 text-sm flex-shrink-0" />
                  {highlightText(s, query)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tags */}
        {!submitted && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-gray-400">Try:</span>
            {SEARCH_SUGGESTIONS.slice(0, 5).map((s: string) => (
              <button
                key={s}
                onClick={() => { setQuery(s); doSearch(s); }}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-[#0097B2] hover:text-[#0097B2] transition-colors cursor-pointer whitespace-nowrap"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

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
                  <div className="h-3 bg-gray-100 rounded w-4/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isLoading && submitted && results.length === 0 && (
        <div className="max-w-3xl mx-auto text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-file-search-line text-2xl text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-[#1a2340] mb-2">No results found</h3>
          <p className="text-sm text-gray-400">No documents contain "<strong>{submitted}</strong>". Try a different keyword.</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && results.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-gray-400 mb-4">
            Found <span className="font-semibold text-[#1a2340]">{results.length}</span> result{results.length !== 1 ? 's' : ''} for <span className="font-semibold text-[#1a2340]">"{submitted}"</span>
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
                        {result.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        <i className="ri-calendar-line mr-1" />{result.uploadDate}
                      </span>
                      <span className="text-xs text-gray-400">
                        <i className="ri-user-line mr-1" />{result.uploadedBy}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                      {highlightText(result.snippet, submitted)}
                    </p>
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Content Preview</p>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {highlightText(selectedDoc.snippet, submitted)}
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Matched Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDoc.keywords.map((kw: string) => (
                    <span key={kw} className="text-xs px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 font-medium">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap" type="button">
                <i className="ri-download-2-line" />
                Download PDF
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
