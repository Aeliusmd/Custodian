"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mockCategories } from '../mockCategories';
import styles from '../upload-documents.module.css';

const STEPS = ['Select Category', 'Upload Files', 'Download Template', 'Upload Template', 'Privacy', 'Complete'];

interface UploadedFile {
  id: string;
  file: File;
  status: 'ready' | 'error';
}

export default function BulkUpload() {
  const [step, setStep] = useState(0);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateDrag, setTemplateDrag] = useState(false);
  const [templateErrors, setTemplateErrors] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<'Public' | 'Private'>('Private');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const selectedCat = mockCategories.find((c) => c.id === selectedCatId);

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 0 && !selectedCatId) nextErrors.cat = 'Please select a category';
    if (step === 1 && files.length === 0) nextErrors.files = 'Please upload at least one file';
    if (step === 3 && !templateFile) nextErrors.template = 'Please upload the filled template';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((current) => current + 1);
  };

  const addFiles = (newFiles: File[]) => {
    const mapped: UploadedFile[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'ready',
    }));
    setFiles((current) => [...current, ...mapped]);
    setErrors({});
  };

  const removeFile = (id: string) => {
    setFiles((current) => current.filter((file) => file.id !== id));
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const handleTemplateUpload = (file: File) => {
    setTemplateFile(file);
    const nextErrors: string[] = [];
    if (!(file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      nextErrors.push('Invalid file format. Please upload .xlsx or .csv');
    }
    setTemplateErrors(nextErrors);
    setErrors({});
  };

  const handleFinalUpload = () => {
    setUploading(true);
    window.setTimeout(() => {
      setUploading(false);
      setStep(5);
    }, 2200);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadTemplate = () => {
    if (!selectedCat) return;

    const headers = ['File Name', ...selectedCat.fields.map((field) => field.name)];
    const rows = files.map((file) => [file.file.name, ...selectedCat.fields.map(() => '')]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedCat.name.replace(/\s+/g, '_')}_metadata_template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
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
              <h1 className={styles.uploadTitle}>Bulk Document Upload</h1>
              <p className={styles.uploadSubtitle}>Upload multiple documents with a metadata template</p>
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
            <p className="text-sm text-gray-400">Choose the category for all documents in this batch</p>
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
                      <div className="text-xs text-gray-400 mt-0.5">{category.fields.length} metadata fields</div>
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
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Upload Files</h2>
            <p className="text-sm text-gray-400">Upload multiple documents at once</p>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${dragActive ? styles.fileDropBgActive : styles.fileDropBgIdle}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
            aria-label="Upload multiple files"
          >
            <div className={`${styles.filePreviewIconBg} w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3`}>
              <i className={`ri-folder-upload-line text-xl ${styles.filePreviewIcon}`} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#1a2340]">Drop multiple files here</p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              aria-label="Upload multiple files"
              title="Upload multiple files"
              onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
            />
          </div>
          {files.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''} selected</span>
                <button type="button" onClick={() => setFiles([])} className="text-xs text-red-400 hover:underline" aria-label="Clear all selected files">
                  Clear all
                </button>
              </div>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={`${styles.filePreviewIconBg} w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <i className={`ri-file-text-line text-sm ${styles.filePreviewIcon}`} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#1a2340] truncate">{file.file.name}</div>
                      <div className="text-xs text-gray-400">{formatSize(file.file.size)}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#16a34a]/10 text-[#16a34a] font-medium">Ready</span>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className={`w-6 h-6 flex items-center justify-center rounded transition-all ${styles.filePreviewRemove}`}
                      aria-label={`Remove ${file.file.name}`}
                    >
                      <i className="ri-close-line text-sm" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {errors.files && <p className="text-sm text-red-400">{errors.files}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Download Metadata Template</h2>
            <p className="text-sm text-gray-400">Download the template, fill in metadata for each document, then upload it</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-5">
              <div className={`${styles.filePreviewIconBg} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <i className={`ri-file-excel-2-line text-2xl ${styles.filePreviewIcon}`} aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#1a2340]">{selectedCat?.name}_metadata_template.csv</div>
                <div className="text-xs text-gray-400 mt-1">Contains columns for: File Name, {selectedCat?.fields.map((field) => field.name).join(', ')}</div>
                <div className="text-xs text-gray-400 mt-0.5">{files.length} rows pre-filled with your file names</div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 mb-4 overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 text-gray-500 font-semibold whitespace-nowrap">File Name</th>
                    {selectedCat?.fields.map((field) => (
                      <th key={field.id} className="text-left px-2 py-1 text-gray-500 font-semibold whitespace-nowrap">
                        {field.name}{field.required ? ' *' : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {files.slice(0, 3).map((file) => (
                    <tr key={file.id} className="border-t border-gray-200">
                      <td className="px-2 py-1 text-gray-600 whitespace-nowrap max-w-[120px] truncate">{file.file.name}</td>
                      {selectedCat?.fields.map((field) => (
                        <td key={field.id} className="px-2 py-1 text-gray-300 italic whitespace-nowrap">fill here</td>
                      ))}
                    </tr>
                  ))}
                  {files.length > 3 && (
                    <tr className="border-t border-gray-200">
                      <td colSpan={(selectedCat?.fields.length ?? 0) + 1} className="px-2 py-1 text-gray-400 text-center">
                        +{files.length - 3} more rows...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-medium transition-colors bg-[#0097B2] hover:bg-[#007d95]" aria-label="Download metadata template">
              <i className="ri-download-2-line" aria-hidden="true" />
              Download Template (.csv)
            </button>
          </div>
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <i className="ri-information-line text-amber-500 text-sm mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-xs text-amber-700">Fill in all required fields (marked with *) in the template before uploading. Incorrect formats will be flagged during validation.</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Upload Filled Template</h2>
            <p className="text-sm text-gray-400">Upload the completed metadata template (.xlsx or .csv)</p>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${templateDrag ? styles.fileDropBgActive : styles.fileDropBgIdle}`}
            onDragOver={(event) => {
              event.preventDefault();
              setTemplateDrag(true);
            }}
            onDragLeave={() => setTemplateDrag(false)}
            onDrop={(event) => {
              event.preventDefault();
              setTemplateDrag(false);
              const file = event.dataTransfer.files[0];
              if (file) handleTemplateUpload(file);
            }}
            onClick={() => templateRef.current?.click()}
            aria-label="Upload metadata template"
          >
            <div className={`${styles.filePreviewIconBg} w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3`}>
              <i className={`ri-file-excel-2-line text-xl ${styles.filePreviewIcon}`} aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#1a2340]">Drop your filled template here</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx or .csv files only</p>
            <input
              ref={templateRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              aria-label="Upload metadata template file"
              title="Upload metadata template file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleTemplateUpload(file);
              }}
            />
          </div>
          {templateFile && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${templateErrors.length > 0 ? 'border-red-200 bg-red-50' : 'border-[#16a34a]/30 bg-[#16a34a]/5'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${templateErrors.length > 0 ? styles.templateStatusErrorBg : styles.templateStatusOkBg}`}>
                <i className={`${templateErrors.length > 0 ? styles.templateStatusErrorIcon : styles.templateStatusOkIcon} text-lg`} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1a2340] truncate">{templateFile.name}</div>
                {templateErrors.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    {templateErrors.map((error, index) => (
                      <p key={index} className="text-xs text-red-500">{error}</p>
                    ))}
                  </div>
                ) : (
                  <p className={`text-xs mt-0.5 ${styles.templateStatusOkText}`}>Template validated successfully — {files.length} records ready</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setTemplateFile(null);
                  setTemplateErrors([]);
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${styles.iconOnlyButton}`}
                aria-label="Remove template file"
              >
                <i className="ri-close-line text-sm" aria-hidden="true" />
              </button>
            </div>
          )}
          {errors.template && <p className="text-sm text-red-400">{errors.template}</p>}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a2340] mb-1">Privacy Setting</h2>
            <p className="text-sm text-gray-400">This setting will apply to all {files.length} documents in this batch</p>
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

      {step === 5 && (
        <div className="text-center py-8">
          <div className={`${styles.successIconBg} w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5`}>
            <i className={`ri-checkbox-circle-line text-4xl ${styles.successIcon}`} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[#1a2340] mb-2">Bulk Upload Complete!</h2>
          <p className="text-sm text-gray-400 mb-1">
            <strong className="text-[#1a2340]">{files.length} documents</strong> have been successfully uploaded
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
                setFiles([]);
                setTemplateFile(null);
                setTemplateErrors([]);
                setPrivacy('Private');
                setErrors({});
              }}
              className="px-5 py-2.5 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap bg-[#0097B2] hover:bg-[#007d95]"
            >
              New Bulk Upload
            </button>
          </div>
        </div>
      )}

      {step < 5 && (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-8 pt-5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => (step === 0 ? router.push('/org-admin/upload-documents') : setStep((current) => current - 1))}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <i className="ri-arrow-left-line" aria-hidden="true" />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 4 ? (
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
                <><i className="ri-loader-4-line animate-spin" aria-hidden="true" />Uploading {files.length} files...</>
              ) : (
                <><i className="ri-upload-cloud-2-line" aria-hidden="true" />Complete Upload</>
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
