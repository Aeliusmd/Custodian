"use client";

import { useCallback, useEffect, useState } from 'react';

import CreateOrgModal from './CreateOrgModal/page';
import OrgDetailModal from './OrgDetailModal/page';
import { Organization } from './types';

const statusColors: Record<Organization['status'], string> = {
  Active: 'bg-[#16a34a]/10 text-[#16a34a]',
  Inactive: 'bg-red-100 text-red-500',
};

const planColors: Record<Organization['planType'], string> = {
  Manual: 'bg-[#d97706]/10 text-[#d97706]',
  Subscription: 'bg-[#0097B2]/10 text-[#0097B2]',
};

const summaryCards = [
  { label: 'Total', iconBgClass: 'bg-[#0097B2]/10', iconColorClass: 'text-[#0097B2]' },
  { label: 'Active', iconBgClass: 'bg-[#16a34a]/10', iconColorClass: 'text-[#16a34a]' },
  { label: 'Manual Plans', iconBgClass: 'bg-[#d97706]/10', iconColorClass: 'text-[#d97706]' },
  { label: 'Subscription', iconBgClass: 'bg-[#00c896]/10', iconColorClass: 'text-[#00c896]' },
] as const;

const getDocBarWidthClass = (pct: number) => {
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

const getDocBarColorClass = (pct: number) => {
  if (pct >= 90) return 'bg-[#ef4444]';
  if (pct >= 70) return 'bg-[#d97706]';
  return 'bg-[#16a34a]';
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [planFilter, setPlanFilter] = useState<'All' | 'Manual' | 'Subscription'>('All');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loadingEditOrgId, setLoadingEditOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

  const loadOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (planFilter !== 'All') params.set('planType', planFilter);
      const query = params.toString();
      const res = await fetch(`${API_BASE_URL}/super-admin/organizations${query ? `?${query}` : ''}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        let message = `Failed to load organizations (${res.status})`;
        try {
          const errBody = (await res.json()) as { message?: string };
          if (errBody?.message) {
            message = `${message}: ${errBody.message}`;
          }
        } catch {
          // Ignore body parse errors and keep status-only message.
        }
        throw new Error(message);
      }
      const data = (await res.json()) as Organization[];
      setOrgs(data);
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'Unknown error';
      setError(`Unable to load organizations from database. ${reason}`);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, planFilter, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrganizations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadOrganizations]);

  // Render DB-filtered results returned by backend.
  const filtered = orgs;

  const handleDeactivate = async (id: string) => {
    const target = orgs.find((org) => org.id === id);
    if (!target) return;
    const nextStatus = target.status === 'Active' ? 'Inactive' : 'Active';
    try {
      setActionLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/super-admin/organizations/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`Failed to update status (${res.status})`);
      await loadOrganizations();
      if (selectedOrg?.id === id) {
        setSelectedOrg((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
      setDeleteConfirm(null);
    } catch {
      setError('Failed to update organization status. Please check backend auth/session and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/super-admin/organizations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to delete organization (${res.status})`);
      setOrgs((prev) => prev.filter((org) => org.id !== id));
      if (selectedOrg?.id === id) setSelectedOrg(null);
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete organization. Please check backend auth/session and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOrg = async (nextOrg: Organization) => {
    try {
      setActionLoading(true);
      setError('');
      if (editOrg) {
        const updateRes = await fetch(`${API_BASE_URL}/super-admin/organizations/${nextOrg.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextOrg),
        });
        if (!updateRes.ok) {
          let message = `Failed to update organization (${updateRes.status})`;
          try {
            const data = (await updateRes.json()) as { message?: string };
            if (data?.message) message = `${message}: ${data.message}`;
          } catch {
            // Keep status-only message
          }
          throw new Error(message);
        }

        if (nextOrg.status !== editOrg.status) {
          const statusRes = await fetch(`${API_BASE_URL}/super-admin/organizations/${nextOrg.id}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: nextOrg.status }),
          });
          if (!statusRes.ok) {
            let message = `Failed to update organization status (${statusRes.status})`;
            try {
              const data = (await statusRes.json()) as { message?: string };
              if (data?.message) message = `${message}: ${data.message}`;
            } catch {
              // Keep status-only message
            }
            throw new Error(message);
          }
        }
      } else {
        const createRes = await fetch(`${API_BASE_URL}/super-admin/organizations`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextOrg),
        });
        if (!createRes.ok) {
          let message = `Failed to create organization (${createRes.status})`;
          try {
            const data = (await createRes.json()) as { message?: string };
            if (data?.message) message = `${message}: ${data.message}`;
          } catch {
            // Keep status-only message
          }
          throw new Error(message);
        }
      }
      await loadOrganizations();
      setShowCreate(false);
      setEditOrg(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save organization';
      setError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditOrganization = async (org: Organization) => {
    try {
      setActionLoading(true);
      setLoadingEditOrgId(org.id);
      setError('');
      const res = await fetch(`${API_BASE_URL}/super-admin/organizations/${org.id}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        let message = `Failed to load organization details (${res.status})`;
        try {
          const data = (await res.json()) as { message?: string };
          if (data?.message) message = `${message}: ${data.message}`;
        } catch {
          // Ignore parse errors; keep status message.
        }
        throw new Error(message);
      }
      const fullOrg = (await res.json()) as Organization;
      setEditOrg(fullOrg);
      setShowCreate(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load organization details';
      setError(message);
    } finally {
      setActionLoading(false);
      setLoadingEditOrgId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-brand-navy">Organizations</h1>
          <p className="text-brand-muted text-sm mt-0.5">{orgs.length} total organizations</p>
        </div>
        <button
          disabled={actionLoading}
          onClick={() => { setEditOrg(null); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap disabled:opacity-60"
        >
          <i className="ri-add-line" />
          Create Organization
        </button>
      </div>
      {error && (
        <div className="rounded-lg border border-[#d97706]/30 bg-[#d97706]/10 px-3 py-2 text-xs text-[#92400e]">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBgClass}`}>
              <i className={`ri-building-2-line text-base ${card.iconColorClass}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-brand-navy">
                {card.label === 'Total'
                  ? orgs.length
                  : card.label === 'Active'
                    ? orgs.filter((org) => org.status === 'Active').length
                    : card.label === 'Manual Plans'
                      ? orgs.filter((org) => org.planType === 'Manual').length
                      : orgs.filter((org) => org.planType === 'Subscription').length}
              </div>
              <div className="text-xs text-brand-muted">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-brand-border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none transition-colors" />
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          {(['All', 'Active', 'Inactive'] as const).map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${statusFilter === status ? 'bg-[#0097B2] text-white' : 'bg-brand-surface text-brand-muted hover:text-brand-navy border border-brand-border'}`}>
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          {(['All', 'Manual', 'Subscription'] as const).map((planType) => (
            <button key={planType} onClick={() => setPlanFilter(planType)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${planFilter === planType ? 'bg-[#0097B2] text-white' : 'bg-brand-surface text-brand-muted hover:text-brand-navy border border-brand-border'}`}>
              {planType}
            </button>
          ))}
        </div>
        <span className="text-xs text-brand-muted sm:ml-auto">{loading ? 'Loading...' : `${filtered.length} results`}</span>
      </div>

      <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-brand-surface">
              <tr>
                {['Organization', 'Email', 'Admins', 'Created', 'Status', 'Plan Type', 'Plan Expiry', 'Doc Usage', 'Actions'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wide whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map((org) => {
                const docPct = Math.round((org.docUsed / Math.max(org.docTotal, 1)) * 100);
                return (
                  <tr key={org.id} className="hover:bg-brand-surface/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0097B2]/10">
                          <i className="ri-building-2-line text-sm text-[#0097B2]" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-brand-navy">{org.name}</div>
                          <div className="text-xs text-brand-muted">{org.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-brand-body">{org.email}</td>
                    <td className="px-4 py-3.5 text-sm text-brand-navy">{org.adminCount}</td>
                    <td className="px-4 py-3.5 text-sm text-brand-body whitespace-nowrap">{org.createdDate}</td>
                    <td className="px-4 py-3.5"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[org.status]}`}>{org.status}</span></td>
                    <td className="px-4 py-3.5"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${planColors[org.planType]}`}>{org.planType}</span></td>
                    <td className="px-4 py-3.5 text-sm text-brand-body whitespace-nowrap">{org.planExpiry}</td>
                    <td className="px-4 py-3.5">
                      <div className="min-w-[80px]">
                        <div className="text-[10px] text-brand-muted mb-1">{docPct}%</div>
                        <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden w-20">
                          <div className={`h-full rounded-full ${getDocBarWidthClass(docPct)} ${getDocBarColorClass(docPct)}`} />
                        </div>
                        <div className="text-[10px] text-brand-muted mt-0.5">{org.docUsed.toLocaleString()} / {org.docTotal.toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button title="View details" onClick={() => setSelectedOrg(org)} className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-[#0097B2] hover:bg-[#0097B2]/10 transition-all"><i className="ri-eye-line text-sm" /></button>
                        <button
                          title="Edit organization"
                          disabled={actionLoading}
                          onClick={() => { void handleEditOrganization(org); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-[#d97706] hover:bg-[#d97706]/10 transition-all disabled:opacity-60"
                        >
                          <i className={`${loadingEditOrgId === org.id ? 'ri-loader-4-line animate-spin' : 'ri-edit-line'} text-sm`} />
                        </button>
                        <button title="Deactivate or delete" onClick={() => setDeleteConfirm(org.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"><i className="ri-delete-bin-line text-sm" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-brand-border">
          {filtered.map((org) => {
            const docPct = Math.round((org.docUsed / Math.max(org.docTotal, 1)) * 100);
            return (
              <div key={org.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#0097B2]/10">
                      <i className="ri-building-2-line text-sm text-[#0097B2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-brand-navy truncate">{org.name}</div>
                      <div className="text-xs text-brand-muted truncate">{org.email}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[org.status]}`}>{org.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-brand-muted">Admins</div>
                    <div className="text-brand-navy font-medium">{org.adminCount}</div>
                  </div>
                  <div>
                    <div className="text-brand-muted">Created</div>
                    <div className="text-brand-body">{org.createdDate}</div>
                  </div>
                  <div>
                    <div className="text-brand-muted">Plan Type</div>
                    <span className={`inline-flex mt-0.5 text-xs px-2.5 py-1 rounded-full font-medium ${planColors[org.planType]}`}>{org.planType}</span>
                  </div>
                  <div>
                    <div className="text-brand-muted">Plan Expiry</div>
                    <div className="text-brand-body">{org.planExpiry}</div>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-brand-muted mb-1">Doc Usage {docPct}%</div>
                  <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden w-full">
                    <div className={`h-full rounded-full ${getDocBarWidthClass(docPct)} ${getDocBarColorClass(docPct)}`} />
                  </div>
                  <div className="text-[10px] text-brand-muted mt-1">{org.docUsed.toLocaleString()} / {org.docTotal.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button title="View details" onClick={() => setSelectedOrg(org)} className="h-8 px-3 flex items-center justify-center rounded-lg text-xs border border-brand-border text-brand-muted hover:text-[#0097B2] hover:bg-[#0097B2]/10 transition-all"><i className="ri-eye-line text-sm mr-1" />View</button>
                  <button
                    title="Edit organization"
                    disabled={actionLoading}
                    onClick={() => { void handleEditOrganization(org); }}
                    className="h-8 px-3 flex items-center justify-center rounded-lg text-xs border border-brand-border text-brand-muted hover:text-[#d97706] hover:bg-[#d97706]/10 transition-all disabled:opacity-60"
                  >
                    <i className={`${loadingEditOrgId === org.id ? 'ri-loader-4-line animate-spin' : 'ri-edit-line'} text-sm mr-1`} />
                    Edit
                  </button>
                  <button title="Deactivate or delete" onClick={() => setDeleteConfirm(org.id)} className="h-8 px-3 flex items-center justify-center rounded-lg text-xs border border-brand-border text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"><i className="ri-delete-bin-line text-sm mr-1" />Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedOrg && <OrgDetailModal org={selectedOrg} onClose={() => setSelectedOrg(null)} />}
      {showCreate && <CreateOrgModal org={editOrg} onClose={() => { setShowCreate(false); setEditOrg(null); }} onSave={handleSaveOrg} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center"><i className="ri-delete-bin-line text-2xl text-red-500" /></div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-brand-navy mb-1">Manage Organization</h3>
              <p className="text-sm text-brand-muted">Choose an action for this organization.</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                disabled={actionLoading}
                onClick={() => handleDeactivate(deleteConfirm)}
                className="w-full px-4 py-2.5 rounded-lg bg-[#d97706] text-white text-sm font-medium hover:bg-[#b45309] transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {orgs.find((o) => o.id === deleteConfirm)?.status === 'Active' ? 'Deactivate Organization' : 'Activate Organization'}
              </button>
              <button disabled={actionLoading} onClick={() => handleDelete(deleteConfirm)} className="w-full px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap disabled:opacity-60">Delete Permanently</button>
              <button disabled={actionLoading} onClick={() => setDeleteConfirm(null)} className="w-full px-4 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap disabled:opacity-60">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
