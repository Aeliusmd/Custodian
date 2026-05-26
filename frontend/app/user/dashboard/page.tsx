'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const TEAL = '#0097B2';

const CAT_COLORS = [TEAL, '#16a34a', '#d97706', '#8b5cf6', '#ef4444', '#0ea5e9'];

interface UploadDay { day: string; count: number }
interface CategoryDist { name: string; count: number }
interface RecentDoc { id: string; name: string; category: string; uploadedBy: string; date: string; status: string }
interface SharedDoc { id: string; name: string; sharedBy: string; date: string; category: string }

interface DashboardData {
  userName: string;
  stats: {
    myUploads: number;
    sharedWithMe: number;
    storageUsedGb: number;
    storageTotalGb: number;
    storagePercent: number;
    thisWeekCount: number;
  };
  uploadActivity: UploadDay[];
  categoryDist: CategoryDist[];
  recentDocs: RecentDoc[];
  sharedDocs: SharedDoc[];
}

export default function UserDashboard() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/protected/user/dashboard`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? `Failed to load dashboard (${res.status})`);
      }
      setData(await res.json() as DashboardData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => { void load(); }, [load]);

  const firstName = data?.userName?.split(' ')[0] ?? 'there';
  const uploadActivity = data?.uploadActivity ?? [];
  const categoryDist = data?.categoryDist ?? [];
  const recentDocs = data?.recentDocs ?? [];
  const sharedDocs = data?.sharedDocs ?? [];
  const maxBar = Math.max(...uploadActivity.map((d) => d.count), 1);
  const totalCatDocs = categoryDist.reduce((a, b) => a + b.count, 0) || 1;

  const statsCards = [
    { label: 'My Uploads', value: data ? String(data.stats.myUploads) : '—', icon: 'ri-file-upload-line', color: TEAL, badge: loading ? '' : `${data?.stats.thisWeekCount ?? 0} this week`, isStorage: false },
    { label: 'Shared With Me', value: data ? String(data.stats.sharedWithMe) : '—', icon: 'ri-share-line', color: '#16a34a', badge: 'Public org docs', isStorage: false },
    { label: 'Storage Used', value: data ? `${data.stats.storagePercent}%` : '—', icon: 'ri-hard-drive-2-line', color: '#ef4444', isStorage: true, used: data?.stats.storageUsedGb ?? 0, total: data?.stats.storageTotalGb ?? 1 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loading ? 'Loading...' : `Welcome back, ${firstName} — here's your activity overview`}
          </p>
        </div>
        <Link
          href="/user/upload-documents"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
          style={{ background: TEAL }}
        >
          <i className="ri-upload-cloud-2-line" />
          Upload Document
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}18` }}>
                <i className={`${card.icon} text-lg`} style={{ color: card.color }} />
              </div>
              {!card.isStorage && card.badge && (
                <span className="text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-full whitespace-nowrap">{card.badge}</span>
              )}
            </div>
            {card.isStorage ? (
              <>
                <div className="text-2xl font-bold text-[#1a2340] mb-1">{card.value}</div>
                <div className="text-xs text-gray-400 mb-2">{card.used} GB of {card.total} GB used</div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: card.value, background: card.color }} />
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#1a2340] mb-1">{card.value}</div>
                {card.badge && <div className="text-xs text-gray-400">{card.badge}</div>}
              </>
            )}
            <div className="text-xs font-medium text-gray-500 mt-2">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upload Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-[#1a2340] text-sm">My Upload Activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Documents uploaded per day (last 7 days)</p>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-300 text-sm animate-pulse">Loading chart...</div>
          ) : (
            <div className="flex items-end gap-3 h-40">
              {uploadActivity.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-gray-400 font-medium">{d.count}</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: `${Math.max(4, (d.count / maxBar) * 120)}px`, background: TEAL, opacity: 0.7 }}
                  />
                  <span className="text-[10px] text-gray-400">{d.day}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
            <div>
              <div className="text-lg font-bold text-[#1a2340]">{data?.stats.thisWeekCount ?? '—'}</div>
              <div className="text-xs text-gray-400">This week</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#1a2340]">{data?.stats.myUploads ?? '—'}</div>
              <div className="text-xs text-gray-400">Total uploads</div>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-[#1a2340] text-sm">My Documents by Category</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribution of your uploads</p>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-1.5 bg-gray-100 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : categoryDist.length === 0 ? (
            <div className="text-xs text-gray-400 py-4 text-center">No uploads yet</div>
          ) : (
            <div className="space-y-3">
              {categoryDist.map((cat, idx) => {
                const pct = Math.round((cat.count / totalCatDocs) * 100);
                const color = CAT_COLORS[idx % CAT_COLORS.length];
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-xs text-gray-600 truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#1a2340]">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400">Total: <span className="font-semibold text-[#1a2340]">{data?.stats.myUploads ?? 0} documents</span></div>
          </div>
        </div>
      </div>

      {/* Bottom: Recent Uploads + Shared With Me */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* My Recent Documents */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#1a2340] text-sm">My Recent Documents</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest documents you uploaded</p>
            </div>
            <Link href="/user/documents" className="text-xs font-medium hover:underline whitespace-nowrap" style={{ color: TEAL }}>View all</Link>
          </div>
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-lg" />)}
            </div>
          ) : recentDocs.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No documents uploaded yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                    <i className="ri-file-text-line text-sm" style={{ color: TEAL }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1a2340] truncate">{doc.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{doc.category}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.status === 'Public' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-gray-100 text-gray-500'}`}>
                      {doc.status}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{doc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared With Me */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#1a2340] text-sm">Shared With Me</h3>
              <p className="text-xs text-gray-400 mt-0.5">Recent public org documents</p>
            </div>
            {!loading && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>{sharedDocs.length}</span>
            )}
          </div>
          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-50 rounded-lg" />)}
            </div>
          ) : sharedDocs.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No shared documents</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sharedDocs.map((doc) => (
                <div key={doc.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#16a34a18' }}>
                      <i className="ri-share-line text-sm text-[#16a34a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1a2340] truncate">{doc.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <i className="ri-user-line text-xs" />
                        {doc.sharedBy}
                      </div>
                      <div className="text-xs text-gray-300 mt-0.5">{doc.date} · {doc.category}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-50">
            <Link href="/user/documents" className="text-xs font-medium hover:underline" style={{ color: TEAL }}>
              View all documents
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
