"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardKpi {
  label: string;
  value: string;
  delta: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
}

interface DashboardTopUpStat {
  label: string;
  value: string;
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
}

interface RecentActivityItem {
  icon: string;
  iconColorClass: string;
  iconBgClass: string;
  action: string;
  org: string;
  time: string;
  admin: string;
}

interface DashboardTopOrg {
  name: string;
  plan: string;
  revenue: string;
  status: 'Active' | 'Inactive';
  docs: string;
}

interface DashboardPlanDistItem {
  label: string;
  count: number;
}

interface DashboardOrgGrowthItem {
  month: string;
  count: number;
}

interface DashboardData {
  kpis: DashboardKpi[];
  topupStats: DashboardTopUpStat[];
  recentActivity: RecentActivityItem[];
  topOrgs: DashboardTopOrg[];
  planDistribution: DashboardPlanDistItem[];
  orgGrowth: DashboardOrgGrowthItem[];
}

const planBarColors = [
  'bg-[#0097B2]', 'bg-[#00c896]', 'bg-[#d97706]', 'bg-[#7c3aed]',
  'bg-[#ec4899]', 'bg-[#16a34a]', 'bg-[#ef4444]', 'bg-[#f59e0b]',
];

export default function SuperAdminDashboard() {
  const [activeChart, setActiveChart] = useState<'growth'>('growth');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3051';
    setLoading(true);
    fetch(`${API_BASE_URL}/super-admin/dashboard`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(body.message ?? `Dashboard API failed (${res.status})`);
        }
        return res.json() as Promise<DashboardData>;
      })
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = data?.kpis ?? [];
  const topupStats = data?.topupStats ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const topOrgs = data?.topOrgs ?? [];
  const planDistribution = data?.planDistribution ?? [];
  const orgGrowth = data?.orgGrowth ?? [];

  const totalPlanCount = planDistribution.reduce((a, p) => a + p.count, 0);
  const maxGrowth = Math.max(1, ...orgGrowth.map((d) => d.count));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-brand-navy">Super Admin Dashboard</h1>
          <p className="text-brand-muted text-sm mt-0.5">{today}</p>
        </div>
        <Link
          href="/super-admin/organizations"
          className="flex items-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap"
        >
          <i className="ri-building-2-line" />
          Manage Organizations
        </Link>
      </div>

      {loading && (
        <div className="rounded-lg border border-brand-border bg-white px-4 py-3 text-sm text-brand-muted">
          Loading dashboard data...
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[#d97706]/30 bg-[#d97706]/10 px-3 py-2 text-xs text-[#92400e]">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.length > 0
          ? kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-brand-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-brand-muted">{k.label}</span>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.iconBgClass}`}>
                    <i className={`${k.icon} text-base ${k.iconColorClass}`} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-brand-navy">{k.value}</div>
                <div className="text-xs text-brand-muted mt-1">{k.delta}</div>
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-brand-border p-4 animate-pulse">
                <div className="h-4 bg-brand-surface rounded w-3/4 mb-3" />
                <div className="h-8 bg-brand-surface rounded w-1/2 mb-2" />
                <div className="h-3 bg-brand-surface rounded w-2/3" />
              </div>
            ))
        }
      </div>

      {/* Top-Up Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topupStats.length > 0
          ? topupStats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBgClass}`}>
                  <i className={`${s.icon} text-xl ${s.iconColorClass}`} />
                </div>
                <div>
                  <div className="text-xl font-bold text-brand-navy">{s.value}</div>
                  <div className="text-xs text-brand-muted mt-0.5">{s.label}</div>
                </div>
              </div>
            ))
          : Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-brand-surface flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-5 bg-brand-surface rounded w-1/3 mb-2" />
                  <div className="h-3 bg-brand-surface rounded w-2/3" />
                </div>
              </div>
            ))
        }
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Org Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-outfit font-semibold text-brand-navy text-sm">Organization Growth</h2>
            <div className="flex gap-1 bg-brand-surface rounded-lg p-1">
              <button
                onClick={() => setActiveChart('growth')}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap bg-white text-brand-navy border border-brand-border"
              >
                Org Growth
              </button>
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {orgGrowth.length > 0
              ? orgGrowth.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-brand-muted font-medium">{d.count}</span>
                    <div className="w-full h-24 bg-brand-surface rounded-t-md overflow-hidden flex items-end">
                      <div
                        className="w-full bg-[#0097B2] rounded-t-md transition-all duration-500"
                        style={{ height: `${Math.round((d.count / maxGrowth) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-brand-muted">{d.month}</span>
                  </div>
                ))
              : (
                <div className="w-full h-full flex items-center justify-center text-sm text-brand-muted">
                  {loading ? 'Loading chart data...' : 'No growth data available'}
                </div>
              )
            }
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-6">
            <div>
              <div className="text-xs text-brand-muted">Total Orgs</div>
              <div className="text-sm font-bold text-brand-navy">
                {kpis.find((k) => k.label === 'Total Organizations')?.value ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-brand-muted">Active Orgs</div>
              <div className="text-sm font-bold text-[#16a34a]">
                {kpis.find((k) => k.label === 'Active Organizations')?.value ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-brand-muted">Total Revenue</div>
              <div className="text-sm font-bold text-brand-navy">
                {kpis.find((k) => k.label === 'Total Revenue')?.value ?? '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-brand-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-outfit font-semibold text-brand-navy text-sm">Recent Activity</h2>
            <Link href="/super-admin/activity-logs" className="text-xs text-[#0097B2] hover:underline">View all →</Link>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.iconBgClass}`}>
                    <i className={`${a.icon} text-sm ${a.iconColorClass}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-brand-navy">{a.action}</p>
                    <p className="text-xs text-brand-muted mt-0.5">{a.org}</p>
                    <p className="text-[10px] text-brand-muted mt-0.5">{a.time} · {a.admin}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-brand-muted text-center py-8">
              {loading ? 'Loading...' : 'No recent activity'}
            </div>
          )}
        </div>
      </div>

      {/* Plan Distribution + Top Orgs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-brand-border p-5">
          <h2 className="font-outfit font-semibold text-brand-navy text-sm mb-4">Plan Distribution</h2>
          {planDistribution.length > 0 ? (
            <div className="space-y-3">
              {planDistribution.map((p, i) => {
                const pct = totalPlanCount > 0 ? Math.round((p.count / totalPlanCount) * 100) : 0;
                return (
                  <div key={p.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-brand-body">{p.label}</span>
                      <span className="text-xs font-semibold text-brand-navy">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${planBarColors[i % planBarColors.length]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-brand-muted text-center py-8">
              {loading ? 'Loading...' : 'No plan data available'}
            </div>
          )}
          {planDistribution.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-border text-xs text-brand-muted">
              Total: <span className="font-semibold text-brand-navy">{totalPlanCount} organizations</span>
            </div>
          )}
        </div>

        {/* Top Organizations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-outfit font-semibold text-brand-navy text-sm">Top Organizations by Doc Usage</h2>
            <Link href="/super-admin/organizations" className="text-xs text-[#0097B2] hover:underline">View all →</Link>
          </div>
          {topOrgs.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-brand-surface">
                    <tr>
                      {['Organization', 'Plan', 'Revenue', 'Doc Usage', 'Status'].map((h) => (
                        <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {topOrgs.map((o, i) => (
                      <tr key={i} className="hover:bg-brand-surface/50 cursor-pointer">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#0097B2]/10 flex items-center justify-center">
                              <i className="ri-building-2-line text-sm text-[#0097B2]" />
                            </div>
                            <span className="text-sm font-medium text-brand-navy">{o.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-brand-body">{o.plan}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-brand-navy">{o.revenue}</td>
                        <td className="px-5 py-3 text-xs text-brand-muted">{o.docs}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            o.status === 'Active' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-100 text-red-500'
                          }`}>{o.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-brand-border">
                {topOrgs.map((o, i) => (
                  <div key={i} className="px-4 py-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0097B2]/10 flex items-center justify-center flex-shrink-0">
                          <i className="ri-building-2-line text-sm text-[#0097B2]" />
                        </div>
                        <span className="text-sm font-semibold text-brand-navy truncate">{o.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.status === 'Active' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-100 text-red-500'
                      }`}>{o.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><div className="text-brand-muted">Plan</div><div className="text-brand-body font-medium">{o.plan}</div></div>
                      <div><div className="text-brand-muted">Revenue</div><div className="text-brand-navy font-semibold">{o.revenue}</div></div>
                      <div className="col-span-2"><div className="text-brand-muted">Doc Usage</div><div className="text-brand-body">{o.docs}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-brand-muted">
              <i className="ri-building-2-line text-3xl block mb-2" />
              {loading ? 'Loading...' : 'No organizations yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
