"use client";

import Link from 'next/link';
import { useState } from 'react';

const kpis = [
  { label: 'Total Organizations', value: '84', delta: '+6 this month', icon: 'ri-building-2-line', iconColorClass: 'text-[#0097B2]', iconBgClass: 'bg-[#0097B2]/10' },
  { label: 'Active Organizations', value: '71', delta: '13 inactive', icon: 'ri-checkbox-circle-line', iconColorClass: 'text-[#16a34a]', iconBgClass: 'bg-[#16a34a]/10' },
  { label: 'Total Revenue', value: '$38,420', delta: '+$4,210 this month', icon: 'ri-money-dollar-circle-line', iconColorClass: 'text-[#d97706]', iconBgClass: 'bg-[#d97706]/10' },
  { label: 'Active Plans', value: '84', delta: '48 subscription · 36 manual', icon: 'ri-file-list-3-line', iconColorClass: 'text-[#00c896]', iconBgClass: 'bg-[#00c896]/10' },
];

const orgGrowth = [
  { month: 'Oct', display: '52', barClass: 'h-[62%]' },
  { month: 'Nov', display: '58', barClass: 'h-[69%]' },
  { month: 'Dec', display: '61', barClass: 'h-[73%]' },
  { month: 'Jan', display: '67', barClass: 'h-[80%]' },
  { month: 'Feb', display: '78', barClass: 'h-[93%]' },
  { month: 'Mar', display: '84', barClass: 'h-full' },
];

const revenueData = [
  { month: 'Oct', display: '$25k', barClass: 'h-[65%]' },
  { month: 'Nov', display: '$27k', barClass: 'h-[71%]' },
  { month: 'Dec', display: '$29k', barClass: 'h-[77%]' },
  { month: 'Jan', display: '$31k', barClass: 'h-[81%]' },
  { month: 'Feb', display: '$34k', barClass: 'h-[89%]' },
  { month: 'Mar', display: '$38k', barClass: 'h-full' },
];

const recentActivity = [
  { icon: 'ri-building-2-line', iconColorClass: 'text-[#0097B2]', iconBgClass: 'bg-[#0097B2]/10', action: 'New organization created', org: 'Apex Legal Group', time: '12 min ago', admin: 'Sarah Chen' },
  { icon: 'ri-repeat-line', iconColorClass: 'text-[#00c896]', iconBgClass: 'bg-[#00c896]/10', action: 'Plan upgraded to Professional', org: 'Harrington & Co.', time: '1 hr ago', admin: 'Sarah Chen' },
  { icon: 'ri-bank-card-line', iconColorClass: 'text-[#d97706]', iconBgClass: 'bg-[#d97706]/10', action: 'Manual plan assigned (1 Year)', org: 'Coastal Insurance', time: '3 hr ago', admin: 'Sarah Chen' },
  { icon: 'ri-close-circle-line', iconColorClass: 'text-[#ef4444]', iconBgClass: 'bg-[#ef4444]/10', action: 'Organization deactivated', org: 'Redwood Partners', time: '5 hr ago', admin: 'Sarah Chen' },
  { icon: 'ri-edit-line', iconColorClass: 'text-[#16a34a]', iconBgClass: 'bg-[#16a34a]/10', action: 'Organization details updated', org: 'St. Mercy Health', time: '8 hr ago', admin: 'James Okafor' },
];

const topOrgs = [
  { name: 'Apex Legal Group', plan: 'Professional', revenue: '$4,200', status: 'Active', docs: '8,200 / 10,000' },
  { name: 'Harrington & Co.', plan: 'Enterprise', revenue: '$8,400', status: 'Active', docs: '42,100 / 50,000' },
  { name: 'Coastal Insurance', plan: 'Manual – 1 Year', revenue: '$1,800', status: 'Active', docs: '3,400 / 5,000' },
  { name: 'St. Mercy Health', plan: 'Subscription', revenue: '$3,600', status: 'Active', docs: '7,800 / 10,000' },
  { name: 'Westfield Estate', plan: 'Starter', revenue: '$588', status: 'Active', docs: '1,200 / 2,000' },
];

const planDistribution = [
  { label: 'Starter', count: 14, widthClass: 'w-[16.67%]', barColorClass: 'bg-[#0097B2]' },
  { label: 'Professional', count: 28, widthClass: 'w-[33.33%]', barColorClass: 'bg-[#00c896]' },
  { label: 'Enterprise', count: 6, widthClass: 'w-[7.14%]', barColorClass: 'bg-[#d97706]' },
  { label: 'Manual 3M', count: 12, widthClass: 'w-[14.29%]', barColorClass: 'bg-[#7c3aed]' },
  { label: 'Manual 6M', count: 18, widthClass: 'w-[21.43%]', barColorClass: 'bg-[#ec4899]' },
  { label: 'Manual 1Y', count: 6, widthClass: 'w-[7.14%]', barColorClass: 'bg-[#16a34a]' },
];

const topupStats = [
  { label: 'Top-Up Requests (Manual)', value: '23', icon: 'ri-file-add-line', iconColorClass: 'text-[#d97706]', iconBgClass: 'bg-[#d97706]/10' },
  { label: 'Top-Up Purchases (Sub)', value: '41', icon: 'ri-shopping-cart-line', iconColorClass: 'text-[#00c896]', iconBgClass: 'bg-[#00c896]/10' },
  { label: 'Top-Up Revenue', value: '$6,840', icon: 'ri-coins-line', iconColorClass: 'text-[#0097B2]', iconBgClass: 'bg-[#0097B2]/10' },
];

const totalPlanCount = planDistribution.reduce((a, p) => a + p.count, 0);

export default function SuperAdminDashboard() {
  const [activeChart, setActiveChart] = useState<'growth' | 'revenue'>('growth');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
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
        ))}
      </div>

      {/* Top-Up Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topupStats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBgClass}`}>
              <i className={`${s.icon} text-xl ${s.iconColorClass}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-brand-navy">{s.value}</div>
              <div className="text-xs text-brand-muted mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-outfit font-semibold text-brand-navy text-sm">Analytics</h2>
            <div className="flex gap-1 bg-brand-surface rounded-lg p-1">
              {(['growth', 'revenue'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveChart(tab)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    activeChart === tab ? 'bg-white text-brand-navy border border-brand-border' : 'text-brand-muted hover:text-brand-navy'
                  }`}
                >
                  {tab === 'growth' ? 'Org Growth' : 'Revenue'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-3 h-40">
            {(activeChart === 'growth' ? orgGrowth : revenueData).map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-brand-muted font-medium">{d.display}</span>
                <div className="w-full h-24 bg-brand-surface rounded-t-md overflow-hidden flex items-end">
                  <div className={`w-full bg-[#0097B2] rounded-t-md transition-all duration-500 ${d.barClass}`} />
                </div>
                <span className="text-[10px] text-brand-muted">{d.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-6">
            <div>
              <div className="text-xs text-brand-muted">Total Orgs</div>
              <div className="text-sm font-bold text-brand-navy">84</div>
            </div>
            <div>
              <div className="text-xs text-brand-muted">Growth Rate</div>
              <div className="text-sm font-bold text-[#16a34a]">+61.5%</div>
            </div>
            <div>
              <div className="text-xs text-brand-muted">Avg Revenue/Org</div>
              <div className="text-sm font-bold text-brand-navy">$457</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-brand-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-outfit font-semibold text-brand-navy text-sm">Recent Activity</h2>
            <Link href="/super-admin/activity-logs" className="text-xs text-[#0097B2] hover:underline">View all →</Link>
          </div>
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
        </div>
      </div>

      {/* Plan Distribution + Top Orgs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white rounded-xl border border-brand-border p-5">
          <h2 className="font-outfit font-semibold text-brand-navy text-sm mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {planDistribution.map((p) => (
              <div key={p.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-brand-body">{p.label}</span>
                  <span className="text-xs font-semibold text-brand-navy">{p.count}</span>
                </div>
                <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${p.widthClass} ${p.barColorClass}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border text-xs text-brand-muted">
            Total: <span className="font-semibold text-brand-navy">{totalPlanCount} organizations</span>
          </div>
        </div>

        {/* Top Organizations */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-brand-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-outfit font-semibold text-brand-navy text-sm">Top Organizations by Revenue</h2>
            <Link href="/super-admin/organizations" className="text-xs text-[#0097B2] hover:underline">View all →</Link>
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px]">
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#16a34a]/10 text-[#16a34a]">{o.status}</span>
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
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#16a34a]/10 text-[#16a34a]">{o.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-brand-muted">Plan</div>
                    <div className="text-brand-body font-medium">{o.plan}</div>
                  </div>
                  <div>
                    <div className="text-brand-muted">Revenue</div>
                    <div className="text-brand-navy font-semibold">{o.revenue}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-brand-muted">Doc Usage</div>
                    <div className="text-brand-body">{o.docs}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
