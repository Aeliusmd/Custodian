'use client';

import { useState } from 'react';
import type { DocumentRecord, DocumentVersion } from '@/mocks/documents';

const TEAL = '#0097B2';

interface Props {
  doc: DocumentRecord;
  version?: DocumentVersion;
  onClose: () => void;
  onOpenVersionHistory?: () => void;
}

const MOCK_CONTENT_PAGES = [
  {
    title: 'Executive Summary',
    body: `This document provides a comprehensive overview of the organization's performance and strategic direction. The findings presented herein are based on thorough analysis conducted by our internal teams in collaboration with external auditors and consultants.\n\nKey highlights include a 23% increase in operational efficiency, successful completion of three major milestones, and a projected growth trajectory of 18% for the upcoming fiscal year. The board has reviewed and approved all recommendations contained within this report.`,
  },
  {
    title: 'Section 1 – Overview',
    body: `The organization has demonstrated consistent growth across all key performance indicators during the reporting period. Revenue streams have diversified significantly, with digital channels now accounting for 42% of total income — up from 31% in the previous period.\n\nOperational costs have been optimized through strategic vendor consolidation and process automation initiatives. The workforce has grown by 12%, with significant investment in talent development programs that have yielded measurable improvements in productivity and employee satisfaction scores.`,
  },
  {
    title: 'Section 2 – Detailed Analysis',
    body: `A granular breakdown of departmental performance reveals that the Finance and Technology divisions have exceeded their targets by 15% and 22% respectively. The Legal and Compliance team successfully navigated three regulatory changes with zero penalties or violations recorded.\n\nRisk management frameworks have been updated to reflect the evolving threat landscape. Cybersecurity investments totaling $2.4M have been deployed, resulting in a 67% reduction in security incidents compared to the prior year. Business continuity plans have been tested and validated across all critical systems.`,
  },
  {
    title: 'Section 3 – Recommendations',
    body: `Based on the analysis presented in the preceding sections, the following strategic recommendations are proposed for the next fiscal year:\n\n1. Accelerate digital transformation initiatives with a focus on AI-assisted document processing\n2. Expand the compliance monitoring framework to cover emerging regulatory requirements\n3. Invest in cross-departmental collaboration tools to reduce information silos\n4. Establish a dedicated innovation lab to prototype next-generation service offerings\n5. Strengthen vendor due diligence processes to mitigate supply chain risks`,
  },
  {
    title: 'Appendix & References',
    body: `All data presented in this document has been sourced from verified internal systems and cross-referenced with external benchmarks where applicable. Financial figures are presented in accordance with IFRS standards and have been independently audited.\n\nReferences:\n- Internal Performance Dashboard Q4 2024\n- External Audit Report by Torres & Associates\n- Industry Benchmark Study 2024 (Global Management Institute)\n- Regulatory Compliance Framework v3.1 (Internal Policy Document)\n- Board Resolution #2024-47 dated November 28, 2024`,
  },
];

export default function DocumentViewerModal({ doc, version, onClose, onOpenVersionHistory }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const displayVersion = version ?? doc.versions.find((v) => v.isCurrent) ?? doc.versions[0];
  const totalPages = MOCK_CONTENT_PAGES.length;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 60));

  // Use CSS transform scale for proper zoom that affects ALL content (padding, icons, layout)
  const PAGE_W = 794;
  const PAGE_H = 1123;
  const scaledW = Math.round(PAGE_W * zoom / 100);
  const scaledH = Math.round(PAGE_H * zoom / 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1a2340]">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#1a2340] border-b border-white/10 flex-shrink-0">
        {/* Left: close + doc info */}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex-shrink-0"
        >
          <i className="ri-close-line text-base" />
        </button>

        <div className="w-px h-5 bg-white/20 flex-shrink-0" />

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}30` }}>
            <i className="ri-file-pdf-2-line text-sm" style={{ color: TEAL }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">{doc.category}</span>
              <span className="text-white/30 text-xs">·</span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: `${TEAL}30`, color: TEAL }}>
                {displayVersion.versionName}
              </span>
              {displayVersion.isCurrent && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  LATEST
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: page navigation */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
            disabled={currentPage === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-s-line text-sm" />
          </button>
          <span className="text-xs text-white/70 whitespace-nowrap">
            Page <span className="text-white font-semibold">{currentPage + 1}</span> / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={currentPage === totalPages - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-right-s-line text-sm" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/20 flex-shrink-0" />

        {/* Zoom */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <i className="ri-subtract-line text-xs" />
          </button>
          <span className="text-xs text-white/70 w-10 text-center">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-xs" />
          </button>
        </div>

        <div className="w-px h-5 bg-white/20 flex-shrink-0" />

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenVersionHistory && (
            <button
              onClick={onOpenVersionHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-history-line text-xs" />
              Version History
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{ background: TEAL }}
          >
            <i className="ri-download-2-line text-xs" />
            Download
          </button>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              sidebarOpen ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white/60'
            }`}
            title="Toggle outline"
          >
            <i className="ri-layout-right-2-line text-sm" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document area */}
        {/* FIX: overflow-auto on outer, inner uses transform scale with fixed 794px width */}
        <div className="flex-1 overflow-auto bg-[#252d45] flex items-start justify-center p-8">
          {/* Outer shell sizes itself to the scaled dimensions so scrollbars work correctly */}
          <div
            style={{
              width: `${scaledW}px`,
              height: `${scaledH}px`,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {/* The actual A4 page, always 794px wide, scaled via transform */}
            <div
              className="bg-white rounded-lg overflow-hidden"
              style={{
                width: `${PAGE_W}px`,
                minHeight: `${PAGE_H}px`,
                transformOrigin: 'top left',
                transform: `scale(${zoom / 100})`,
              }}
            >
              {/* Document header */}
              <div className="px-12 pt-10 pb-6 border-b border-gray-100" style={{ background: `${TEAL}08` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-[#1a2340] leading-tight">{doc.name.replace('.pdf', '')}</h1>
                    <p className="text-sm text-gray-500 mt-1">{doc.category} · {displayVersion.versionName}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400">Uploaded by</p>
                    <p className="text-sm font-semibold text-[#1a2340]">{displayVersion.uploadedBy}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{displayVersion.date}</p>
                  </div>
                </div>

                {/* Metadata strip */}
                <div className="flex flex-wrap gap-3 mt-4">
                  {Object.entries(doc.metadata).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200">
                      <span className="text-[10px] text-gray-400 font-medium">{k}:</span>
                      <span className="text-[10px] text-[#1a2340] font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Page content */}
              <div className="px-12 py-8">
                <div className="mb-6">
                  <h2 className="text-base font-bold text-[#1a2340] mb-1 pb-2 border-b border-gray-100">
                    {MOCK_CONTENT_PAGES[currentPage].title}
                  </h2>
                </div>
                <div className="space-y-4">
                  {MOCK_CONTENT_PAGES[currentPage].body.split('\n\n').map((para, i) => (
                    <p key={i} className="text-sm text-gray-700 leading-relaxed">{para}</p>
                  ))}
                </div>

                {/* Decorative lines */}
                <div className="mt-8 space-y-2.5">
                  {[100, 95, 88, 100, 72, 90, 60].map((w, i) => (
                    <div key={i} className="h-2 rounded-full bg-gray-100" style={{ width: `${w}%` }} />
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="h-24 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <i className="ri-bar-chart-2-line text-2xl text-gray-200" />
                  </div>
                  <div className="h-24 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                    <i className="ri-pie-chart-2-line text-2xl text-gray-200" />
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[85, 100, 78, 92].map((w, i) => (
                    <div key={i} className="h-2 rounded-full bg-gray-100" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>

              {/* Page footer */}
              <div className="px-12 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-300">{doc.name}</span>
                <span className="text-[10px] text-gray-300">Page {currentPage + 1} of {totalPages}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar – outline */}
        {sidebarOpen && (
          <div className="w-56 bg-[#1e2740] border-l border-white/10 flex flex-col flex-shrink-0">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Document Outline</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {MOCK_CONTENT_PAGES.map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-all cursor-pointer ${
                    currentPage === idx
                      ? 'text-white font-semibold border-l-2'
                      : 'text-white/40 hover:text-white/70 border-l-2 border-transparent'
                  }`}
                  style={currentPage === idx ? { borderColor: TEAL, background: `${TEAL}15` } : {}}
                >
                  <span
                    className="block text-[10px] mb-0.5"
                    style={{ color: currentPage === idx ? TEAL : 'rgba(255,255,255,0.25)' }}
                  >
                    Page {idx + 1}
                  </span>
                  {page.title}
                </button>
              ))}
            </div>

            {/* Version info in sidebar */}
            <div className="px-4 py-3 border-t border-white/10">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Version Info</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Version</span>
                  <span className="text-[10px] text-white/70 font-medium">
                    {displayVersion.versionName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Date</span>
                  <span className="text-[10px] text-white/70">{displayVersion.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">By</span>
                  <span className="text-[10px] text-white/70 truncate max-w-[80px]">{displayVersion.uploadedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">Size</span>
                  <span className="text-[10px] text-white/70">{doc.fileSize}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom page thumbnails */}
      <div className="flex items-center gap-2 px-6 py-3 bg-[#1a2340] border-t border-white/10 overflow-x-auto flex-shrink-0">
        {MOCK_CONTENT_PAGES.map((page, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPage(idx)}
            className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group"
          >
            <div
              className={`w-14 h-20 rounded-md border-2 flex flex-col items-center justify-center transition-all ${
                currentPage === idx ? 'border-[#0097B2]' : 'border-white/10 hover:border-white/30'
              }`}
              style={{ background: currentPage === idx ? `${TEAL}20` : 'rgba(255,255,255,0.05)' }}
            >
              <div className="space-y-1 px-2 w-full">
                {[100, 80, 90, 70, 85].map((w, i) => (
                  <div key={i} className="h-0.5 rounded-full bg-white/20" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
            <span className={`text-[9px] ${currentPage === idx ? 'text-white' : 'text-white/30'}`}>{idx + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
