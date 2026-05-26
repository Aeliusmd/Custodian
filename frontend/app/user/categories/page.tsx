"use client";

import { useState, useEffect, useCallback } from 'react';

const TEAL = '#0097B2';

interface CategoryField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  docCount: number;
  fields: CategoryField[];
}

const fieldTypeIcon: Record<string, string> = {
  Text:     'ri-text',
  Number:   'ri-hashtag',
  Date:     'ri-calendar-line',
  Dropdown: 'ri-arrow-down-s-line',
  NIC:      'ri-id-card-line',
  Author:   'ri-user-line',
  Email:    'ri-mail-line',
  Phone:    'ri-phone-line',
  URL:      'ri-link',
};

export default function CategoriesPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [viewCat, setViewCat] = useState<Category | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/protected/user/categories`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Failed to load categories (${res.status})`);
      }
      setCategories(await res.json() as Category[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => { void load(); }, [load]);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalDocs = categories.reduce((a, c) => a + c.docCount, 0);
  const totalFields = categories.reduce((a, c) => a + c.fields.length, 0);
  const avgFields = categories.length > 0 ? Math.round(totalFields / categories.length) : 0;

  return (
    <div className="px-4 py-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="min-w-0">
          <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Categories</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loading ? 'Loading...' : `${categories.length} categories with custom metadata`}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Categories', value: loading ? '—' : categories.length, icon: 'ri-folder-3-line', color: TEAL },
          { label: 'Total Documents', value: loading ? '—' : totalDocs.toLocaleString(), icon: 'ri-file-text-line', color: '#16a34a' },
          { label: 'Avg. Fields/Category', value: loading ? '—' : avgFields, icon: 'ri-list-settings-line', color: '#d97706' },
          { label: 'Total Metadata Fields', value: loading ? '—' : totalFields, icon: 'ri-input-method-line', color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}18` }}>
              <i className={`${s.icon} text-base`} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1a2340]">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
          />
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm animate-pulse">Loading categories...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  {['Category', 'Description', 'Metadata Fields', 'Documents', 'Created', 'Details'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                          <i className="ri-folder-3-line text-base" style={{ color: TEAL }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#1a2340]">{cat.name}</div>
                          <div className="text-xs text-gray-400">{cat.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-500 max-w-[200px] truncate">{cat.description || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-[#1a2340]">{cat.fields.length}</span>
                        <div className="flex gap-1 flex-wrap">
                          {cat.fields.slice(0, 3).map((f) => (
                            <span key={f.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex items-center gap-0.5 whitespace-nowrap">
                              <i className={`${fieldTypeIcon[f.type] ?? 'ri-text'} text-[10px]`} />
                              {f.name}
                            </span>
                          ))}
                          {cat.fields.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">+{cat.fields.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-[#1a2340]">{cat.docCount.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{cat.createdDate}</td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setViewCat(cat)}
                        title="View details"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#0097B2] hover:bg-[#0097B2]/10 transition-all"
                      >
                        <i className="ri-eye-line text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">No categories found.</div>
        )}
      </div>

      {/* View Modal */}
      {viewCat && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewCat(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-outfit font-bold text-lg text-[#1a2340]">{viewCat.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{viewCat.id} · {viewCat.fields.length} metadata fields</p>
              </div>
              <button
                onClick={() => setViewCat(null)}
                aria-label="Close"
                title="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-all"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {viewCat.description && <p className="text-sm text-gray-500">{viewCat.description}</p>}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Metadata Fields</h3>
                {viewCat.fields.length === 0 ? (
                  <p className="text-sm text-gray-400">No metadata fields defined</p>
                ) : (
                  <div className="space-y-2">
                    {viewCat.fields.map((f, i) => (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#1a2340]">{f.name}</div>
                          {f.type === 'Dropdown' && f.options && f.options.length > 0 && (
                            <div className="flex gap-1 flex-wrap mt-1">
                              {f.options.map((o, oi) => <span key={oi} className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">{o}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">{f.type}</span>
                          {f.required && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>Required</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setViewCat(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
