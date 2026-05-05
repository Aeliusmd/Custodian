"use client";

import { useEffect, useState } from 'react';

import type { OrgAdmin, Organization } from '../types';

type CreateOrgModalProps = {
  org: Organization | null;
  onClose: () => void;
  onSave: (org: Organization) => void;
};

type AdminEntry = {
  id: string;
  name: string;
  email: string;
};

const industries = ['Legal Services', 'Finance', 'Healthcare', 'Insurance', 'Real Estate', 'Technology', 'Consulting', 'Education', 'Other'];
const planTypes = ['Manual', 'Subscription'] as const;
const manualPlans = ['3 Month Plan', '6 Month Plan', '1 Year Plan'];
const subPlans = ['Starter', 'Professional', 'Enterprise'];

const emptyAdmin = (): AdminEntry => ({
  id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: '',
  email: '',
});

export default function CreateOrgModal({ org, onClose, onSave }: CreateOrgModalProps) {
  const isEdit = !!org;
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    industry: 'Legal Services',
    planType: 'Subscription' as 'Manual' | 'Subscription',
    planName: 'Professional',
    planExpiry: '',
    status: 'Active' as 'Active' | 'Inactive',
  });
  const [admins, setAdmins] = useState<AdminEntry[]>([emptyAdmin()]);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    if (!org) {
      return;
    }

    setForm({
      name: org.name,
      email: org.email,
      phone: org.phone,
      address: org.address,
      industry: org.industry,
      planType: org.planType,
      planName: org.planName,
      planExpiry: org.planExpiry,
      status: org.status,
    });

    if (org.admins.length > 0) {
      setAdmins(org.admins.map((admin) => ({ id: admin.id, name: admin.name, email: admin.email })));
    }
  }, [org]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdminChange = (id: string, field: 'name' | 'email', value: string) => {
    setAdmins((prev) => prev.map((admin) => (admin.id === id ? { ...admin, [field]: value } : admin)));
    setAdminError('');
  };

  const addAdmin = () => {
    setAdmins((prev) => [...prev, emptyAdmin()]);
  };

  const removeAdmin = (id: string) => {
    if (admins.length === 1) {
      setAdminError('At least one admin is required.');
      return;
    }
    setAdmins((prev) => prev.filter((admin) => admin.id !== id));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const filledAdmins = admins.filter((admin) => admin.name.trim() && admin.email.trim());
    if (filledAdmins.length === 0) {
      setAdminError('Please add at least one admin with name and email.');
      return;
    }

    const builtAdmins: OrgAdmin[] = filledAdmins.map((admin) => ({
      id: admin.id.startsWith('tmp-') ? `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` : admin.id,
      name: admin.name.trim(),
      email: admin.email.trim(),
      role: 'Admin',
      status: 'Active',
    }));

    const nextOrg: Organization = {
      id: org?.id ?? `ORG-${String(Date.now()).slice(-4)}`,
      createdDate: org?.createdDate ?? new Date().toISOString().split('T')[0],
      billingHistory: org?.billingHistory ?? [],
      docUsed: org?.docUsed ?? 0,
      docTotal: org?.docTotal ?? 5000,
      admins: builtAdmins,
      adminCount: builtAdmins.length,
      ...form,
    };

    onSave(nextOrg);
  };

  const planOptions = form.planType === 'Manual' ? manualPlans : subPlans;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-xl mx-3 sm:mx-4 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-brand-border flex-shrink-0">
          <div>
            <h2 className="font-outfit font-bold text-brand-navy text-base">{isEdit ? 'Edit Organization' : 'Create Organization'}</h2>
            <p className="text-xs text-brand-muted mt-0.5">{isEdit ? 'Update organization details and admins' : 'Fill in details and assign admins'}</p>
          </div>
          <button title="Close create organization modal" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-navy hover:bg-brand-surface transition-all">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          <div>
            <h3 className="text-[11px] font-semibold text-brand-muted uppercase tracking-widest mb-3">Organization Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Organization Name *</label>
                <input required type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors" placeholder="e.g. Apex Legal Group" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Organization Email *</label>
                <input required type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors" placeholder="org@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors" placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Industry</label>
                <select title="Industry" value={form.industry} onChange={(e) => handleChange('industry', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors bg-white">
                  {industries.map((industry) => <option key={industry}>{industry}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Status</label>
                <select title="Organization status" value={form.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors bg-white">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Address</label>
                <input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors" placeholder="Street, City, State, ZIP" />
              </div>
            </div>
          </div>

          <div className="border-t border-brand-border pt-5">
            <h3 className="text-[11px] font-semibold text-brand-muted uppercase tracking-widest mb-3">Plan Assignment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Plan Type</label>
                <div className="flex gap-2">
                  {planTypes.map((planType) => (
                    <button
                      key={planType}
                      type="button"
                      onClick={() => {
                        handleChange('planType', planType);
                        handleChange('planName', planType === 'Manual' ? manualPlans[0] : subPlans[0]);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${form.planType === planType ? 'bg-[#0097B2] text-white border-[#0097B2]' : 'border-brand-border text-brand-muted hover:text-brand-navy'}`}
                    >
                      {planType}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Plan Name</label>
                <select title="Plan name" value={form.planName} onChange={(e) => handleChange('planName', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors bg-white">
                  {planOptions.map((plan) => <option key={plan}>{plan}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Plan Expiry Date</label>
                <input title="Plan expiry date" type="date" value={form.planExpiry} onChange={(e) => handleChange('planExpiry', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors" />
              </div>
            </div>
          </div>

          <div className="border-t border-brand-border pt-5">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="text-[11px] font-semibold text-brand-muted uppercase tracking-widest">Admins</h3>
                <p className="text-[11px] text-brand-muted mt-0.5">Add one or more admins for this organization</p>
              </div>
              <button type="button" onClick={addAdmin} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0097B2]/10 text-[#0097B2] text-xs font-medium hover:bg-[#0097B2]/20 transition-colors whitespace-nowrap">
                <i className="ri-user-add-line text-sm" />
                Add Admin
              </button>
            </div>

            {adminError && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                <i className="ri-error-warning-line" />
                {adminError}
              </div>
            )}

            <div className="space-y-3">
              {admins.map((admin, idx) => (
                <div key={admin.id} className="flex flex-col sm:flex-row items-start gap-3 p-3 bg-brand-surface rounded-xl border border-brand-border">
                  <div className="w-7 h-7 rounded-full bg-[#0097B2]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-[#0097B2]">{idx + 1}</span>
                  </div>
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-brand-muted mb-1">Full Name *</label>
                      <input title="Admin full name" type="text" value={admin.name} onChange={(e) => handleAdminChange(admin.id, 'name', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body bg-white focus:outline-none focus:border-[#0097B2] transition-colors" placeholder="e.g. John Carter" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-brand-muted mb-1">Email Address *</label>
                      <input title="Admin email" type="email" value={admin.email} onChange={(e) => handleAdminChange(admin.id, 'email', e.target.value)} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm text-brand-body bg-white focus:outline-none focus:border-[#0097B2] transition-colors" placeholder="admin@org.com" />
                    </div>
                  </div>
                  <button type="button" title="Remove admin" onClick={() => removeAdmin(admin.id)} className="w-full sm:w-7 h-8 sm:h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0 mt-0 sm:mt-0.5 border border-brand-border sm:border-0">
                    <i className="ri-delete-bin-line text-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="px-4 sm:px-6 py-4 border-t border-brand-border flex flex-col-reverse sm:flex-row gap-3 sm:justify-end flex-shrink-0">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
          <button type="submit" onClick={handleSubmit} className="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#0097B2] text-white text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">{isEdit ? 'Save Changes' : 'Create Organization'}</button>
        </div>
      </div>
    </div>
  );
}
