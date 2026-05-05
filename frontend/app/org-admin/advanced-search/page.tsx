"use client";

import { useState, type ReactElement } from 'react';
import { MOCK_DOCUMENTS, MOCK_CATEGORIES, MOCK_UPLOADERS, type DocumentRecord } from '@/mocks/documents';

const TEAL = '#0097B2';

const DYNAMIC_METADATA_FIELDS: Record<string, string[]> = {
  'Financial Reports': ['Author', 'Report Year', 'Department', 'Approval Status'],
  'HR Documents': ['Author', 'Version', 'Department', 'Effective Date'],
  'Legal': ['Author', 'NIC', 'Quarter', 'Audit Firm'],
  'Strategy': ['Author', 'Year', 'Product Team', 'Confidentiality'],
  'Contracts': ['Author', 'Document Type', 'Version', 'Valid From'],
  'IT & Security': ['Author', 'NIC', 'Policy Year', 'Department', 'Review Date'],
  'Governance': ['Author', 'Meeting Date', 'Meeting Type', 'Attendees'],
  'Marketing': ['Author', 'Quarter', 'Budget', 'Campaign Theme'],
};

interface SearchFilters {
  docName: string;
  category: string;
  uploadedBy: string;
  dateFrom: string;
  dateTo: string;
  metadata: Record<string, string>;
}

function highlightText(text: string, keyword: string): ReactElement {
  if (!keyword.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${keyword.replace(/[.*+?^$()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === keyword.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 font-semibold rounded px-0.5">{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

export default function AdvancedSearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    docName: '', category: '', uploadedBy: '', dateFrom: '', dateTo: '', metadata: {},
  });
  const [results, setResults] = useState<DocumentRecord[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [expandedFilters, setExpandedFilters] = useState(true);

  const metaFields = filters.category ? (DYNAMIC_METADATA_FIELDS[filters.category] ?? []) : [];

  const handleSearch = () => {
    const found = MOCK_DOCUMENTS.filter((d) => {
      if (filters.docName && !d.name.toLowerCase().includes(filters.docName.toLowerCase())) return false;
      if (filters.category && d.category !== filters.category) return false;
      if (filters.uploadedBy && d.uploadedBy !== filters.uploadedBy) return false;
      if (filters.dateFrom && d.uploadDate < filters.dateFrom) return false;
      if (filters.dateTo && d.uploadDate > filters.dateTo) return false;
      for (const [key, val] of Object.entries(filters.metadata)) {
        if (val && d.metadata[key] && !d.metadata[key].toLowerCase().includes(val.toLowerCase())) return false;
      }
      return true;
    });
    setResults(found);
    setSearched(true);
    setExpandedFilters(false);
  };

  const handleReset = () => {
    setFilters({ docName: '', category: '', uploadedBy: '', dateFrom: '', dateTo: '', metadata: {} });
    setResults(null);
    setSearched(false);
    setExpandedFilters(true);
  };

  const setMeta = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  };

  const activeFilterCount = [
    filters.docName, filters.category, filters.uploadedBy, filters.dateFrom,
    ...Object.values(filters.metadata).filter(Boolean),
  ].filter(Boolean).length;

  return (
    <div className="px-4 py-5 sm:p-6 min-h-full font-inter" onClick={() => setActiveMenu(null)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#1a2340]">Advanced Search</h1>
          <p className="text-sm text-gray-400 mt-0.5">Search using metadata fields and document attributes</p>
        </div>
        {searched && (
          <button
            onClick={() => setExpandedFilters(!expandedFilters)}
            aria-label={expandedFilters ? 'Hide filters' : 'Show filters'}
            title={expandedFilters ? 'Hide filters' : 'Show filters'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-filter-3-line" />
            {expandedFilters ? 'Hide Filters' : 'Show Filters'}
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: TEAL }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {expandedFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 mb-6">
          <h3 className="text-sm font-bold text-[#1a2340] mb-4 flex items-center gap-2">
            <i className="ri-filter-3-line" style={{ color: TEAL }} />
            Search Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Document Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Document Name</label>
              <input
                value={filters.docName}
                onChange={(e) => setFilters((prev) => ({ ...prev, docName: e.target.value }))}
                placeholder="Enter document name..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value, metadata: {} }))}
                aria-label="Category filter"
                title="Category filter"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-[#0097B2] bg-white cursor-pointer transition-all"
              >
                <option value="">All Categories</option>
                {MOCK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Uploaded By */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Uploaded By</label>
              <select
                value={filters.uploadedBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, uploadedBy: e.target.value }))}
                aria-label="Uploaded by filter"
                title="Uploaded by filter"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 outline-none focus:border-[#0097B2] bg-white cursor-pointer transition-all"
              >
                <option value="">Any Uploader</option>
                {MOCK_UPLOADERS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Date Range</label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:items-center">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-[#0097B2] bg-white cursor-pointer transition-all"
                />
                <span className="text-gray-300 text-xs flex-shrink-0 justify-self-center">to</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 outline-none focus:border-[#0097B2] bg-white cursor-pointer transition-all"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Metadata Fields */}
          {metaFields.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">
                  <i className="ri-price-tag-3-line mr-1" style={{ color: TEAL }} />
                  {filters.category} Metadata Fields
                </span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metaFields.map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{field}</label>
                    <input
                      value={filters.metadata[field] ?? ''}
                      onChange={(e) => setMeta(field, e.target.value)}
                      placeholder={`Filter by ${field}...`}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-6 pt-4 border-t border-gray-100 gap-3">
            <button
              onClick={handleReset}
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line" />
              Reset All
            </button>
            <button
              onClick={handleSearch}
              type="button"
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              style={{ background: TEAL }}
            >
              <i className="ri-search-line" />
              Search Documents
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && results !== null && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              {results.length > 0 ? (
                <><span className="font-bold text-[#1a2340]">{results.length}</span> document{results.length !== 1 ? 's' : ''} found</>
              ) : (
                'No documents matched your filters'
              )}
            </p>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 py-12 sm:py-16 px-4 text-center">
              <i className="ri-file-search-line text-3xl text-gray-200 block mb-3" />
              <h3 className="text-sm font-semibold text-[#1a2340] mb-2">No results found</h3>
              <p className="text-sm text-gray-400 mb-4">Try adjusting your filters or broadening your search criteria</p>
              <button onClick={handleReset} type="button" className="px-4 py-2.5 rounded-xl text-sm font-medium text-white cursor-pointer whitespace-nowrap" style={{ background: TEAL }}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Document Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Category</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Uploaded By</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Visibility</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Upload Date</th>
                      <th className="px-5 py-3.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-50 last:border-0 hover:bg-[#0097B2]/[0.03] transition-all">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                              <i className="ri-file-pdf-2-line text-sm" style={{ color: TEAL }} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[#1a2340] truncate max-w-[220px]">{doc.name}</div>
                              <div className="text-xs text-gray-400">{doc.fileSize} · {doc.fileType}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">{doc.category}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: TEAL }}>
                              {doc.uploadedBy.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                            </div>
                            <span className="text-sm text-gray-600 whitespace-nowrap">{doc.uploadedBy}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${doc.visibility === 'Public' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            <i className={`mr-1 ${doc.visibility === 'Public' ? 'ri-global-line' : 'ri-lock-line'}`} />
                            {doc.visibility}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{doc.uploadDate}</td>
                        <td className="px-5 py-4">
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}
                              aria-label={`Open actions for ${doc.name}`}
                              title={`Open actions for ${doc.name}`}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeMenu === doc.id ? 'bg-[#0097B2]/10 text-[#0097B2]' : 'text-gray-400 hover:bg-gray-100 hover:text-[#1a2340]'}`}
                            >
                              <i className="ri-more-2-fill text-base" />
                            </button>
                            {activeMenu === doc.id && (
                              <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl overflow-hidden z-40 py-1.5">
                                <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer">
                                  <i className="ri-eye-line text-sm" />
                                  <span>View Document</span>
                                </button>
                                <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer">
                                  <i className="ri-download-2-line text-sm" />
                                  <span>Download PDF</span>
                                </button>
                                <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer">
                                  <i className="ri-share-forward-line text-sm" />
                                  <span>Share</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Showing all {results.length} results</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
