"use client";

import { useCallback, useEffect, useState } from 'react';

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

const moduleColors: Record<string, string> = {
  Organization: `bg-[#0097B2]/10 text-[#0097B2]`,
  Billing: 'bg-[#d97706]/10 text-[#d97706]',
  User: 'bg-[#00c896]/10 text-[#00c896]',
  System: 'bg-[#7c3aed]/10 text-[#7c3aed]',
};

const moduleIconBg: Record<string, string> = {
  Organization: 'bg-[#0097B2]/10',
  Billing: 'bg-[#d97706]/10',
  User: 'bg-[#00c896]/10',
  System: 'bg-[#7c3aed]/10',
};

const moduleIconColor: Record<string, string> = {
  Organization: 'text-[#0097B2]',
  Billing: 'text-[#d97706]',
  User: 'text-[#00c896]',
  System: 'text-[#7c3aed]',
};

export default function ActivityLogsPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3051';
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'All' | 'Organization' | 'Billing' | 'User' | 'System'>('All');
  const [adminFilter, setAdminFilter] = useState('All');
  const [orgFilter, setOrgFilter] = useState('All');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (moduleFilter !== 'All') params.set('module', moduleFilter);
      if (adminFilter !== 'All') params.set('performedBy', adminFilter);
      if (orgFilter !== 'All') params.set('organization', orgFilter);
      const query = params.toString();
      const res = await fetch(`${API_BASE_URL}/super-admin/activity-logs${query ? `?${query}` : ''}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        let message = `Failed to load activity logs (${res.status})`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) message = `${message}: ${body.message}`;
        } catch {
          // keep status-only message
        }
        throw new Error(message);
      }
      const data = (await res.json()) as LogEntry[];
      setLogs(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, search, moduleFilter, adminFilter, orgFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs();
    }, search.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadLogs, search]);

  const admins = ['All', ...Array.from(new Set(logs.map((l) => l.performedBy)))];
  const orgs = ['All', ...Array.from(new Set(logs.map((l) => l.organization)))];

  const orgCount = logs.filter((l) => l.module === 'Organization').length;
  const billingCount = logs.filter((l) => l.module === 'Billing').length;
  const userCount = logs.filter((l) => l.module === 'User').length;

  const summaryCards = [
    { label: 'Total Logs', icon: 'ri-list-check-2', iconBgClass: 'bg-[#0097B2]/10', iconColorClass: 'text-[#0097B2]', value: logs.length },
    { label: 'Org Actions', icon: 'ri-building-2-line', iconBgClass: 'bg-[#16a34a]/10', iconColorClass: 'text-[#16a34a]', value: orgCount },
    { label: 'Billing Actions', icon: 'ri-bank-card-line', iconBgClass: 'bg-[#d97706]/10', iconColorClass: 'text-[#d97706]', value: billingCount },
    { label: 'User Actions', icon: 'ri-user-line', iconBgClass: 'bg-[#00c896]/10', iconColorClass: 'text-[#00c896]', value: userCount },
  ] as const;

  const handleExport = () => {
    const headers = ['Date & Time', 'Action', 'Organization', 'Module', 'Performed By', 'Details'];
    const rows = logs.map((l) => [l.dateTime, l.action, l.organization, l.module, l.performedBy, l.details]);
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
          disabled={logs.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <i className="ri-download-2-line" />
          Export CSV
        </button>
      </div>

      {loading && (
        <div className="rounded-lg border border-brand-border bg-white px-4 py-3 text-sm text-brand-muted">
          Loading activity logs...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

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
            <div className="text-2xl font-bold text-brand-navy">{loading ? '—' : k.value}</div>
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
        <select
          title="Filter by admin"
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 border border-brand-border rounded-lg text-xs text-brand-body focus:outline-none transition-colors bg-white"
        >
          {admins.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select
          title="Filter by organization"
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 border border-brand-border rounded-lg text-xs text-brand-body focus:outline-none transition-colors bg-white"
        >
          {orgs.map((o) => <option key={o}>{o}</option>)}
        </select>
        <span className="text-xs text-brand-muted sm:ml-auto">{loading ? 'Loading...' : `${logs.length} entries`}</span>
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
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-brand-surface/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-brand-muted whitespace-nowrap font-mono">{log.dateTime}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${moduleIconBg[log.module] ?? 'bg-[#0097B2]/10'}`}>
                        <i className={`${log.icon} text-xs ${moduleIconColor[log.module] ?? 'text-[#0097B2]'}`} />
                      </div>
                      <span className="text-sm font-medium text-brand-navy whitespace-nowrap">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-brand-body whitespace-nowrap">{log.organization}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${moduleColors[log.module] ?? 'bg-gray-100 text-gray-600'}`}>{log.module}</span>
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
          {logs.map((log) => (
            <div key={log.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${moduleIconBg[log.module] ?? 'bg-[#0097B2]/10'}`}>
                    <i className={`${log.icon} text-xs ${moduleIconColor[log.module] ?? 'text-[#0097B2]'}`} />
                  </div>
                  <div className="text-sm font-semibold text-brand-navy truncate">{log.action}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${moduleColors[log.module] ?? 'bg-gray-100 text-gray-600'}`}>{log.module}</span>
              </div>
              <div className="text-xs text-brand-muted font-mono">{log.dateTime}</div>
              <div className="text-xs text-brand-body">Organization: <span className="font-medium">{log.organization}</span></div>
              <div className="text-xs text-brand-body">By: <span className="font-medium">{log.performedBy}</span></div>
              <div className="text-xs text-brand-muted">{log.details}</div>
            </div>
          ))}
        </div>
        {!loading && logs.length === 0 && (
          <div className="py-16 text-center text-brand-muted text-sm">
            <i className="ri-list-check-2 text-3xl block mb-2" />
            {error ? 'Could not load logs.' : 'No log entries found.'}
          </div>
        )}
      </div>
    </div>
  );
}
