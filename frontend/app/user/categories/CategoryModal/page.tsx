"use client";

import { useState, useEffect } from 'react';
import type { Category, MetadataField } from '../types';

interface Props {
  category: Category | null;
  onClose: () => void;
  onSave: (cat: Category) => void;
}

const FIELD_TYPES = ['Text', 'Number', 'Date', 'Dropdown', 'NIC', 'Author', 'Email', 'Phone', 'URL'] as const;

const FIELD_TYPE_META: Record<string, { icon: string; label: string; hint: string }> = {
  Text:     { icon: 'ri-text',              label: 'Text',     hint: 'Free-form text input' },
  Number:   { icon: 'ri-hashtag',           label: 'Number',   hint: 'Numeric value' },
  Date:     { icon: 'ri-calendar-line',     label: 'Date',     hint: 'Date picker' },
  Dropdown: { icon: 'ri-arrow-down-s-line', label: 'Dropdown', hint: 'Select from options' },
  NIC:      { icon: 'ri-id-card-line',      label: 'NIC',      hint: 'National Identity Card number' },
  Author:   { icon: 'ri-user-line',         label: 'Author',   hint: 'Document author / person name' },
  Email:    { icon: 'ri-mail-line',         label: 'Email',    hint: 'Valid email address' },
  Phone:    { icon: 'ri-phone-line',        label: 'Phone',    hint: 'Phone / mobile number' },
  URL:      { icon: 'ri-link',              label: 'URL',      hint: 'Web link / URL' },
};
const TEAL = '#0097B2';

function generateId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CategoryModal({ category, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<MetadataField[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setFields(category.fields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })));
    } else {
      setName('');
      setDescription('');
      setFields([]);
    }
    setErrors({});
  }, [category]);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: generateId(), name: '', type: 'Text', required: false, options: [] },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<MetadataField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const addOption = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, options: [...(f.options ?? []), ''] } : f))
    );
  };

  const updateOption = (fieldId: string, idx: number, val: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const opts = [...(f.options ?? [])];
        opts[idx] = val;
        return { ...f, options: opts };
      })
    );
  };

  const removeOption = (fieldId: string, idx: number) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const opts = [...(f.options ?? [])];
        opts.splice(idx, 1);
        return { ...f, options: opts };
      })
    );
  };

  const moveField = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= fields.length) return;
    const updated = [...fields];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setFields(updated);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Category name is required';
    fields.forEach((f, i) => {
      if (!f.name.trim()) errs[`field_${i}`] = 'Field name required';
      if (f.type === 'Dropdown' && (!f.options || f.options.filter((o) => o.trim()).length === 0)) {
        errs[`opts_${i}`] = 'Add at least one option';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const cat: Category = {
      id: category?.id ?? `CAT-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      fields,
      createdDate: category?.createdDate ?? new Date().toISOString().split('T')[0],
      docCount: category?.docCount ?? 0,
    };
    onSave(cat);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl mx-3 sm:mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b border-gray-100 gap-3">
          <div className="min-w-0">
            <h2 className="font-outfit font-bold text-lg text-[#1a2340]">{category ? 'Edit Category' : 'Create Category'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define category details and metadata fields</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <i className="ri-eye-line" />
              {showPreview ? 'Hide Preview' : 'Preview Form'}
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              title="Close"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-all"
            >
              <i className="ri-close-line text-lg" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showPreview ? (
            /* Preview Mode */
            <div className="p-4 sm:p-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="font-semibold text-[#1a2340] mb-1">{name || 'Category Name'}</h3>
                <p className="text-xs text-gray-400 mb-5">{description || 'No description'}</p>
                <div className="space-y-4">
                  {fields.map((f) => (
                    <div key={f.id}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        {f.name || 'Field Name'}
                        {f.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {f.type === 'Text' && <input type="text" placeholder={`Enter ${f.name || 'value'}`} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />}
                      {f.type === 'Number' && <input type="number" placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />}
                      {f.type === 'Date' && <input type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />}
                      {f.type === 'Email' && (
                        <div className="relative">
                          <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                          <input type="email" placeholder="name@example.com" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                        </div>
                      )}
                      {f.type === 'Phone' && (
                        <div className="relative">
                          <i className="ri-phone-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                          <input type="tel" placeholder="+94 77 123 4567" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                        </div>
                      )}
                      {f.type === 'URL' && (
                        <div className="relative">
                          <i className="ri-link absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                          <input type="url" placeholder="https://example.com" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                        </div>
                      )}
                      {f.type === 'NIC' && (
                        <div className="relative">
                          <i className="ri-id-card-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                          <input type="text" placeholder="e.g. 199012345678 or 901234567V" maxLength={12} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none font-mono tracking-wider" />
                        </div>
                      )}
                      {f.type === 'Author' && (
                        <div className="relative">
                          <i className="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                          <input type="text" placeholder="Full name of the author" className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" />
                        </div>
                      )}
                      {f.type === 'Dropdown' && (
                        <select title={f.name || 'Dropdown field'} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none">
                          <option value="">Select option...</option>
                          {(f.options ?? []).filter((o) => o.trim()).map((o, i) => <option key={i}>{o}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                  {fields.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No metadata fields added yet</p>}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="p-4 sm:p-6 space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Legal Contracts"
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this category..."
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Metadata Builder */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#1a2340]">Metadata Fields</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Define fields that appear during document upload</p>
                  </div>
                  <button
                    onClick={addField}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors whitespace-nowrap"
                    style={{ background: TEAL }}
                  >
                    <i className="ri-add-line" />
                    Add Field
                  </button>
                </div>

                {fields.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <i className="ri-list-settings-line text-gray-400 text-lg" />
                    </div>
                    <p className="text-sm text-gray-400">No metadata fields yet</p>
                    <p className="text-xs text-gray-300 mt-1">Click "Add Field" to define metadata for this category</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className={`border rounded-xl p-4 transition-all ${dragOver === field.id ? 'border-[#0097B2] bg-[#0097B2]/5' : 'border-gray-200 bg-gray-50'}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(field.id); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIdx = parseInt(e.dataTransfer.getData('fieldIdx'));
                          moveField(fromIdx, idx);
                          setDragOver(null);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-6 h-6 flex items-center justify-center text-gray-300 cursor-grab mt-1 flex-shrink-0"
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('fieldIdx', String(idx))}
                          >
                            <i className="ri-draggable text-base" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-3 flex-wrap">
                              <div className="flex-1 min-w-[140px]">
                                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Field Name</label>
                                <input
                                  type="text"
                                  value={field.name}
                                  onChange={(e) => updateField(field.id, { name: e.target.value })}
                                  placeholder="e.g. Contract Date"
                                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none transition-colors ${errors[`field_${idx}`] ? 'border-red-300' : 'border-gray-200 focus:border-[#0097B2]'}`}
                                />
                                {errors[`field_${idx}`] && <p className="text-[10px] text-red-400 mt-0.5">{errors[`field_${idx}`]}</p>}
                              </div>
                              <div className="w-full sm:w-44">
                                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">Field Type</label>
                                <select
                                  title={`Field type for ${field.name || 'metadata field'}`}
                                  value={field.type}
                                  onChange={(e) => updateField(field.id, { type: e.target.value as MetadataField['type'], options: [] })}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#0097B2] transition-colors"
                                >
                                  {FIELD_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {FIELD_TYPE_META[t].label}
                                    </option>
                                  ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  <i className={`${FIELD_TYPE_META[field.type]?.icon ?? 'ri-text'} mr-1`} />
                                  {FIELD_TYPE_META[field.type]?.hint ?? ''}
                                </p>
                              </div>
                              <div className="flex items-end pb-0.5">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div
                                    className="w-9 h-5 rounded-full transition-all relative flex-shrink-0"
                                    style={{ background: field.required ? TEAL : '#e5e7eb' }}
                                    onClick={() => updateField(field.id, { required: !field.required })}
                                  >
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${field.required ? 'left-4' : 'left-0.5'}`} />
                                  </div>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">Required</span>
                                </label>
                              </div>
                            </div>

                            {/* Dropdown Options */}
                            {field.type === 'Dropdown' && (
                              <div>
                                <label className="block text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Options</label>
                                <div className="space-y-2">
                                  {(field.options ?? []).map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOption(field.id, oi, e.target.value)}
                                        placeholder={`Option ${oi + 1}`}
                                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#0097B2] transition-colors"
                                      />
                                      <button
                                        onClick={() => removeOption(field.id, oi)}
                                        aria-label={`Remove option ${oi + 1}`}
                                        title="Remove option"
                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                                      >
                                        <i className="ri-close-line text-sm" />
                                      </button>
                                    </div>
                                  ))}
                                  {errors[`opts_${idx}`] && <p className="text-[10px] text-red-400">{errors[`opts_${idx}`]}</p>}
                                  <button
                                    onClick={() => addOption(field.id)}
                                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                                    style={{ color: TEAL }}
                                  >
                                    <i className="ri-add-line" />
                                    Add option
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeField(field.id)}
                            aria-label={`Remove field ${field.name || idx + 1}`}
                            title="Remove field"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all flex-shrink-0 mt-1"
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs text-gray-400">{fields.length} metadata field{fields.length !== 1 ? 's' : ''} defined</span>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">Cancel</button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
              style={{ background: TEAL }}
            >
              {category ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
