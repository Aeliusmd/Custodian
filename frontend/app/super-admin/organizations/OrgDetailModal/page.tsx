"use client";

import type { Organization } from '../types';

type OrgDetailModalProps = {
  org?: Organization;
  onClose?: () => void;
};

const statusColors: Record<Organization['status'], string> = {
  Active: 'bg-[#16a34a]/10 text-[#16a34a]',
  Inactive: 'bg-red-100 text-red-500',
};

const billingStatusColors: Record<string, string> = {
  Paid: 'bg-[#16a34a]/10 text-[#16a34a]',
  Failed: 'bg-red-100 text-red-500',
  Pending: 'bg-[#d97706]/10 text-[#d97706]',
};

const docWidthClass = (pct: number) => {
  if (pct <= 10) return 'w-[10%]';
  if (pct <= 20) return 'w-[20%]';
  if (pct <= 30) return 'w-[30%]';
  if (pct <= 40) return 'w-[40%]';
  if (pct <= 50) return 'w-1/2';
  if (pct <= 60) return 'w-[60%]';
  if (pct <= 70) return 'w-[70%]';
  if (pct <= 80) return 'w-[80%]';
  if (pct <= 90) return 'w-[90%]';
  return 'w-full';
};

const docColorClass = (pct: number) => {
  if (pct >= 90) return 'bg-[#ef4444] text-[#ef4444]';
  if (pct >= 70) return 'bg-[#d97706] text-[#d97706]';
  return 'bg-[#00c896] text-[#00c896]';
};

export default function OrgDetailModal({ org, onClose }: OrgDetailModalProps) {
  if (!org || !onClose) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8f9fb]">
        <div className="bg-white border border-brand-border rounded-xl p-6 max-w-md w-full text-center">
          <h1 className="font-outfit font-semibold text-brand-navy text-lg">Organization Details</h1>
          <p className="text-sm text-brand-muted mt-2">
            This view is a modal component and should be opened from the Organizations page.
          </p>
        </div>
      </div>
    );
  }

  const docPct = Math.round((org.docUsed / org.docTotal) * 100);
  const usageColor = docColorClass(docPct);
  const usageTextColor = usageColor.split(' ')[1];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl mx-3 sm:mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-brand-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0097B2]/10">
              <i className="ri-building-2-line text-lg text-[#0097B2]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-outfit font-bold text-brand-navy text-base truncate">{org.name}</h2>
              <p className="text-xs text-brand-muted truncate">{org.id} · {org.industry}</p>
            </div>
          </div>
          <button title="Close details" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-navy hover:bg-brand-surface transition-all">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-3">Organization Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Email', value: org.email, icon: 'ri-mail-line' },
                { label: 'Phone', value: org.phone, icon: 'ri-phone-line' },
                { label: 'Industry', value: org.industry, icon: 'ri-briefcase-line' },
                { label: 'Created Date', value: org.createdDate, icon: 'ri-calendar-line' },
                { label: 'Address', value: org.address, icon: 'ri-map-pin-line' },
                { label: 'Status', value: org.status, icon: 'ri-checkbox-circle-line', isStatus: true },
              ].map((f) => (
                <div key={f.label} className="flex items-start gap-3 p-3 bg-brand-surface rounded-lg">
                  <div className="w-7 h-7 flex items-center justify-center text-brand-muted flex-shrink-0">
                    <i className={`${f.icon} text-sm`} />
                  </div>
                  <div>
                    <div className="text-[10px] text-brand-muted uppercase tracking-wide">{f.label}</div>
                    {f.isStatus ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${statusColors[f.value as Organization['status']]}`}>
                        {f.value}
                      </span>
                    ) : (
                      <div className="text-sm text-brand-navy font-medium mt-0.5">{f.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-3">Assigned Plan</h3>
            <div className="bg-brand-surface rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0097B2]/10">
                <i className="ri-vip-crown-line text-xl text-[#0097B2]" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-brand-navy">{org.planName}</div>
                <div className="text-xs text-brand-muted mt-0.5">{org.planType} Plan · Expires {org.planExpiry}</div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${org.planType === 'Subscription' ? 'bg-[#0097B2]/10 text-[#0097B2]' : 'bg-[#d97706]/10 text-[#d97706]'}`}>
                {org.planType}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-3">Document Usage</h3>
            <div className="bg-brand-surface rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-brand-navy">Pages Used</span>
                <span className="text-sm font-bold text-brand-navy">{org.docUsed.toLocaleString()} / {org.docTotal.toLocaleString()}</span>
              </div>
              <div className="h-2.5 bg-white rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${docWidthClass(docPct)} ${usageColor.split(' ')[0]}`} />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-brand-muted">{org.docTotal - org.docUsed} pages remaining</span>
                <span className={`text-xs font-semibold ${usageTextColor}`}>{docPct}% used</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-3">Organization Admins</h3>
            <div className="rounded-xl border border-brand-border overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-brand-surface">
                    <tr>
                      {['Admin', 'Email', 'Role', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {org.admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-brand-surface/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#0097B2]/10">
                              <span className="text-[10px] font-bold text-[#0097B2]">{admin.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                            </div>
                            <span className="text-sm font-medium text-brand-navy">{admin.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-brand-body">{admin.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#0097B2]/10 text-[#0097B2]">{admin.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[admin.status]}`}>{admin.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-brand-border">
                {org.admins.map((admin) => (
                  <div key={admin.id} className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#0097B2]/10">
                        <span className="text-[10px] font-bold text-[#0097B2]">{admin.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-brand-navy truncate">{admin.name}</div>
                        <div className="text-xs text-brand-muted truncate">{admin.email}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#0097B2]/10 text-[#0097B2]">{admin.role}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[admin.status]}`}>{admin.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-3">Billing History</h3>
            <div className="rounded-xl border border-brand-border overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-brand-surface">
                    <tr>
                      {['Date', 'Description', 'Amount', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {org.billingHistory.map((entry, idx) => (
                      <tr key={`${entry.date}-${idx}`} className="hover:bg-brand-surface/50">
                        <td className="px-4 py-3 text-sm text-brand-body whitespace-nowrap">{entry.date}</td>
                        <td className="px-4 py-3 text-sm text-brand-body">{entry.description}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-brand-navy">{entry.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${billingStatusColors[entry.status]}`}>{entry.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-brand-border">
                {org.billingHistory.map((entry, idx) => (
                  <div key={`${entry.date}-${idx}`} className="p-4 space-y-2">
                    <div className="text-xs text-brand-muted">{entry.date}</div>
                    <div className="text-sm text-brand-navy font-medium">{entry.description}</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-brand-navy">{entry.amount}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${billingStatusColors[entry.status]}`}>{entry.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-border">
          <button onClick={onClose} className="w-full sm:w-auto px-5 py-2 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Close</button>
        </div>
      </div>
    </div>
  );
}
