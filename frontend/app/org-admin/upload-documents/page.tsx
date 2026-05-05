import Link from 'next/link';
import styles from './upload-documents.module.css';

const TEAL = '#0097B2';

const uploadModes = [
  {
    href: '/org-admin/upload-documents/SingleUpload',
    title: 'Single Upload',
    icon: 'ri-file-upload-line',
    accent: TEAL,
    description: 'Upload one document at a time with full metadata entry. Best for individual files that need specific details.',
    steps: ['Select category', 'Upload file with drag & drop', 'Fill dynamic metadata form', 'Set privacy & publish'],
  },
  {
    href: '/org-admin/upload-documents/BulkUpload',
    title: 'Bulk Upload',
    icon: 'ri-folder-upload-line',
    accent: '#16A34A',
    description: 'Upload multiple documents at once using a metadata template. Ideal for large batches of similar documents.',
    steps: ['Select category', 'Upload multiple files', 'Download & fill metadata template', 'Upload template & publish all'],
  },
];

const uploadTips = [
  { icon: 'ri-file-list-3-line', title: 'Supported Formats', desc: 'PDF, DOCX, XLSX, PNG, JPG, CSV up to 50MB per file' },
  { icon: 'ri-folder-settings-line', title: 'Category Metadata', desc: 'Each category has custom fields. Make sure to fill required ones.' },
  { icon: 'ri-shield-check-line', title: 'Privacy Control', desc: 'Set documents as Public or Private before final upload.' },
];

export default function UploadDocumentsPage() {
  return (
    <div className="px-4 py-5 sm:p-6 space-y-6">
      <div className="min-w-0">
        <h1 className="font-outfit font-bold text-2xl text-[#1a2340]">Upload Documents</h1>
        <p className="text-gray-400 text-sm mt-0.5">Choose how you want to upload your documents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl">
        {uploadModes.map((mode) => {
          const isTeal = mode.accent === TEAL;
          return (
          <Link
            key={mode.title}
            href={mode.href}
            className="group text-left bg-white border-2 border-gray-200 hover:border-[#0097B2] rounded-2xl p-5 sm:p-8 transition-all hover:bg-[#0097B2]/5 cursor-pointer"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all ${isTeal ? styles.cardAccentTealBg : styles.cardAccentOrangeBg}`}>
              <i className={`${mode.icon} text-3xl ${isTeal ? styles.cardAccentTealText : styles.cardAccentOrangeText}`} />
            </div>
            <h2 className="text-lg font-bold text-[#1a2340] mb-2">{mode.title}</h2>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">{mode.description}</p>
            <div className="space-y-2">
              {mode.steps.map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isTeal ? styles.stepCheckBgTeal : styles.stepCheckBgOrange}`}>
                    <i className={`ri-check-line text-[10px] ${isTeal ? styles.stepCheckTeal : styles.stepCheckOrange}`} />
                  </div>
                  <span className="text-xs text-gray-500">{step}</span>
                </div>
              ))}
            </div>
            <div className={`mt-6 flex items-center gap-2 text-sm font-semibold ${isTeal ? styles.cardAccentTealText : styles.cardAccentOrangeText}`}>
              Start {mode.title}
              <i className="ri-arrow-right-line" />
            </div>
          </Link>
          );
        })}
      </div>

      <div className="max-w-4xl bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#1a2340] mb-3 flex items-center gap-2">
          <i className={`ri-lightbulb-line ${styles.tipIcon}`} />
          Upload Tips
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {uploadTips.map((tip) => (
            <div key={tip.title} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.tipIconBg}`}>
                <i className={`${tip.icon} text-sm ${styles.tipIcon}`} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#1a2340]">{tip.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tip.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
