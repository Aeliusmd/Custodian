"use client";

import { useState } from 'react';
import type { DocumentRecord } from '../../../../mocks/documents';

const TEAL = '#0097B2';

interface Props {
  doc: DocumentRecord;
  onClose: () => void;
  onSave: (doc: DocumentRecord, metadata: Record<string, string>) => void;
}

export default function EditMetadataModal({ doc, onClose, onSave }: Props) {
  const [fields, setFields] = useState<Record<string, string>>({ ...doc.metadata });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [addingField, setAddingField] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (key: string, val: string) => {
    setFields((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleAdd = () => {
    if (!newKey.trim()) return;
    setFields((prev) => ({ ...prev, [newKey.trim()]: newVal.trim() }));
    setNewKey('');
    setNewVal('');
    setAddingField(false);
  };

  const handleRemove = (key: string) => {
    setFields((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    Object.entries(fields).forEach(([k, v]) => {
      if (!v.trim()) newErrors[k] = 'This field cannot be empty';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onSave(doc, fields);
    }, 800);
  };

  const fieldEntries = Object.entries(fields);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: `${TEAL}15` }}>
              <i className="ri-edit-2-line" style={{ color: TEAL }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#1a2340]">Edit Metadata</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[300px]">{doc.name}</p>
            </div>
          </div>
          <button onClick={onClose} title="Close" aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: `${TEAL}08` }}>
            <i className="ri-folder-3-line text-sm" style={{ color: TEAL }} />
            <span className="text-xs text-gray-500">Category:</span>
            <span className="text-xs font-semibold" style={{ color: TEAL }}>{doc.category}</span>
            <div className="flex-1" />
            <span className="text-xs text-gray-400">{fieldEntries.length} field{fieldEntries.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {fieldEntries.map(([key, val]) => (
            <div key={key} className="group/field">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                  <i className="ri-price-tag-3-line text-gray-300" />
                  {key}
                </label>
                <button
                  onClick={() => handleRemove(key)}
                  title={`Remove ${key}`}
                  aria-label={`Remove ${key}`}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:bg-red-50 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover/field:opacity-100"
                >
                  <i className="ri-delete-bin-line text-xs" />
                </button>
              </div>
              <input
                value={val}
                onChange={(e) => handleChange(key, e.target.value)}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${
                  errors[key] ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 focus:border-[#0097B2]'
                }`}
                style={{ boxShadow: errors[key] ? 'none' : undefined }}
              />
              {errors[key] && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <i className="ri-error-warning-line" /> {errors[key]}
                </p>
              )}
            </div>
          ))}

          {addingField ? (
            <div className="border border-dashed border-[#0097B2]/40 rounded-xl p-4 bg-[#0097B2]/[0.02]">
              <p className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                <i className="ri-add-circle-line" style={{ color: TEAL }} />
                Add New Field
              </p>
              <div className="space-y-2">
                <input
                  placeholder="Field name (e.g. Author, NIC, Reference No.)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <input
                  placeholder="Value"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleAdd}
                  disabled={!newKey.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: TEAL }}
                >
                  <i className="ri-check-line" /> Add
                </button>
                <button
                  onClick={() => { setAddingField(false); setNewKey(''); setNewVal(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingField(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-[#0097B2]/40 hover:text-[#0097B2] hover:bg-[#0097B2]/[0.02] transition-all cursor-pointer"
            >
              <i className="ri-add-line" />
              Add Missing Field
            </button>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
            style={{ background: TEAL }}
          >
            {saving
              ? <><i className="ri-loader-4-line animate-spin" /> Saving...</>
              : <><i className="ri-save-line" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}
