'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentRecord } from '../../../../mocks/documents';
import DocumentViewerModal from '@/app/components/feature/DocumentViewerModal';

const TEAL = '#0097B2';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function ArchivedDocumentsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3051';
  const router = useRouter();
  const [archivedDocs, setArchivedDocs] = useState<DocumentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewerDoc, setViewerDoc] = useState<DocumentRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DocumentRecord[] | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadArchived = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/protected/org-admin/documents?archived=1`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`Failed to load archived documents (${response.status})`);
      const docs = (await response.json()) as DocumentRecord[];
      setArchivedDocs(docs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load archived documents');
      setArchivedDocs([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadArchived(); }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const filtered = archivedDocs.filter((d) => {
    const q = search.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
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
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((d) => d.id)));
  };

  const handleRestore = (ids: string[]) => {
    void (async () => {
      try {
        await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE_URL}/protected/org-admin/documents/${encodeURIComponent(id)}/archive`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ archived: false }),
            }),
          ),
        );
        const next = archivedDocs.filter((d) => !ids.includes(d.id));
        setArchivedDocs(next);
        setSelected(new Set());
        showToast(`${ids.length} document${ids.length > 1 ? 's' : ''} restored successfully`);
      } catch {
        showToast('Failed to restore selected documents', 'error');
      }
    })();
  };

  const handlePermanentDelete = (docs: DocumentRecord[]) => {
    void (async () => {
      try {
        const ids = docs.map((d) => d.id);
        await Promise.all(
          ids.map((id) =>
            fetch(`${API_BASE_URL}/protected/org-admin/documents/${encodeURIComponent(id)}`, {
              method: 'DELETE',
              credentials: 'include',
            }),
          ),
        );
        const next = archivedDocs.filter((d) => !ids.includes(d.id));
        setArchivedDocs(next);
        setSelected(new Set());
        setConfirmDelete(null);
        showToast(`${docs.length} document${docs.length > 1 ? 's' : ''} permanently deleted`, 'error');
      } catch {
        showToast('Failed to delete selected documents', 'error');
      }
    })();
  };

  if (viewerDoc) {
    return <DocumentViewerModal doc={viewerDoc} onClose={() => setViewerDoc(null)} />;
  }

  return (
    <div className="p-6 min-h-full font-inter">
      {/* Toast */}
      <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 ${
              t.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            <i className={t.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-alert-line'} />
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/org-admin/documents')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1a2340] transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-base" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#1a2340]">Archived Documents</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                {archivedDocs.length} archived
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">Documents moved to archive — restore or permanently delete</p>
          </div>
        </div>
      </div>
      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 mb-4">
          Loading archived documents...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-4">
          {error}
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-5">
        <i className="ri-archive-line text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Archived documents are hidden from the main document list</p>
          <p className="text-xs text-amber-600 mt-0.5">You can restore them at any time or permanently delete them. Archived documents retain all their versions and metadata.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
          <i className="ri-search-line text-gray-400 text-sm" />
          <input
            placeholder="Search archived documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm text-[#1a2340] bg-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500 cursor-pointer">
              <i className="ri-close-line text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-white"
          style={{ background: '#92400e' }}
        >
          <i className="ri-checkbox-multiple-line" />
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={() => handleRestore(Array.from(selected))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-inbox-unarchive-line" /> Restore Selected
          </button>
          <button
            onClick={() => setConfirmDelete(archivedDocs.filter((d) => selected.has(d.id)))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-sm font-medium transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-delete-bin-line" /> Delete Permanently
          </button>
          <button onClick={() => setSelected(new Set())} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 cursor-pointer">
            <i className="ri-close-line text-sm" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <i className="ri-archive-line text-3xl text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-500 mb-1">No archived documents</p>
            <p className="text-sm text-gray-400">
              {search ? 'No documents match your search' : 'Documents you archive will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded cursor-pointer accent-amber-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Document Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Uploaded By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Upload Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-amber-50/30 transition-all cursor-pointer group"
                    onClick={() => setViewerDoc(doc)}
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="w-4 h-4 rounded cursor-pointer accent-amber-600"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50">
                          <i className="ri-file-pdf-2-line text-sm text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#1a2340] truncate max-w-[220px]">{doc.name}</div>
                          <div className="text-xs text-gray-400">{doc.fileSize} · {doc.fileType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-amber-500">
                          {doc.uploadedBy.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap">{doc.uploadedBy}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{doc.uploadDate}</td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore([doc.id])}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                          style={{ color: TEAL, background: `${TEAL}12` }}
                        >
                          <i className="ri-inbox-unarchive-line text-xs" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete([doc])}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-delete-bin-line text-xs" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} archived document{filtered.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-400">Click a row to view document</p>
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="h-1.5 w-full bg-red-500" />
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                <i className="ri-delete-bin-2-line text-3xl text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-[#1a2340] mb-2">Permanently Delete?</h3>
                <p className="text-sm text-gray-500">
                  This will permanently delete <strong>{confirmDelete.length} document{confirmDelete.length > 1 ? 's' : ''}</strong>. This cannot be undone.
                </p>
              </div>
              <div className="w-full flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                <i className="ri-alert-line text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">All versions and metadata will be permanently removed with no recovery option.</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePermanentDelete(confirmDelete)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                >
                  <i className="ri-delete-bin-line" /> Delete Forever
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
