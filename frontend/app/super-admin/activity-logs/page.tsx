"use client";

import { useState } from 'react';

const TEAL = '#0097B2';
const GREEN = '#00c896';

interface LogEntry {
  id: string;
  dateTime: string;
  action: string;
  module: 'Organization' | 'Billing' | 'User' | 'System';
  organization: string;
  performedBy: string;
  details: string;
  icon: string;
  color: string;
}

const allLogs: LogEntry[] = [
  { id: 'log-001', dateTime: '2026-04-07 09:14', action: 'Organization Created', module: 'Organization', organization: 'Apex Legal Group', performedBy: 'Sarah Chen', details: 'New org ORG-001 created with Professional plan', icon: 'ri-building-2-line', color: TEAL },
  { id: 'log-002', dateTime: '2026-04-07 08:52', action: 'Plan Assigned', module: 'Billing', organization: 'Apex Legal Group', performedBy: 'Sarah Chen', details: 'Professional Plan assigned to Apex Legal Group', icon: 'ri-vip-crown-line', color: '#7c3aed' },
  { id: 'log-003', dateTime: '2026-04-07 08:30', action: 'Admin Added', module: 'User', organization: 'Apex Legal Group', performedBy: 'Sarah Chen', details: 'john@apexlegal.com added as Admin', icon: 'ri-user-add-line', color: GREEN },
  { id: 'log-004', dateTime: '2026-04-06 17:42', action: 'Organization Updated', module: 'Organization', organization: 'St. Mercy Health', performedBy: 'James Okafor', details: 'Address and phone number updated', icon: 'ri-edit-line', color: '#16a34a' },
  { id: 'log-005', dateTime: '2026-04-06 15:30', action: 'Plan Changed', module: 'Billing', organization: 'Harrington & Co.', performedBy: 'Sarah Chen', details: 'Starter → Professional plan upgrade', icon: 'ri-arrow-up-circle-line', color: '#d97706' },
  { id: 'log-006', dateTime: '2026-04-06 14:10', action: 'Top-Up Purchased', module: 'Billing', organization: 'Westfield Estate', performedBy: 'Greg Holt', details: 'Medium Top-Up (2,000 pages) purchased via system', icon: 'ri-shopping-cart-line', color: GREEN },
  { id: 'log-007', dateTime: '2026-04-06 12:10', action: 'Organization Deactivated', module: 'Organization', organization: 'Redwood Partners', performedBy: 'Sarah Chen', details: 'ORG-006 deactivated due to expired plan', icon: 'ri-close-circle-line', color: '#ef4444' },
  { id: 'log-008', dateTime: '2026-04-06 11:00', action: 'Top-Up Assigned', module: 'Billing', organization: 'Coastal Insurance', performedBy: 'Sarah Chen', details: 'Large Top-Up (5,000 pages) manually assigned', icon: 'ri-file-add-line', color: TEAL },
  { id: 'log-009', dateTime: '2026-04-05 11:05', action: 'Billing Updated', module: 'Billing', organization: 'System', performedBy: 'Sarah Chen', details: 'Manual Plan – 1 Year price updated to $1,800', icon: 'ri-bank-card-line', color: '#d97706' },
  { id: 'log-010', dateTime: '2026-04-05 09:30', action: 'Organization Created', module: 'Organization', organization: 'Pinnacle Law Firm', performedBy: 'Sarah Chen', details: 'New org ORG-007 created with 3 Month Plan', icon: 'ri-building-2-line', color: TEAL },
  { id: 'log-011', dateTime: '2026-04-05 09:00', action: 'Admin Added', module: 'User', organization: 'Pinnacle Law Firm', performedBy: 'Sarah Chen', details: 'nina@pinnaclelaw.com added as Admin', icon: 'ri-user-add-line', color: GREEN },
  { id: 'log-012', dateTime: '2026-04-04 16:20', action: 'Plan Assigned', module: 'Billing', organization: 'Pinnacle Law Firm', performedBy: 'James Okafor', details: '3 Month Plan assigned to Pinnacle Law Firm', icon: 'ri-vip-crown-line', color: '#7c3aed' },
  { id: 'log-013', dateTime: '2026-04-04 14:00', action: 'Organization Updated', module: 'Organization', organization: 'Coastal Insurance', performedBy: 'Sarah Chen', details: 'Email address updated', icon: 'ri-edit-line', color: '#16a34a' },
  { id: 'log-014', dateTime: '2026-04-04 10:30', action: 'Top-Up Purchased', module: 'Billing', organization: 'St. Mercy Health', performedBy: 'Dr. Alan Frost', details: 'Small Top-Up (500 pages) purchased via system', icon: 'ri-shopping-cart-line', color: GREEN },
  { id: 'log-015', dateTime: '2026-04-03 10:45', action: 'Billing Updated', module: 'Billing', organization: 'System', performedBy: 'Sarah Chen', details: 'Enterprise Plan monthly price updated to $699', icon: 'ri-bank-card-line', color: '#d97706' },
  { id: 'log-016', dateTime: '2026-04-02 09:15', action: 'Organization Created', module: 'Organization', organization: 'BlueSky Analytics', performedBy: 'Sarah Chen', details: 'New org ORG-008 created with Starter plan', icon: 'ri-building-2-line', color: TEAL },
  { id: 'log-017', dateTime: '2026-04-01 17:00', action: 'Plan Changed', module: 'Billing', organization: 'Harrington & Co.', performedBy: 'James Okafor', details: 'Professional → Enterprise plan upgrade', icon: 'ri-arrow-up-circle-line', color: '#d97706' },
  { id: 'log-018', dateTime: '2026-04-01 14:20', action: 'Admin Removed', module: 'User', organization: 'BlueSky Analytics', performedBy: 'Sarah Chen', details: 'old.admin@bluesky.io removed from organization', icon: 'ri-user-unfollow-line', color: '#ef4444' },
];

const moduleColors: Record<string, string> = {
  Organization: `bg-[#0097B2]/10 text-[#0097B2]`,
  Billing: 'bg-[#d97706]/10 text-[#d97706]',
  User: 'bg-[#00c896]/10 text-[#00c896]',
  System: 'bg-[#7c3aed]/10 text-[#7c3aed]',
};

const summaryCards = [
  { label: 'Total Logs', icon: 'ri-list-check-2', iconBgClass: 'bg-[#0097B2]/10', iconColorClass: 'text-[#0097B2]', value: allLogs.length },
  { label: 'Org Actions', icon: 'ri-building-2-line', iconBgClass: 'bg-[#16a34a]/10', iconColorClass: 'text-[#16a34a]', value: allLogs.filter((l) => l.module === 'Organization').length },
  { label: 'Billing Actions', icon: 'ri-bank-card-line', iconBgClass: 'bg-[#d97706]/10', iconColorClass: 'text-[#d97706]', value: allLogs.filter((l) => l.module === 'Billing').length },
  { label: 'User Actions', icon: 'ri-user-line', iconBgClass: 'bg-[#00c896]/10', iconColorClass: 'text-[#00c896]', value: allLogs.filter((l) => l.module === 'User').length },
] as const;

export default function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'All' | 'Organization' | 'Billing' | 'User' | 'System'>('All');
  const [adminFilter, setAdminFilter] = useState('All');
  const [orgFilter, setOrgFilter] = useState('All');

  const admins = ['All', ...Array.from(new Set(allLogs.map((l) => l.performedBy)))];
  const orgs = ['All', ...Array.from(new Set(allLogs.map((l) => l.organization)))];

  const filtered = allLogs.filter((l) => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.organization.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === 'All' || l.module === moduleFilter;
    const matchAdmin = adminFilter === 'All' || l.performedBy === adminFilter;
    const matchOrg = orgFilter === 'All' || l.organization === orgFilter;
    return matchSearch && matchModule && matchAdmin && matchOrg;
  });

  const handleExport = () => {
    const headers = ['Date & Time', 'Action', 'Organization', 'Module', 'Performed By', 'Details'];
    const rows = filtered.map((l) => [l.dateTime, l.action, l.organization, l.module, l.performedBy, l.details]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `custodox-activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-brand-navy">Activity Logs</h1>
          <p className="text-brand-muted text-sm mt-0.5">System-wide activity across all organizations and users</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap"
        >
          <i className="ri-download-2-line" />
          Export CSV
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-brand-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-brand-muted">{k.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.iconBgClass}`}>
                <i className={`${k.icon} text-sm ${k.iconColorClass}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-brand-navy">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-brand-border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search actions, orgs, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none transition-colors"
          />
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['All', 'Organization', 'Billing', 'User', 'System'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModuleFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                moduleFilter === m
                  ? 'bg-[#0097B2] text-white'
                  : 'bg-brand-surface text-brand-muted hover:text-brand-navy border border-brand-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <select title="Filter by admin" value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 border border-brand-border rounded-lg text-xs text-brand-body focus:outline-none transition-colors bg-white">
          {admins.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select title="Filter by organization" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} className="w-full sm:w-auto px-3 py-1.5 border border-brand-border rounded-lg text-xs text-brand-body focus:outline-none transition-colors bg-white">
          {orgs.map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="text-xs text-brand-muted sm:ml-auto">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead className="bg-brand-surface">
              <tr>
                {['Date & Time', 'Action', 'Organization', 'Module', 'Performed By', 'Details'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-brand-surface/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-brand-muted whitespace-nowrap font-mono">{log.dateTime}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        log.module === 'Organization'
                          ? 'bg-[#0097B2]/10'
                          : log.module === 'Billing'
                            ? 'bg-[#d97706]/10'
                            : log.module === 'User'
                              ? 'bg-[#00c896]/10'
                              : 'bg-[#7c3aed]/10'
                      }`}>
                        <i className={`${log.icon} text-xs ${
                          log.module === 'Organization'
                            ? 'text-[#0097B2]'
                            : log.module === 'Billing'
                              ? 'text-[#d97706]'
                              : log.module === 'User'
                                ? 'text-[#00c896]'
                                : 'text-[#7c3aed]'
                        }`} />
                      </div>
                      <span className="text-sm font-medium text-brand-navy whitespace-nowrap">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-brand-body whitespace-nowrap">{log.organization}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${moduleColors[log.module]}`}>{log.module}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#0097B2]/10">
                        <span className="text-[9px] font-bold text-[#0097B2]">{log.performedBy.split(' ').map((n) => n[0]).join('')}</span>
                      </div>
                      <span className="text-sm text-brand-body whitespace-nowrap">{log.performedBy}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-brand-muted max-w-[260px] truncate">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-brand-border">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    log.module === 'Organization'
                      ? 'bg-[#0097B2]/10'
                      : log.module === 'Billing'
                        ? 'bg-[#d97706]/10'
                        : log.module === 'User'
                          ? 'bg-[#00c896]/10'
                          : 'bg-[#7c3aed]/10'
                  }`}>
                    <i className={`${log.icon} text-xs ${
                      log.module === 'Organization'
                        ? 'text-[#0097B2]'
                        : log.module === 'Billing'
                          ? 'text-[#d97706]'
                          : log.module === 'User'
                            ? 'text-[#00c896]'
                            : 'text-[#7c3aed]'
                    }`} />
                  </div>
                  <div className="text-sm font-semibold text-brand-navy truncate">{log.action}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${moduleColors[log.module]}`}>{log.module}</span>
              </div>
              <div className="text-xs text-brand-muted font-mono">{log.dateTime}</div>
              <div className="text-xs text-brand-body">Organization: <span className="font-medium">{log.organization}</span></div>
              <div className="text-xs text-brand-body">By: <span className="font-medium">{log.performedBy}</span></div>
              <div className="text-xs text-brand-muted">{log.details}</div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-brand-muted text-sm">No log entries found.</div>
        )}
      </div>
    </div>
  );
}
