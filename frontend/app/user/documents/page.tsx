"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MOCK_DOCUMENTS, MOCK_UPLOADERS, MOCK_CATEGORIES, type DocumentRecord } from '../../../mocks/documents';
import EditMetadataModal from './modals/EditMetadataModal';
import ShareDocumentModal from './modals/ShareDocumentModal';
import VersionHistoryModal from './modals/VersionHistoryModal';
import DeleteDocumentModal from './modals/DeleteDocumentModal';
import DocumentViewerModal from '@/app/components/feature/DocumentViewerModal';

const TEAL = '#0097B2';
const ARCHIVE_STORAGE_KEY = 'user_archived_doc_ids';

type ModalType = 'edit' | 'share' | 'version' | 'delete' | null;

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function AllDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(MOCK_DOCUMENTS);
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [filterUploader, setFilterUploader] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // Load archived IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
      if (stored) setArchivedIds(new Set(JSON.parse(stored)));
    } catch { }
  }, []);

  // Persist archived IDs to localStorage
  const persistArchivedIds = (next: Set<string>) => {
    setArchivedIds(next);
    try {
      localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch { }
  };

  const activeDocuments = documents.filter((d) => !archivedIds.has(d.id));

  const filtered = activeDocuments.filter((d) => {
    const q = search.toLowerCase();
    if (q && !d.name.toLowerCase().includes(q)) return false;
    if (filterCategory && d.category !== filterCategory) return false;
    if (filterVisibility && d.visibility !== filterVisibility) return false;
    if (filterUploader && d.uploadedBy !== filterUploader) return false;
    if (filterDateFrom && d.uploadDate < filterDateFrom) return false;
    if (filterDateTo && d.uploadDate > filterDateTo) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  };

  const openModal = (type: ModalType, doc: DocumentRecord) => {
    setActiveDoc(doc);
    setModal(type);
    setActiveMenu(null);
  };

  const openViewer = (doc: DocumentRecord) => {
    setViewerDoc(doc);
    setActiveMenu(null);
  };

  const handleArchiveSingle = (doc: DocumentRecord) => {
    persistArchivedIds(new Set([...archivedIds, doc.id]));
    setSelected((prev) => { const next = new Set(prev); next.delete(doc.id); return next; });
    setActiveMenu(null);
    showToast(`"${doc.name}" moved to archive`);
  };

  const handleBulkArchive = () => {
    const count = selected.size;
    persistArchivedIds(new Set([...archivedIds, ...selected]));
    setSelected(new Set());
    showToast(`${count} document${count > 1 ? 's' : ''} moved to archive`);
  };

  const handleMetaSave = (doc: DocumentRecord, metadata: Record<string, string>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, metadata, lastUpdated: new Date().toISOString().split('T')[0] } : d))
    );
    setModal(null);
    showToast('Metadata updated successfully');
  };

  const handleDelete = (ids: string[]) => {
    setDocuments((prev) => prev.filter((d) => !ids.includes(d.id)));
    const nextArchived = new Set(archivedIds);
    ids.forEach((id) => nextArchived.delete(id));
    persistArchivedIds(nextArchived);
    setSelected((prev) => { const next = new Set(prev); ids.forEach((id) => next.delete(id)); return next; });
    setModal(null);
    showToast(`${ids.length} document${ids.length > 1 ? 's' : ''} deleted`);
  };

  const handleBulkDownload = () => showToast(`Downloading ${selected.size} files as ZIP...`);

  const handleDownload = (doc: DocumentRecord) => {
    showToast(`Downloading "${doc.name}"...`);
    setActiveMenu(null);
  };

  const selectedDocs = documents.filter((d) => selected.has(d.id));

  const clearFilters = () => {
    setFilterCategory(''); setFilterVisibility(''); setFilterUploader('');
    setFilterDateFrom(''); setFilterDateTo(''); setSearch('');
  };

  const hasFilters = filterCategory || filterVisibility || filterUploader || filterDateFrom || filterDateTo || search;

  const getPreviewTone = (fileType: string) => {
    if (fileType === 'PDF') return { accent: '#ef4444', tint: 'from-red-50 to-rose-50', badge: 'bg-red-100 text-red-600' };
    if (fileType === 'XLSX') return { accent: '#16a34a', tint: 'from-emerald-50 to-lime-50', badge: 'bg-emerald-100 text-emerald-700' };
    return { accent: TEAL, tint: 'from-slate-50 to-white', badge: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="px-4 py-5 sm:p-6 min-h-full font-inter" onClick={() => setActiveMenu(null)}>
      {/* Toast */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-5 sm:right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 ${t.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            <i className={t.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-alert-line'} />
            {t.message}
          </div>
        ))}
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#1a2340]">All Documents</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeDocuments.length} total documents</p>
        </div>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
              <i className="ri-filter-off-line" /> Clear Filters
            </button>
          )}
          <Link
            href="/user/documents/archived"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap hover:bg-amber-50"
            style={{ borderColor: '#f59e0b', color: '#d97706' }}
          >
            <i className="ri-archive-line" />
            Archived
            {archivedIds.size > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {archivedIds.size}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 xl:col-span-2">
            <i className="ri-search-line text-gray-400 text-sm" />
            <input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 outline-none text-sm text-[#1a2340] bg-transparent" />
            {search && <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 cursor-pointer"><i className="ri-close-line text-sm" /></button>}
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer w-full">
            <option value="">All Categories</option>
            {MOCK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterVisibility} onChange={(e) => setFilterVisibility(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer w-full">
            <option value="">All Visibility</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
          </select>
          <select value={filterUploader} onChange={(e) => setFilterUploader(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer w-full">
            <option value="">All Uploaders</option>
            {MOCK_UPLOADERS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-1.5 xl:col-span-2">
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer" />
            <span className="text-gray-400 text-xs justify-self-center">to</span>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl mb-4 text-white" style={{ background: TEAL }}>
          <i className="ri-checkbox-multiple-line" />
          <span className="text-sm font-semibold">{selected.size} document{selected.size > 1 ? 's' : ''} selected</span>
          <div className="hidden sm:flex flex-1" />
          <button onClick={() => { setModal('share'); setActiveDoc(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-share-line" /> Share
          </button>
          <button onClick={handleBulkDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-download-2-line" /> Download ZIP
          </button>
          <button onClick={handleBulkArchive} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-all cursor-pointer whitespace-nowrap hover:opacity-90" style={{ background: '#d97706' }}>
            <i className="ri-archive-line" /> Archive
          </button>
          <button onClick={() => { setModal('delete'); setActiveDoc(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium transition-all cursor-pointer whitespace-nowrap">
            <i className="ri-delete-bin-line" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 cursor-pointer">
            <i className="ri-close-line text-sm" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-10 px-4 py-3 text-left">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-4 h-4 rounded cursor-pointer accent-[#0097B2]" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Document Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Uploaded By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Visibility</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Upload Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Last Updated</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <i className="ri-file-search-line text-3xl block mb-2" />
                    <p className="text-sm">No documents match your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => openViewer(doc)}
                    className="border-b border-gray-50 last:border-0 hover:bg-[#0097B2]/[0.03] transition-all cursor-pointer group/doc relative"
                  >
                    {/* Checkbox cell — isolated from row click */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(doc.id)} onChange={() => toggleSelect(doc.id)} className="w-4 h-4 rounded cursor-pointer accent-[#0097B2]" />
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="relative inline-flex max-w-full group/name">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                            <i className={`text-sm ${doc.fileType === 'XLSX' ? 'ri-file-excel-2-line' : 'ri-file-pdf-2-line'}`} style={{ color: TEAL }} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#1a2340] truncate max-w-[220px] group-hover/doc:text-[#0097B2] transition-colors">{doc.name}</div>
                            <div className="text-xs text-gray-400">{doc.fileSize} · {doc.fileType}</div>
                          </div>
                        </div>
                        {/* Hover preview card */}
                        <div className="pointer-events-none absolute left-0 top-full z-30 mt-3 w-44 origin-top-left opacity-0 invisible translate-y-1 transition-all duration-150 group-hover/name:opacity-100 group-hover/name:visible group-hover/name:translate-y-0">
                          <div className={`aspect-square w-full overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br ${getPreviewTone(doc.fileType).tint} shadow-xl`}>
                            <div className="flex h-full flex-col p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm" style={{ background: getPreviewTone(doc.fileType).accent }}>
                                  <i className={doc.fileType === 'XLSX' ? 'ri-file-excel-2-line text-base' : 'ri-file-pdf-2-line text-base'} />
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPreviewTone(doc.fileType).badge}`}>{doc.fileType}</span>
                              </div>
                              <div className="mt-3 flex-1 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
                                {doc.fileType === 'XLSX' ? (
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {Array.from({ length: 9 }).map((_, index) => (
                                      <div key={index} className={`aspect-square rounded-md ${index % 3 === 0 ? 'bg-emerald-100' : index % 2 === 0 ? 'bg-emerald-50' : 'bg-gray-100'}`} />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="h-2.5 w-5/6 rounded-full bg-gray-200" />
                                    <div className="h-2.5 w-4/6 rounded-full bg-gray-100" />
                                    <div className="h-2.5 w-full rounded-full bg-gray-100" />
                                    <div className="mt-3 space-y-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5">
                                      <div className="h-2 w-1/2 rounded-full bg-gray-200" />
                                      <div className="h-2 w-5/6 rounded-full bg-gray-100" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3 space-y-1">
                                <p className="truncate text-[11px] font-semibold text-[#1a2340]">{doc.name}</p>
                                <p className="max-h-8 overflow-hidden text-[10px] leading-4 text-gray-500">
                                  {Object.entries(doc.metadata).slice(0, 2).map(([key, value]) => `${key}: ${value}`).join(' · ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">{doc.category}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: TEAL }}>
                          {doc.uploadedBy.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">{doc.uploadedBy}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${doc.visibility === 'Public' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        <i className={`mr-1 ${doc.visibility === 'Public' ? 'ri-global-line' : 'ri-lock-line'}`} />
                        {doc.visibility}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{doc.uploadDate}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{doc.lastUpdated}</td>

                    {/* Actions cell — isolated from row click */}
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}
                          title="More actions" aria-label="More actions"
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeMenu === doc.id ? 'bg-[#0097B2]/10 text-[#0097B2]' : 'text-gray-400 hover:bg-gray-100 hover:text-[#1a2340]'}`}
                        >
                          <i className="ri-more-2-fill text-base" />
                        </button>
                        {activeMenu === doc.id && (
                          <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-2xl overflow-hidden z-40 py-1.5">
                            <button onClick={() => openViewer(doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-[#0097B2]/10 transition-colors flex-shrink-0">
                                <i className="ri-eye-line text-xs text-gray-500 group-hover/item:text-[#0097B2]" />
                              </span>
                              <span className="font-medium">View Document</span>
                            </button>
                            <button onClick={() => openModal('edit', doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-[#0097B2]/10 transition-colors flex-shrink-0">
                                <i className="ri-edit-2-line text-xs text-gray-500 group-hover/item:text-[#0097B2]" />
                              </span>
                              <span className="font-medium">Edit Metadata</span>
                            </button>
                            <button onClick={() => openModal('share', doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-[#0097B2]/10 transition-colors flex-shrink-0">
                                <i className="ri-share-forward-line text-xs text-gray-500 group-hover/item:text-[#0097B2]" />
                              </span>
                              <span className="font-medium">Share</span>
                            </button>
                            <button onClick={() => handleDownload(doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-[#0097B2]/10 transition-colors flex-shrink-0">
                                <i className="ri-download-2-line text-xs text-gray-500 group-hover/item:text-[#0097B2]" />
                              </span>
                              <span className="font-medium">Download PDF</span>
                            </button>
                            <button onClick={() => openModal('version', doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-[#0097B2]/10 transition-colors flex-shrink-0">
                                <i className="ri-history-line text-xs text-gray-500 group-hover/item:text-[#0097B2]" />
                              </span>
                              <span className="font-medium">Version History</span>
                            </button>
                            <button onClick={() => handleArchiveSingle(doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 group-hover/item:bg-amber-100 transition-colors flex-shrink-0">
                                <i className="ri-archive-line text-xs text-amber-500" />
                              </span>
                              <span className="font-medium">Archive</span>
                            </button>
                            <div className="mx-4 my-1 border-t border-gray-100" />
                            <button onClick={() => openModal('delete', doc)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 group-hover/item:bg-red-100 transition-colors flex-shrink-0">
                                <i className="ri-delete-bin-line text-xs text-red-400" />
                              </span>
                              <span className="font-medium">Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {activeDocuments.length} documents</p>
            <p className="text-xs text-gray-400">{selected.size > 0 ? `${selected.size} selected` : 'Click a row to view · checkbox to select'}</p>
          </div>
        )}
      </div>

      {/* Document Viewer — full screen overlay */}
      {viewerDoc && (
        <DocumentViewerModal
          doc={viewerDoc}
          onClose={() => setViewerDoc(null)}
          onOpenVersionHistory={() => {
            setViewerDoc(null);
            openModal('version', viewerDoc);
          }}
        />
      )}

      {/* Other Modals */}
      {modal === 'edit' && activeDoc && <EditMetadataModal doc={activeDoc} onClose={() => setModal(null)} onSave={handleMetaSave} />}
      {modal === 'share' && <ShareDocumentModal docs={activeDoc ? [activeDoc] : selectedDocs} onClose={() => setModal(null)} />}
      {modal === 'version' && activeDoc && <VersionHistoryModal doc={activeDoc} onClose={() => setModal(null)} />}
      {modal === 'delete' && <DeleteDocumentModal docs={activeDoc ? [activeDoc] : selectedDocs} onClose={() => setModal(null)} onConfirm={handleDelete} />}
    </div>
  );
}