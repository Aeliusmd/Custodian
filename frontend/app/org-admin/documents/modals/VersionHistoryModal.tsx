"use client";

import { useState } from 'react';
import type { DocumentRecord } from '../../../../mocks/documents';

const TEAL = '#0097B2';

interface Props {
  doc: DocumentRecord;
  onClose: () => void;
}

export default function VersionHistoryModal({ doc, onClose }: Props) {
  const [viewingVersion, setViewingVersion] = useState<string | null>(null);
  const [restoredVersion, setRestoredVersion] = useState<string | null>(null);

  const handleRestore = (_versionId: string, versionName: string) => {
    setRestoredVersion(versionName);
    setTimeout(() => setRestoredVersion(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: `${TEAL}15` }}>
              <i className="ri-history-line" style={{ color: TEAL }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#1a2340]">Version History</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[260px]">{doc.name}</p>
            </div>
          </div>
          <button onClick={onClose} title="Close" aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {restoredVersion && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200">
            <i className="ri-checkbox-circle-line text-green-500" />
            <p className="text-sm text-green-700 font-medium">Restored to {restoredVersion}</p>
          </div>
        )}

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{doc.versions.length} version{doc.versions.length !== 1 ? 's' : ''} total</span>
            <span>Sorted by latest first</span>
          </div>
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-3" style={{ maxHeight: '65vh' }}>
          {doc.versions.map((v, idx) => (
            <div
              key={v.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                v.isCurrent
                  ? 'border-[#0097B2]/30'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
              style={v.isCurrent ? { background: `${TEAL}06` } : { background: '#fff' }}
            >
              <div className="flex items-center gap-4 p-4">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      v.isCurrent ? 'text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                    style={v.isCurrent ? { background: TEAL } : {}}
                  >
                    v{doc.versions.length - idx}
                  </div>
                  {idx < doc.versions.length - 1 && (
                    <div className="w-px h-3 bg-gray-200" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#1a2340] truncate">{v.versionName}</span>
                    {v.isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap" style={{ background: TEAL }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <i className="ri-calendar-2-line" />
                      {v.date}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <i className="ri-user-3-line" />
                      {v.uploadedBy}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setViewingVersion(viewingVersion === v.id ? null : v.id)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                      viewingVersion === v.id
                        ? 'text-white'
                        : 'text-gray-400 hover:bg-gray-100 hover:text-[#1a2340]'
                    }`}
                    style={viewingVersion === v.id ? { background: TEAL } : {}}
                    title="View this version"
                  >
                    <i className="ri-eye-line text-sm" />
                  </button>
                  {!v.isCurrent && (
                    <button
                      onClick={() => handleRestore(v.id, v.versionName)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                      style={{ color: TEAL, background: `${TEAL}12` }}
                      title="Restore this version"
                    >
                      <i className="ri-refresh-line text-xs" />
                      Restore
                    </button>
                  )}
                </div>
              </div>

              {viewingVersion === v.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="border border-gray-100 rounded-xl p-3 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="ri-file-pdf-2-line text-sm" style={{ color: TEAL }} />
                      <span className="text-xs font-semibold text-gray-500">Document Preview</span>
                      <span className="text-xs text-gray-300">· {v.versionName}</span>
                    </div>
                    <div className="h-24 rounded-lg bg-gray-50 flex flex-col items-center justify-center gap-2">
                      <i className="ri-file-pdf-2-line text-2xl text-gray-300" />
                      <p className="text-xs text-gray-400">Preview available in full viewer</p>
                    </div>
                    <button className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: TEAL }}>
                      <i className="ri-external-link-line mr-1" />
                      Open Full Preview
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
