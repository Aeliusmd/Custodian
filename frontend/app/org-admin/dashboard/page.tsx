'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const TEAL = '#0097B2';

type DashboardResponse = {
  organizationName: string;
  stats: {
    totalDocuments: number;
    uploadedToday: number;
    totalCategories: number;
    storageUsedGb: number;
    storageTotalGb: number;
    storagePercent: number;
  };
  uploadActivity: Array<{ day: string; count: number }>;
  categoryDist: Array<{ name: string; count: number }>;
  recentUploads: Array<{
    id: string;
    name: string;
    category: string;
    uploadedBy: string;
    date: string;
    status: 'Public' | 'Private';
  }>;
};

export default function OrgAdminDashboard() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const [chartRange, setChartRange] = useState<'daily' | 'weekly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${API_BASE_URL}/protected/org-admin/dashboard`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          let message = `Failed to load dashboard (${response.status})`;
          try {
            const body = (await response.json()) as { message?: string };
            if (body?.message) message = `${message}: ${body.message}`;
          } catch {
            // keep status-only message
          }
          throw new Error(message);
        }
        const data = (await response.json()) as DashboardResponse;
        setDashboard(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    };
    void loadDashboard();
  }, [API_BASE_URL]);

  const uploadActivity = dashboard?.uploadActivity ?? [];
  const categoryDist = useMemo(() => {
    const colors = [TEAL, '#16a34a', '#d97706', '#8b5cf6', '#ef4444', '#94a3b8'];
    return (dashboard?.categoryDist ?? []).map((cat, idx) => ({
      ...cat,
      color: colors[idx % colors.length],
    }));
  }, [dashboard?.categoryDist]);
  const recentUploads = dashboard?.recentUploads ?? [];
  const maxBar = Math.max(1, ...uploadActivity.map((d) => d.count));
  const totalCatDocs = Math.max(1, categoryDist.reduce((a, b) => a + b.count, 0));
  const weeklyTotal = uploadActivity.reduce((sum, day) => sum + day.count, 0);

  const statsCards = [
    { label: 'Total Documents', value: String(dashboard?.stats.totalDocuments ?? 0), icon: 'ri-file-text-line', color: TEAL, change: 'Tenant scoped', isStorage: false },
    { label: 'Uploaded Today', value: String(dashboard?.stats.uploadedToday ?? 0), icon: 'ri-upload-cloud-2-line', color: '#16a34a', change: 'Today', isStorage: false },
    { label: 'Total Categories', value: String(dashboard?.stats.totalCategories ?? 0), icon: 'ri-folder-3-line', color: '#d97706', change: 'Tenant scoped', isStorage: false },
    {
      label: 'Storage Used',
      value: `${dashboard?.stats.storagePercent ?? 0}%`,
      icon: 'ri-hard-drive-2-line',
      color: '#ef4444',
      isStorage: true,
      used: dashboard?.stats.storageUsedGb ?? 0,
      total: dashboard?.stats.storageTotalGb ?? 1,
    },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loading ? 'Loading your organization overview...' : `Welcome back — ${dashboard?.organizationName ?? 'your organization'} overview`}
          </p>
        </div>
        <Link
          href="/org-admin/upload-documents"
          className={styles.uploadBtn}
        >
          <i className="ri-upload-cloud-2-line" />
          Upload Document
        </Link>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={styles.statsIconBg} style={{ backgroundColor: `${card.color}18` }}>
                <i className={`${card.icon} ${styles.statsIcon}`} style={{ color: card.color }} />
              </div>
              {!('isStorage' in card) && (
                <span className="text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-full whitespace-nowrap">{card.change}</span>
              )}
            </div>
            {'isStorage' in card ? (
              <>
                <div className="text-2xl font-bold text-[#1a2340] mb-1">{card.value}</div>
                <div className="text-xs text-gray-400 mb-2">{card.used} GB of {card.total} GB used</div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={styles.storageProgressFill}
                    style={{ width: card.value, backgroundColor: card.color }}
                  />
                </div>
                <div className="text-[10px] text-red-400 mt-1.5 font-medium">Warning: Near storage limit</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#1a2340] mb-1">{card.value}</div>
                <div className="text-xs text-gray-400">{card.change}</div>
              </>
            )}
            <div className="text-xs font-medium text-gray-500 mt-2">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upload Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-[#1a2340] text-sm">Upload Activity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Documents uploaded per day</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['daily', 'weekly'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`${styles.chartRangeBtn} ${chartRange === r ? styles.active : ''}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {uploadActivity.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium">{d.count}</span>
                <div
                  className={`${styles.chartBarContainer} ${d.day === 'Thu' ? styles.chartBarHighlight : styles.chartBarNormal}`}
                  style={{
                    height: `${(d.count / maxBar) * 120}px`,
                    backgroundColor: TEAL,
                  }}
                />
                <span className="text-[10px] text-gray-400">{d.day}</span>
              </div>
            ))}
            {uploadActivity.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                No upload activity yet
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
            <div>
              <div className="text-lg font-bold text-[#1a2340]">{weeklyTotal}</div>
              <div className="text-xs text-gray-400">This week</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#1a2340]">{dashboard?.stats.totalDocuments ?? 0}</div>
              <div className="text-xs text-gray-400">This month</div>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded-full">Tenant scoped</span>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-[#1a2340] text-sm">Category Distribution</h3>
            <p className="text-xs text-gray-400 mt-0.5">Documents by category</p>
          </div>
          <div className="space-y-3">
            {categoryDist.map((cat) => {
              const pct = Math.round((cat.count / totalCatDocs) * 100);
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={styles.categoryDot} style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-gray-600 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1a2340]">{pct}%</span>
                  </div>
                  <div className={styles.categoryProgressBar}>
                    <div className={styles.categoryProgressFill} style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400">Total: <span className="font-semibold text-[#1a2340]">{totalCatDocs.toLocaleString()} documents</span></div>
          </div>
        </div>
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#1a2340] text-sm">Recent Uploads</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest documents added to the system</p>
          </div>
          <Link href="/org-admin/search" className={styles.viewAllLink}>View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Document Name', 'Category', 'Uploaded By', 'Date', 'Status'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentUploads.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={styles.docTableIconBg} style={{ backgroundColor: `${TEAL}15` }}>
                        <i className={`ri-file-text-line ${styles.docTableIcon}`} style={{ color: TEAL }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#1a2340] max-w-[220px] truncate">{doc.name}</div>
                        <div className="text-xs text-gray-400">{doc.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-[#0097B2]/10 text-[#0097B2]">{doc.category}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{doc.uploadedBy}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{doc.date}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      doc.status === 'Public' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {doc.status === 'Public' ? <><i className="ri-global-line mr-1" />Public</> : <><i className="ri-lock-line mr-1" />Private</>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
