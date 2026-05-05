"use client";

import { useState } from 'react';
import CategoryModal from './CategoryModal/page';
import type { Category } from './types';

const TEAL = '#0097B2';

const mockCategories: Category[] = [
  {
    id: 'CAT-001', name: 'Legal Contracts', description: 'All legal agreements, NDAs, and binding contracts',
    createdDate: '2025-01-10', docCount: 3240,
    fields: [
      { id: 'f1', name: 'Contract Date', type: 'Date', required: true },
      { id: 'f2', name: 'Counterparty Name', type: 'Text', required: true },
      { id: 'f3', name: 'Contract Type', type: 'Dropdown', required: true, options: ['NDA', 'Service Agreement', 'Employment', 'Vendor'] },
      { id: 'f4', name: 'Expiry Date', type: 'Date', required: false },
      { id: 'f5', name: 'Contract Value', type: 'Number', required: false },
    ],
  },
  {
    id: 'CAT-002', name: 'Financial Reports', description: 'Quarterly and annual financial statements and summaries',
    createdDate: '2025-01-10', docCount: 2810,
    fields: [
      { id: 'f6', name: 'Report Period', type: 'Dropdown', required: true, options: ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'] },
      { id: 'f7', name: 'Fiscal Year', type: 'Number', required: true },
      { id: 'f8', name: 'Prepared By', type: 'Text', required: true },
      { id: 'f9', name: 'Approved By', type: 'Text', required: false },
    ],
  },
  {
    id: 'CAT-003', name: 'HR Documents', description: 'Employee records, policies, and HR-related documentation',
    createdDate: '2025-02-05', docCount: 1950,
    fields: [
      { id: 'f10', name: 'Employee Name', type: 'Text', required: true },
      { id: 'f11', name: 'Employee ID', type: 'Text', required: true },
      { id: 'f12', name: 'Document Type', type: 'Dropdown', required: true, options: ['Offer Letter', 'Contract', 'Performance Review', 'Termination'] },
      { id: 'f13', name: 'Effective Date', type: 'Date', required: true },
    ],
  },
  {
    id: 'CAT-004', name: 'Compliance', description: 'Regulatory compliance documents, audits, and certifications',
    createdDate: '2025-02-20', docCount: 1620,
    fields: [
      { id: 'f14', name: 'Regulation Name', type: 'Text', required: true },
      { id: 'f15', name: 'Audit Date', type: 'Date', required: true },
      { id: 'f16', name: 'Compliance Status', type: 'Dropdown', required: true, options: ['Compliant', 'Non-Compliant', 'Under Review'] },
      { id: 'f17', name: 'Auditor', type: 'Text', required: false },
      { id: 'f18', name: 'Next Review Date', type: 'Date', required: false },
    ],
  },
  {
    id: 'CAT-005', name: 'Operations', description: 'Standard operating procedures and operational manuals',
    createdDate: '2025-03-01', docCount: 1380,
    fields: [
      { id: 'f19', name: 'Department', type: 'Dropdown', required: true, options: ['IT', 'Finance', 'HR', 'Legal', 'Operations'] },
      { id: 'f20', name: 'Version', type: 'Text', required: true },
      { id: 'f21', name: 'Effective Date', type: 'Date', required: true },
    ],
  },
  {
    id: 'CAT-006', name: 'Client Proposals', description: 'Business proposals and pitch documents for clients',
    createdDate: '2025-03-15', docCount: 890,
    fields: [
      { id: 'f22', name: 'Client Name', type: 'Text', required: true },
      { id: 'f23', name: 'Proposal Date', type: 'Date', required: true },
      { id: 'f24', name: 'Estimated Value', type: 'Number', required: false },
      { id: 'f25', name: 'Status', type: 'Dropdown', required: true, options: ['Draft', 'Sent', 'Accepted', 'Rejected'] },
    ],
  },
  {
    id: 'CAT-007', name: 'Insurance Policies', description: 'Corporate insurance documents and policy renewals',
    createdDate: '2025-04-01', docCount: 420,
    fields: [
      { id: 'f26', name: 'Policy Number', type: 'Text', required: true },
      { id: 'f27', name: 'Insurer', type: 'Text', required: true },
      { id: 'f28', name: 'Coverage Type', type: 'Dropdown', required: true, options: ['Liability', 'Property', 'Health', 'Cyber'] },
      { id: 'f29', name: 'Expiry Date', type: 'Date', required: true },
    ],
  },
  {
    id: 'CAT-008', name: 'Meeting Minutes', description: 'Board and committee meeting records and resolutions',
    createdDate: '2025-04-10', docCount: 170,
    fields: [
      { id: 'f30', name: 'Meeting Date', type: 'Date', required: true },
      { id: 'f31', name: 'Meeting Type', type: 'Dropdown', required: true, options: ['Board', 'Committee', 'Team', 'AGM'] },
      { id: 'f32', name: 'Chairperson', type: 'Text', required: true },
    ],
  },
];

const fieldTypeIcon: Record<string, string> = {
  Text:     'ri-text',
  Number:   'ri-hashtag',
  Date:     'ri-calendar-line',
  Dropdown: 'ri-arrow-down-s-line',
  NIC:      'ri-id-card-line',
  Author:   'ri-user-line',
  Email:    'ri-mail-line',
  Phone:    'ri-phone-line',
  URL:      'ri-link',
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [viewCat, setViewCat] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (cat: Category) => {
    if (editCat) {
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
    } else {
      setCategories((prev) => [...prev, cat]);
    }
    setShowModal(false);
    setEditCat(null);
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="px-4 py-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
        <div className="min-w-0">
          <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Category Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">{categories.length} categories with custom metadata</p>
        </div>
        <button
          onClick={() => { setEditCat(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
          style={{ background: TEAL }}
        >
          <i className="ri-add-line" />
          Create Category
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Categories', value: categories.length, icon: 'ri-folder-3-line', color: TEAL },
          { label: 'Total Documents', value: categories.reduce((a, c) => a + c.docCount, 0).toLocaleString(), icon: 'ri-file-text-line', color: '#16a34a' },
          { label: 'Avg. Fields/Category', value: Math.round(categories.reduce((a, c) => a + c.fields.length, 0) / categories.length), icon: 'ri-list-settings-line', color: '#d97706' },
          { label: 'Total Metadata Fields', value: categories.reduce((a, c) => a + c.fields.length, 0), icon: 'ri-input-method-line', color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}18` }}>
              <i className={`${s.icon} text-base`} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1a2340]">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
          />
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              {['Category', 'Description', 'Metadata Fields', 'Documents', 'Created', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
                      <i className="ri-folder-3-line text-base" style={{ color: TEAL }} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1a2340]">{cat.name}</div>
                      <div className="text-xs text-gray-400">{cat.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-gray-500 max-w-[200px] truncate">{cat.description}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-[#1a2340]">{cat.fields.length}</span>
                    <div className="flex gap-1 flex-wrap">
                      {cat.fields.slice(0, 3).map((f) => (
                        <span key={f.id} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex items-center gap-0.5 whitespace-nowrap">
                          <i className={`${fieldTypeIcon[f.type]} text-[10px]`} />
                          {f.name}
                        </span>
                      ))}
                      {cat.fields.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">+{cat.fields.length - 3}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-sm font-semibold text-[#1a2340]">{cat.docCount.toLocaleString()}</span>
                </td>
                <td className="px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{cat.createdDate}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewCat(cat)}
                      title="View"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#0097B2] hover:bg-[#0097B2]/10 transition-all"
                    >
                      <i className="ri-eye-line text-sm" />
                    </button>
                    <button
                      onClick={() => { setEditCat(cat); setShowModal(true); }}
                      title="Edit"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#d97706] hover:bg-[#d97706]/10 transition-all"
                    >
                      <i className="ri-edit-line text-sm" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(cat.id)}
                      title="Delete"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">No categories found.</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <CategoryModal
          category={editCat}
          onClose={() => { setShowModal(false); setEditCat(null); }}
          onSave={handleSave}
        />
      )}

      {/* View Modal */}
      {viewCat && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setViewCat(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-outfit font-bold text-lg text-[#1a2340]">{viewCat.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{viewCat.id} · {viewCat.fields.length} metadata fields</p>
              </div>
              <button
                onClick={() => setViewCat(null)}
                aria-label="Close category details"
                title="Close"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-all"
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-sm text-gray-500">{viewCat.description}</p>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Metadata Fields</h3>
                <div className="space-y-2">
                  {viewCat.fields.map((f, i) => (
                    <div key={f.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#1a2340]">{f.name}</div>
                        {f.type === 'Dropdown' && f.options && f.options.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {f.options.map((o, oi) => <span key={oi} className="text-[10px] px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500">{o}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">{f.type}</span>
                        {f.required && <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>Required</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setViewCat(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">Close</button>
              <button
                onClick={() => { setEditCat(viewCat); setViewCat(null); setShowModal(true); }}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
                style={{ background: TEAL }}
              >
                Edit Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-delete-bin-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-[#1a2340] mb-1">Delete Category?</h3>
              <p className="text-sm text-gray-400">This will permanently remove the category and its metadata configuration. Documents won't be deleted.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
