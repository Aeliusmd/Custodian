"use client";

import { useState } from 'react';

interface ManualPlan {
  id: string;
  name: string;
  duration: '3 Months' | '6 Months' | '1 Year';
  price: number;
  pageCount: number;
  orgsCount: number;
}

interface SubPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  monthlyPageLimit: number;
  features: string[];
  orgsCount: number;
}

interface TopUpPlan {
  id: string;
  name: string;
  pages: number;
  price: number;
  usageCount: number;
}

const initManualPlans: ManualPlan[] = [
  { id: 'mp-1', name: 'Basic Quarterly', duration: '3 Months', price: 450, pageCount: 3000, orgsCount: 12 },
  { id: 'mp-2', name: 'Standard Semi-Annual', duration: '6 Months', price: 900, pageCount: 5000, orgsCount: 18 },
  { id: 'mp-3', name: 'Premium Annual', duration: '1 Year', price: 1800, pageCount: 10000, orgsCount: 6 },
];

const initSubPlans: SubPlan[] = [
  {
    id: 'sp-1', name: 'Starter', monthlyPrice: 49, monthlyPageLimit: 2000,
    features: ['Up to 5 users', '2,000 doc pages/mo', 'Basic reporting', 'Email support'],
    orgsCount: 14,
  },
  {
    id: 'sp-2', name: 'Professional', monthlyPrice: 149, monthlyPageLimit: 10000,
    features: ['Up to 25 users', '10,000 doc pages/mo', 'Advanced analytics', 'Priority support', 'API access'],
    orgsCount: 28,
  },
  {
    id: 'sp-3', name: 'Enterprise', monthlyPrice: 699, monthlyPageLimit: 50000,
    features: ['Unlimited users', '50,000 doc pages/mo', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'White-label'],
    orgsCount: 6,
  },
];

const initTopUpPlans: TopUpPlan[] = [
  { id: 'tu-1', name: 'Small Top-Up', pages: 500, price: 25, usageCount: 18 },
  { id: 'tu-2', name: 'Medium Top-Up', pages: 2000, price: 80, usageCount: 31 },
  { id: 'tu-3', name: 'Large Top-Up', pages: 5000, price: 180, usageCount: 12 },
  { id: 'tu-4', name: 'Bulk Top-Up', pages: 10000, price: 320, usageCount: 5 },
];

const durationColors: Record<string, string> = {
  '3 Months': `bg-[#0097B2]/10 text-[#0097B2]`,
  '6 Months': 'bg-[#7c3aed]/10 text-[#7c3aed]',
  '1 Year': 'bg-[#16a34a]/10 text-[#16a34a]',
};

const summaryCards = [
  {
    label: 'Manual Plans',
    value: (count: number) => String(count),
    icon: 'ri-file-list-3-line',
    iconBgClass: 'bg-[#d97706]/10',
    iconColorClass: 'text-[#d97706]',
  },
  {
    label: 'Subscription Plans',
    value: (count: number) => String(count),
    icon: 'ri-repeat-line',
    iconBgClass: 'bg-[#0097B2]/10',
    iconColorClass: 'text-[#0097B2]',
  },
  {
    label: 'Top-Up Plans',
    value: (count: number) => String(count),
    icon: 'ri-add-circle-line',
    iconBgClass: 'bg-[#00c896]/10',
    iconColorClass: 'text-[#00c896]',
  },
  {
    label: 'Total Top-Up Sales',
    value: (count: number) => String(count),
    icon: 'ri-shopping-cart-line',
    iconBgClass: 'bg-[#7c3aed]/10',
    iconColorClass: 'text-[#7c3aed]',
  },
] as const;

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'manual' | 'subscription' | 'topup'>('manual');
  const [manualPlans, setManualPlans] = useState<ManualPlan[]>(initManualPlans);
  const [subPlans, setSubPlans] = useState<SubPlan[]>(initSubPlans);
  const [topUpPlans, setTopUpPlans] = useState<TopUpPlan[]>(initTopUpPlans);

  // Manual plan modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [editManual, setEditManual] = useState<ManualPlan | null>(null);
  const [manualForm, setManualForm] = useState({ name: '', duration: '3 Months' as ManualPlan['duration'], price: '', pageCount: '' });

  // Sub plan modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [editSub, setEditSub] = useState<SubPlan | null>(null);
  const [subForm, setSubForm] = useState({ name: '', monthlyPrice: '', monthlyPageLimit: '', features: '' });

  // Top-up modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [editTopUp, setEditTopUp] = useState<TopUpPlan | null>(null);
  const [topUpForm, setTopUpForm] = useState({ name: '', pages: '', price: '' });

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'manual' | 'sub' | 'topup'; id: string } | null>(null);

  const openManualCreate = () => { setEditManual(null); setManualForm({ name: '', duration: '3 Months', price: '', pageCount: '' }); setShowManualModal(true); };
  const openManualEdit = (p: ManualPlan) => { setEditManual(p); setManualForm({ name: p.name, duration: p.duration, price: String(p.price), pageCount: String(p.pageCount) }); setShowManualModal(true); };
  const saveManual = () => {
    if (!manualForm.name || !manualForm.price) return;
    if (editManual) {
      setManualPlans((prev) => prev.map((p) => p.id === editManual.id ? { ...p, ...manualForm, price: Number(manualForm.price), pageCount: Number(manualForm.pageCount) } : p));
    } else {
      setManualPlans((prev) => [...prev, { id: `mp-${Date.now()}`, ...manualForm, price: Number(manualForm.price), pageCount: Number(manualForm.pageCount), orgsCount: 0 }]);
    }
    setShowManualModal(false);
  };

  const openSubCreate = () => { setEditSub(null); setSubForm({ name: '', monthlyPrice: '', monthlyPageLimit: '', features: '' }); setShowSubModal(true); };
  const openSubEdit = (p: SubPlan) => { setEditSub(p); setSubForm({ name: p.name, monthlyPrice: String(p.monthlyPrice), monthlyPageLimit: String(p.monthlyPageLimit), features: p.features.join(', ') }); setShowSubModal(true); };
  const saveSub = () => {
    if (!subForm.name || !subForm.monthlyPrice) return;
    const features = subForm.features.split(',').map((f) => f.trim()).filter(Boolean);
    if (editSub) {
      setSubPlans((prev) => prev.map((p) => p.id === editSub.id ? { ...p, name: subForm.name, monthlyPrice: Number(subForm.monthlyPrice), monthlyPageLimit: Number(subForm.monthlyPageLimit), features } : p));
    } else {
      setSubPlans((prev) => [...prev, { id: `sp-${Date.now()}`, name: subForm.name, monthlyPrice: Number(subForm.monthlyPrice), monthlyPageLimit: Number(subForm.monthlyPageLimit), features, orgsCount: 0 }]);
    }
    setShowSubModal(false);
  };

  const openTopUpCreate = () => { setEditTopUp(null); setTopUpForm({ name: '', pages: '', price: '' }); setShowTopUpModal(true); };
  const openTopUpEdit = (p: TopUpPlan) => { setEditTopUp(p); setTopUpForm({ name: p.name, pages: String(p.pages), price: String(p.price) }); setShowTopUpModal(true); };
  const saveTopUp = () => {
    if (!topUpForm.name || !topUpForm.pages || !topUpForm.price) return;
    if (editTopUp) {
      setTopUpPlans((prev) => prev.map((p) => p.id === editTopUp.id ? { ...p, name: topUpForm.name, pages: Number(topUpForm.pages), price: Number(topUpForm.price) } : p));
    } else {
      setTopUpPlans((prev) => [...prev, { id: `tu-${Date.now()}`, name: topUpForm.name, pages: Number(topUpForm.pages), price: Number(topUpForm.price), usageCount: 0 }]);
    }
    setShowTopUpModal(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'manual') setManualPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    else if (deleteTarget.type === 'sub') setSubPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    else setTopUpPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const tabs = [
    { key: 'manual', label: 'Manual Plans', icon: 'ri-file-list-3-line' },
    { key: 'subscription', label: 'Subscription Plans', icon: 'ri-repeat-line' },
    { key: 'topup', label: 'Top-Up Plans', icon: 'ri-add-circle-line' },
  ] as const;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="font-outfit font-bold text-2xl text-brand-navy">Billing Management</h1>
        <p className="text-brand-muted text-sm mt-0.5">Manage manual, subscription, and top-up plans for organizations</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((k, index) => (
          <div key={k.label} className="bg-white rounded-xl border border-brand-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-brand-muted">{k.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.iconBgClass}`}>
                <i className={`${k.icon} text-sm ${k.iconColorClass}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-brand-navy">
              {k.value(index === 0 ? manualPlans.length : index === 1 ? subPlans.length : index === 2 ? topUpPlans.length : topUpPlans.reduce((a, p) => a + p.usageCount, 0))}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
        <div className="flex border-b border-brand-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key ? 'border-[#0097B2] text-[#0097B2]' : 'border-transparent text-brand-muted hover:text-brand-navy'
              }`}
            >
              <i className={tab.icon} />
              {tab.label}
              {tab.key === 'topup' && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-[#00c896]">NEW</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Manual Plans */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-brand-muted">Duration-based plans assigned manually to organizations.</p>
                <button onClick={openManualCreate} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">
                  <i className="ri-add-line" />Add Manual Plan
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {manualPlans.map((plan) => (
                  <div key={plan.id} className="border border-brand-border rounded-xl p-5 hover:border-[#0097B2]/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${durationColors[plan.duration]}`}>{plan.duration}</span>
                      <div className="flex gap-1">
                        <button onClick={() => openManualEdit(plan)} title={`Edit ${plan.name}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-[#d97706] hover:bg-[#d97706]/10 transition-all"><i className="ri-edit-line text-sm" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'manual', id: plan.id })} title={`Delete ${plan.name}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"><i className="ri-delete-bin-line text-sm" /></button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-brand-navy mb-1">{plan.name}</h3>
                    <div className="text-2xl font-bold text-brand-navy mb-1">${plan.price.toLocaleString()}</div>
                    <div className="text-xs text-brand-muted">one-time · {plan.duration}</div>
                    <div className="mt-3 pt-3 border-t border-brand-border space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-brand-body">
                        <i className="ri-file-text-line text-sm text-[#0097B2]" />
                        <span>{plan.pageCount.toLocaleString()} document pages</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-brand-muted">
                        <i className="ri-building-2-line text-sm" />
                        <span>{plan.orgsCount} organizations</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscription Plans */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-brand-muted">Monthly recurring subscription plans.</p>
                <button onClick={openSubCreate} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">
                  <i className="ri-add-line" />Add Subscription Plan
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {subPlans.map((plan) => (
                  <div key={plan.id} className="border border-brand-border rounded-xl p-5 hover:border-[#0097B2]/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0097B2]/10">
                        <i className="ri-vip-crown-line text-[#0097B2]" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openSubEdit(plan)} title={`Edit ${plan.name}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-[#d97706] hover:bg-[#d97706]/10 transition-all"><i className="ri-edit-line text-sm" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'sub', id: plan.id })} title={`Delete ${plan.name}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"><i className="ri-delete-bin-line text-sm" /></button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-brand-navy mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl font-bold text-brand-navy">${plan.monthlyPrice}</span>
                      <span className="text-xs text-brand-muted">/month</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-[#0097B2]">
                      <i className="ri-file-text-line" />
                      {plan.monthlyPageLimit.toLocaleString()} pages/month
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-brand-body">
                          <i className="ri-check-line text-sm text-[#00c896]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-3 border-t border-brand-border flex items-center gap-2">
                      <i className="ri-building-2-line text-brand-muted text-sm" />
                      <span className="text-xs text-brand-muted">{plan.orgsCount} organizations</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top-Up Plans */}
          {activeTab === 'topup' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-brand-muted">Top-up plans are used when an organization exceeds its document page limit.</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-xs bg-[#0097B2]/5 border border-[#0097B2]/20 rounded-lg px-3 py-2">
                      <i className="ri-building-2-line text-[#0097B2]" />
                      <span className="text-brand-body"><strong>Manual Plan orgs:</strong> Contact Super Admin → Admin assigns top-up manually</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-[#00c896]/5 border border-[#00c896]/20 rounded-lg px-3 py-2">
                      <i className="ri-shopping-cart-line text-[#00c896]" />
                      <span className="text-brand-body"><strong>Subscription orgs:</strong> Can purchase top-up directly via system</span>
                    </div>
                  </div>
                </div>
                <button onClick={openTopUpCreate} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap flex-shrink-0">
                  <i className="ri-add-line" />Create Top-Up Plan
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {topUpPlans.map((plan) => (
                  <div key={plan.id} className="border border-brand-border rounded-xl p-5 hover:border-[#00c896]/40 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00c896]/10">
                        <i className="ri-file-add-line text-lg text-[#00c896]" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openTopUpEdit(plan)} title={`Edit ${plan.name}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-[#d97706] hover:bg-[#d97706]/10 transition-all"><i className="ri-edit-line text-sm" /></button>
                        <button onClick={() => setDeleteTarget({ type: 'topup', id: plan.id })} title={`Delete ${plan.name}`} className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"><i className="ri-delete-bin-line text-sm" /></button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-brand-navy mb-1">{plan.name}</h3>
                    <div className="text-2xl font-bold text-brand-navy mb-1">${plan.price}</div>
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-3 text-[#00c896]">
                      <i className="ri-file-text-line" />
                      {plan.pages.toLocaleString()} pages
                    </div>
                    <div className="pt-3 border-t border-brand-border flex items-center gap-2">
                      <i className="ri-shopping-cart-line text-brand-muted text-sm" />
                      <span className="text-xs text-brand-muted">{plan.usageCount} times purchased</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Plan Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowManualModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit font-bold text-brand-navy">{editManual ? 'Edit Manual Plan' : 'Add Manual Plan'}</h3>
              <button onClick={() => setShowManualModal(false)} title="Close manual plan dialog" className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:bg-brand-surface transition-all"><i className="ri-close-line" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Plan Name *</label>
                <input type="text" value={manualForm.name} onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. Basic Quarterly" />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Duration</label>
                <div className="flex gap-2">
                  {(['3 Months', '6 Months', '1 Year'] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setManualForm((p) => ({ ...p, duration: d }))} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${manualForm.duration === d ? 'bg-[#0097B2] text-white border-[#0097B2]' : 'border-brand-border text-brand-muted hover:text-brand-navy'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Price ($) *</label>
                  <input type="number" value={manualForm.price} onChange={(e) => setManualForm((p) => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. 450" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Document Pages *</label>
                  <input type="number" value={manualForm.pageCount} onChange={(e) => setManualForm((p) => ({ ...p, pageCount: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. 3000" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowManualModal(false)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={saveManual} className="flex-1 py-2.5 rounded-lg bg-[#0097B2] text-white text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">{editManual ? 'Save Changes' : 'Add Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Plan Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSubModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit font-bold text-brand-navy">{editSub ? 'Edit Subscription Plan' : 'Add Subscription Plan'}</h3>
              <button onClick={() => setShowSubModal(false)} title="Close subscription dialog" className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:bg-brand-surface transition-all"><i className="ri-close-line" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Plan Name *</label>
                <input type="text" value={subForm.name} onChange={(e) => setSubForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. Professional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Monthly Price ($) *</label>
                  <input type="number" value={subForm.monthlyPrice} onChange={(e) => setSubForm((p) => ({ ...p, monthlyPrice: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. 149" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Monthly Page Limit *</label>
                  <input type="number" value={subForm.monthlyPageLimit} onChange={(e) => setSubForm((p) => ({ ...p, monthlyPageLimit: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. 10000" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Features (comma-separated)</label>
                <textarea value={subForm.features} onChange={(e) => setSubForm((p) => ({ ...p, features: e.target.value }))} rows={3} maxLength={500} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors resize-none" placeholder="Up to 25 users, 100 GB storage, Priority support" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSubModal(false)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={saveSub} className="flex-1 py-2.5 rounded-lg bg-[#0097B2] text-white text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">{editSub ? 'Save Changes' : 'Add Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Up Plan Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowTopUpModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit font-bold text-brand-navy">{editTopUp ? 'Edit Top-Up Plan' : 'Create Top-Up Plan'}</h3>
              <button onClick={() => setShowTopUpModal(false)} title="Close top-up dialog" className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:bg-brand-surface transition-all"><i className="ri-close-line" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Plan Name *</label>
                <input type="text" value={topUpForm.name} onChange={(e) => setTopUpForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. Medium Top-Up" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Number of Pages *</label>
                  <input type="number" value={topUpForm.pages} onChange={(e) => setTopUpForm((p) => ({ ...p, pages: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. 2000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Price ($) *</label>
                  <input type="number" value={topUpForm.price} onChange={(e) => setTopUpForm((p) => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none transition-colors" placeholder="e.g. 80" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowTopUpModal(false)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={saveTopUp} className="flex-1 py-2.5 rounded-lg bg-[#0097B2] text-white text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">{editTopUp ? 'Save Changes' : 'Create Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-delete-bin-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-brand-navy mb-1">Delete Plan?</h3>
              <p className="text-sm text-brand-muted">This action cannot be undone. Organizations on this plan will need to be reassigned.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
