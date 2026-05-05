'use client';

import { useState } from 'react';
import Link from 'next/link';

const TEAL = '#0097B2';

const statsCards = [
  { label: 'My Uploads', value: '142', icon: 'ri-file-upload-line', color: TEAL, change: '+4 this week' },
  { label: 'Shared With Me', value: '38', icon: 'ri-share-line', color: '#16a34a', change: '2 new today' },
  { label: 'Recent Views', value: '21', icon: 'ri-eye-line', color: '#d97706', change: 'Last 7 days' },
  { label: 'Storage Used', value: '64%', icon: 'ri-hard-drive-2-line', color: '#ef4444', isStorage: true, used: 3.2, total: 5 },
];

const uploadActivity = [
  { day: 'Mon', count: 8 },
  { day: 'Tue', count: 14 },
  { day: 'Wed', count: 6 },
  { day: 'Thu', count: 19 },
  { day: 'Fri', count: 11 },
  { day: 'Sat', count: 3 },
  { day: 'Sun', count: 1 },
];

const categoryDist = [
  { name: 'Legal Contracts', count: 42, color: TEAL },
  { name: 'Financial Reports', count: 31, color: '#16a34a' },
  { name: 'HR Documents', count: 28, color: '#d97706' },
  { name: 'Compliance', count: 19, color: '#8b5cf6' },
  { name: 'Operations', count: 22, color: '#ef4444' },
];

const recentDocs = [
  { id: 'DOC-4821', name: 'Service Agreement – Apex Corp.pdf', category: 'Legal Contracts', date: '2026-04-10', status: 'Public', size: '1.2 MB' },
  { id: 'DOC-4815', name: 'Payroll Summary March 2026.xlsx', category: 'Financial Reports', date: '2026-04-07', status: 'Private', size: '540 KB' },
  { id: 'DOC-4809', name: 'Employee Handbook v3.2.pdf', category: 'HR Documents', date: '2026-04-05', status: 'Private', size: '3.1 MB' },
  { id: 'DOC-4802', name: 'ISO 27001 Audit Report.pdf', category: 'Compliance', date: '2026-04-03', status: 'Private', size: '2.4 MB' },
  { id: 'DOC-4797', name: 'Vendor Contract – TechSupply.pdf', category: 'Legal Contracts', date: '2026-04-01', status: 'Public', size: '890 KB' },
  { id: 'DOC-4791', name: 'Operations Manual 2026.pdf', category: 'Operations', date: '2026-03-29', status: 'Public', size: '4.2 MB' },
];

const sharedWithMe = [
  { id: 'SH-101', name: 'Q1 2026 Financial Summary.xlsx', sharedBy: 'James Whitfield', date: '2026-04-10', category: 'Financial Reports' },
  { id: 'SH-100', name: 'ISO 27001 Compliance Framework.pdf', sharedBy: 'Sarah Lin', date: '2026-04-08', category: 'Compliance' },
  { id: 'SH-099', name: 'NDA Template – Client Use.pdf', sharedBy: 'James Whitfield', date: '2026-04-06', category: 'Legal Contracts' },
];

const maxBar = Math.max(...uploadActivity.map((d) => d.count));
const totalCatDocs = categoryDist.reduce((a, b) => a + b.count, 0);

export default function UserDashboard() {
  const [chartRange, setChartRange] = useState<'daily' | 'weekly'>('weekly');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Welcome back, Alex — here&apos;s your activity overview</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${card.color}18` }}>
                <i className={`${card.icon} text-lg`} style={{ color: card.color }} />
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
                  <div className="h-full rounded-full transition-all" style={{ width: card.value, background: card.color }} />
                </div>
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
        {/* Upload Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-[#1a2340] text-sm">My Upload Activity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Documents uploaded per day</p>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(['daily', 'weekly'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap capitalize cursor-pointer"
                  style={chartRange === r ? { background: TEAL, color: '#fff' } : { color: '#6b7280' }}
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
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${(d.count / maxBar) * 120}px`, background: TEAL, opacity: d.day === 'Thu' ? 1 : 0.55 }}
                />
                <span className="text-[10px] text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
            <div>
              <div className="text-lg font-bold text-[#1a2340]">62</div>
              <div className="text-xs text-gray-400">This week</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#1a2340]">142</div>
              <div className="text-xs text-gray-400">Total uploads</div>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-medium text-[#16a34a] bg-[#16a34a]/10 px-2 py-1 rounded-full">+8% vs last week</span>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-5">
            <h3 className="font-semibold text-[#1a2340] text-sm">My Documents by Category</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribution of your uploads</p>
          </div>
          <div className="space-y-3">
            {categoryDist.map((cat) => {
              const pct = Math.round((cat.count / totalCatDocs) * 100);
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <span className="text-xs text-gray-600 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1a2340]">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-400">Total: <span className="font-semibold text-[#1a2340]">{totalCatDocs} documents</span></div>
          </div>
        </div>
      </div>

      {/* Bottom two-column: Recent Uploads + Shared With Me */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Uploads */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#1a2340] text-sm">My Recent Documents</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest documents you uploaded</p>
            </div>
            <Link href="/user/documents" className="text-xs font-medium hover:underline whitespace-nowrap" style={{ color: TEAL }}>View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                  <i className="ri-file-text-line text-sm" style={{ color: TEAL }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#1a2340] truncate">{doc.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{doc.category} · {doc.size}</div>
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
        </div>

        {/* Shared With Me */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#1a2340] text-sm">Shared With Me</h3>
              <p className="text-xs text-gray-400 mt-0.5">Documents others shared</p>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>{sharedWithMe.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {sharedWithMe.map((doc) => (
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