"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockCategories } from '../mockCategories';
import styles from '../upload-documents.module.css';

const STEPS = ['Select Category', 'Upload File', 'Metadata', 'Privacy', 'Complete'];

interface MetaValues {
  [key: string]: string;
}

export default function SingleUpload() {
  const [step, setStep] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [metaValues, setMetaValues] = useState<MetaValues>({});
  const [privacy, setPrivacy] = useState<'Public' | 'Private'>('Private');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const selectedCat = mockCategories.find((category) => category.id === selectedCatId);

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 0 && !selectedCatId) nextErrors.cat = 'Please select a category';
    if (step === 1 && !file) nextErrors.file = 'Please upload a file';
    if (step === 2 && selectedCat) {
      selectedCat.fields.forEach((field) => {
        if (field.required && !metaValues[field.id]?.trim()) {
          nextErrors[field.id] = `${field.name} is required`;
        }
      });
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((current) => current + 1);
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFile = event.target.files?.[0];
    if (pickedFile) setFile(pickedFile);
  };

  const handleFinalUpload = () => {
    setUploading(true);
    window.setTimeout(() => {
      setUploading(false);
      setStep(4);
    }, 1800);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stepCircleClass = (index: number) => {
    if (index < step) return styles.stepCircleDone;
    if (index === step) return styles.stepCircleActive;
    return styles.stepCirclePending;
  };

  const stepLabelClass = (index: number) => (index === step ? styles.stepLabelActive : styles.stepLabelPending);

  const stepConnectorClass = (index: number) => (index < step ? styles.stepConnectorDone : styles.stepConnectorPending);

  return (
    <div className={styles.uploadMain}>
      <div className={styles.uploadFrame}>
        <div className={styles.uploadHeaderWrap}>
          <div className={styles.uploadHeaderRow}>
            <button
              type="button"
              onClick={() => router.push('/org-admin/upload-documents')}
              className={styles.backButton}
              aria-label="Back to upload documents"
            >
              <i className="ri-arrow-left-line" aria-hidden="true" />
            </button>
            <div>
              <h1 className={styles.uploadTitle}>Single Document Upload</h1>
              <p className={styles.uploadSubtitle}>Upload one document with full metadata</p>
            </div>
          </div>
        </div>

        <div className={styles.uploadPanel}>
          <div className={styles.uploadPanelInner}>
      <div className={`flex items-center overflow-x-auto pb-2 ${styles.uploadStepper}`}>
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`${styles.stepCircleBase} ${stepCircleClass(index)}`}>
                {index < step ? <i className="ri-check-line text-sm" aria-hidden="true" /> : index + 1}
              </div>
              <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${stepLabelClass(index)}`}>{label}</span>
            </div>
            {index < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full min-w-[12px] ${stepConnectorClass(index)}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Select Category</h2>
            <p className="text-sm text-gray-400">Choose the category for this document</p>
          </div>
          <div className={styles.categoryGrid}>
            {mockCategories.map((category) => {
              const selected = selectedCatId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCatId(category.id);
                    setErrors({});
                  }}
                  className={`${styles.categoryCard} transition-all ${selected ? styles.categoryCardSelected : 'hover:border-gray-300'}`}
                  aria-pressed={selected}
                >
                  <div className="flex items-start gap-3">
                    <div className={`${styles.panelIconBgTeal} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <i className={`ri-folder-3-line ${styles.panelIconTeal}`} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#1a2340] truncate">{category.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{category.fields.length} metadata fields</div>
                    </div>
                    {selected && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-auto bg-[#0097B2]">
                        <i className="ri-check-line text-white text-xs" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.cat && <p className="text-sm text-red-400">{errors.cat}</p>}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Upload File</h2>
            <p className="text-sm text-gray-400">Drag & drop or browse to upload your document</p>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all cursor-pointer ${dragActive ? styles.fileDropBgActive : styles.fileDropBgIdle}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            aria-label="Upload a single file"
          >
            <div className={`${styles.filePreviewIconBg} w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <i className={`ri-upload-cloud-2-line text-2xl ${styles.filePreviewIcon}`} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#1a2340]">Drop your file here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <p className="text-xs text-gray-300 mt-3">PDF, DOCX, XLSX, PNG, JPG up to 50MB</p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              aria-label="Upload a single file"
              title="Upload a single file"
              onChange={handleFileInput}
            />
          </div>
          {file && (
            <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl">
              <div className={`${styles.filePreviewIconBg} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <i className={`ri-file-text-line text-lg ${styles.filePreviewIcon}`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1a2340] truncate">{file.name}</div>
                <div className="text-xs text-gray-400">{formatSize(file.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${styles.iconOnlyButton}`}
                aria-label={`Remove ${file.name}`}
              >
                <i className="ri-close-line text-sm" aria-hidden="true" />
              </button>
            </div>
          )}
          {errors.file && <p className="text-sm text-red-400">{errors.file}</p>}
        </div>
      )}

      {step === 2 && selectedCat && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Document Metadata</h2>
            <p className="text-sm text-gray-400">Fill in the metadata fields for <strong>{selectedCat.name}</strong></p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            {selectedCat.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor={field.id}>
                  {field.name}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === 'Text' && (
                  <input
                    id={field.id}
                    type="text"
                    value={metaValues[field.id] ?? ''}
                    onChange={(event) => setMetaValues((current) => ({ ...current, [field.id]: event.target.value }))}
                    placeholder={`Enter ${field.name}`}
                    aria-label={field.name}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors ${errors[field.id] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  />
                )}
                {field.type === 'Number' && (
                  <input
                    id={field.id}
                    type="number"
                    value={metaValues[field.id] ?? ''}
                    onChange={(event) => setMetaValues((current) => ({ ...current, [field.id]: event.target.value }))}
                    placeholder="0"
                    aria-label={field.name}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors ${errors[field.id] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  />
                )}
                {field.type === 'Date' && (
                  <input
                    id={field.id}
                    type="date"
                    value={metaValues[field.id] ?? ''}
                    onChange={(event) => setMetaValues((current) => ({ ...current, [field.id]: event.target.value }))}
                    aria-label={field.name}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors ${errors[field.id] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  />
                )}
                {field.type === 'Dropdown' && (
                  <select
                    id={field.id}
                    value={metaValues[field.id] ?? ''}
                    onChange={(event) => setMetaValues((current) => ({ ...current, [field.id]: event.target.value }))}
                    aria-label={field.name}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none transition-colors ${errors[field.id] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  >
                    <option value="">Select option...</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
                {errors[field.id] && <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Privacy Setting</h2>
            <p className="text-sm text-gray-400">Choose who can access this document</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['Public', 'Private'] as const).map((option) => {
              const active = privacy === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPrivacy(option)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${active ? 'border-[#0097B2] bg-[#0097B2]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  aria-pressed={active}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? styles.privacyIconBgActive : styles.privacyIconBgInactive}`}>
                      <i className={`${option === 'Public' ? 'ri-global-line' : 'ri-lock-line'} text-lg ${active ? styles.privacyIconActive : styles.privacyIconInactive}`} aria-hidden="true" />
                    </div>
                    {active && (
                      <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center bg-[#0097B2]" aria-hidden="true">
                        <i className="ri-check-line text-white text-xs" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#1a2340]">{option}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {option === 'Public' ? 'Visible to all users in the organization' : 'Only accessible to authorized users'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center py-8">
          <div className={`${styles.successIconBg} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5`}>
            <i className={`ri-checkbox-circle-line text-4xl ${styles.successIcon}`} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[#1a2340] mb-2">Document Uploaded!</h2>
          <p className="text-sm text-gray-400 mb-1">
            <strong className="text-[#1a2340]">{file?.name}</strong> has been successfully uploaded
          </p>
          <p className="text-xs text-gray-400">Category: {selectedCat?.name} · {privacy}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button
              type="button"
              onClick={() => router.push('/org-admin/upload-documents')}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Back to Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setSelectedCatId('');
                setFile(null);
                setMetaValues({});
                setPrivacy('Private');
                setErrors({});
              }}
              className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap bg-[#0097B2] hover:bg-[#007d95]"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}

      {step < 4 && (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => (step === 0 ? router.push('/org-admin/upload-documents') : setStep((current) => current - 1))}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line" aria-hidden="true" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap bg-[#0097B2] hover:bg-[#007d95]"
            >
              Continue
              <i className="ri-arrow-right-line" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalUpload}
              disabled={uploading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-70 bg-[#0097B2] hover:bg-[#007d95]"
            >
              {uploading ? (
                <><i className="ri-loader-4-line animate-spin" aria-hidden="true" />Uploading...</>
              ) : (
                <><i className="ri-upload-cloud-2-line" aria-hidden="true" />Upload Document</>
              )}
            </button>
          )}
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
}
