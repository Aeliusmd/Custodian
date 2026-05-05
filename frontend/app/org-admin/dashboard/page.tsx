'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

const TEAL = '#0097B2';

const statsCards = [
  { label: 'Total Documents', value: '12,480', icon: 'ri-file-text-line', color: TEAL, change: '+3.2%' },
  { label: 'Uploaded Today', value: '47', icon: 'ri-upload-cloud-2-line', color: '#16a34a', change: '+12 from yesterday' },
  { label: 'Total Categories', value: '18', icon: 'ri-folder-3-line', color: '#d97706', change: '3 added this month' },
  { label: 'Storage Used', value: '82%', icon: 'ri-hard-drive-2-line', color: '#ef4444', isStorage: true, used: 8.2, total: 10 },
];

const uploadActivity = [
  { day: 'Mon', count: 34 },
  { day: 'Tue', count: 58 },
  { day: 'Wed', count: 42 },
  { day: 'Thu', count: 71 },
  { day: 'Fri', count: 63 },
  { day: 'Sat', count: 19 },
  { day: 'Sun', count: 12 },
];

const categoryDist = [
  { name: 'Legal Contracts', count: 3240, color: TEAL },
  { name: 'Financial Reports', count: 2810, color: '#16a34a' },
  { name: 'HR Documents', count: 1950, color: '#d97706' },
  { name: 'Compliance', count: 1620, color: '#8b5cf6' },
  { name: 'Operations', count: 1380, color: '#ef4444' },
  { name: 'Others', count: 1480, color: '#94a3b8' },
];

const recentUploads = [
  { id: 'DOC-4821', name: 'Service Agreement – Apex Corp.pdf', category: 'Legal Contracts', uploadedBy: 'James Whitfield', date: '2026-04-10', status: 'Public' },
  { id: 'DOC-4820', name: 'Q1 2026 Financial Summary.xlsx', category: 'Financial Reports', uploadedBy: 'Sarah Lin', date: '2026-04-10', status: 'Private' },
  { id: 'DOC-4819', name: 'Employee Handbook v3.2.pdf', category: 'HR Documents', uploadedBy: 'Mark Torres', date: '2026-04-09', status: 'Private' },
  { id: 'DOC-4818', name: 'ISO 27001 Audit Report.pdf', category: 'Compliance', uploadedBy: 'James Whitfield', date: '2026-04-09', status: 'Private' },
  { id: 'DOC-4817', name: 'Vendor Contract – TechSupply.pdf', category: 'Legal Contracts', uploadedBy: 'Nina Patel', date: '2026-04-08', status: 'Public' },
  { id: 'DOC-4816', name: 'Operations Manual 2026.pdf', category: 'Operations', uploadedBy: 'Sarah Lin', date: '2026-04-08', status: 'Public' },
  { id: 'DOC-4815', name: 'Payroll Summary March 2026.xlsx', category: 'Financial Reports', uploadedBy: 'Mark Torres', date: '2026-04-07', status: 'Private' },
  { id: 'DOC-4814', name: 'NDA – Westfield Partners.pdf', category: 'Legal Contracts', uploadedBy: 'James Whitfield', date: '2026-04-07', status: 'Private' },
];

const maxBar = Math.max(...uploadActivity.map((d) => d.count));
const totalCatDocs = categoryDist.reduce((a, b) => a + b.count, 0);

export default function OrgAdminDashboard() {
  const [chartRange, setChartRange] = useState<'daily' | 'weekly'>('weekly');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome back, James — here's your organization overview</p>
        </div>
        <Link
          href="/org-admin/upload-documents"
          className={styles.uploadBtn}
        >
          <i className="ri-upload-cloud-2-line" />
          Upload Document
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={styles.statsIconBg} style={{ backgroundColor: `${card.color}18` }}>
                <i className={`${card.icon} ${styles.statsIcon}`} style={{ color: card.color }} />
              </div>
              {!card.isStorage && (
                <span className="text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-full whitespace-nowrap">{card.change}</span>
              )}
            </div>
            {card.isStorage ? (
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
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
            <div>
              <div className="text-lg font-bold text-[#1a2340]">299</div>
              <div className="text-xs text-gray-400">This week</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#1a2340]">1,240</div>
              <div className="text-xs text-gray-400">This month</div>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded-full">+18% vs last week</span>
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
