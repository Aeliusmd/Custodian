"use client";

import { useState } from 'react';
import type { DocumentRecord } from '../../../../mocks/documents';

interface Props {
  docs: DocumentRecord[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export default function DeleteDocumentModal({ docs, onClose, onConfirm }: Props) {
  const [deleting, setDeleting] = useState(false);
  const isBulk = docs.length > 1;

  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => {
      onConfirm(docs.map((d) => d.id));
      setDeleting(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full bg-red-500" />

        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <i className="ri-delete-bin-2-line text-3xl text-red-500" />
          </div>

          <div className="text-center">
            <h3 className="text-base font-bold text-[#1a2340] mb-2">
              {isBulk ? `Delete ${docs.length} Documents?` : 'Delete Document?'}
            </h3>
            {isBulk ? (
              <div className="space-y-1.5">
                <p className="text-sm text-gray-500">
                  You are about to permanently delete <strong>{docs.length} documents</strong>. This action cannot be undone.
                </p>
                <div className="mt-3 max-h-28 overflow-y-auto space-y-1.5 text-left">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50">
                      <i className="ri-file-pdf-2-line text-red-400 text-sm flex-shrink-0" />
                      <span className="text-xs text-red-700 truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this document? This action cannot be undone.
                </p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 mt-2">
                  <i className="ri-file-pdf-2-line text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-700 font-medium truncate">{docs[0]?.name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="w-full flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <i className="ri-alert-line text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              All versions and associated metadata will be permanently removed.
            </p>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:bg-red-700 transition-colors whitespace-nowrap disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              {deleting
                ? <><i className="ri-loader-4-line animate-spin" /> Deleting...</>
                : <><i className="ri-delete-bin-line" /> Delete{isBulk ? ` ${docs.length} Files` : ''}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
