'use client';

import { useState } from 'react';

const TEAL = '#0097B2';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: string;
}

interface Toast {
  id: number;
  message: string;
}

const INITIAL_SETTINGS: NotificationSetting[] = [
  { id: 'email_notifications', label: 'Email Notifications', description: 'Receive email alerts for important system events and updates', icon: 'ri-mail-send-line', enabled: true, category: 'General' },
  { id: 'upload_notifications', label: 'Upload Notifications', description: 'Get notified when one of your documents uploads successfully', icon: 'ri-upload-cloud-2-line', enabled: true, category: 'Documents' },
  { id: 'sharing_notifications', label: 'Sharing Notifications', description: 'Receive alerts when documents are shared with you', icon: 'ri-share-line', enabled: true, category: 'Documents' },
  { id: 'version_notifications', label: 'Version Updates', description: 'Be notified when a new version of a document you follow is uploaded', icon: 'ri-history-line', enabled: false, category: 'Documents' },
  { id: 'login_notifications', label: 'Login Activity', description: 'Receive email alerts for sign-ins from new devices or unusual locations', icon: 'ri-shield-check-line', enabled: true, category: 'Security' },
  { id: 'storage_notifications', label: 'Storage Limit Warnings', description: 'Get notified when your storage usage reaches 80% or 95% of your limit', icon: 'ri-database-2-line', enabled: true, category: 'System' },
  { id: 'report_notifications', label: 'Weekly Summary Report', description: 'Receive a weekly digest of your upload activity and document stats', icon: 'ri-bar-chart-2-line', enabled: false, category: 'Reports' },
];

export default function UserNotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>(INITIAL_SETTINGS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const toggle = (id: string) => {
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setHasChanges(true);
  };

  const enableAll = () => { setSettings((prev) => prev.map((s) => ({ ...s, enabled: true }))); setHasChanges(true); };
  const disableAll = () => { setSettings((prev) => prev.map((s) => ({ ...s, enabled: false }))); setHasChanges(true); };

  const handleSave = () => { setHasChanges(false); showToast('Notification preferences saved'); };

  const categories = Array.from(new Set(settings.map((s) => s.category)));
  const enabledCount = settings.filter((s) => s.enabled).length;

  return (
    <div className="p-6 min-h-full font-inter">
      {/* Toast */}
      <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 bg-green-500">
            <i className="ri-checkbox-circle-line" />
            {t.message}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a2340]">Notification Preferences</h1>
        <p className="text-sm text-gray-400 mt-0.5">Control which notifications you receive</p>
      </div>

      <div className="max-w-2xl">
        {/* Summary Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${TEAL}15` }}>
              <i className="ri-notification-3-line text-base" style={{ color: TEAL }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2340]">{enabledCount} of {settings.length} notifications enabled</p>
              <div className="w-40 h-1.5 bg-gray-100 rounded-full mt-1.5">
                <div className="h-full rounded-full transition-all" style={{ width: `${(enabledCount / settings.length) * 100}%`, background: TEAL }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={enableAll} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Enable All</button>
            <button onClick={disableAll} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Disable All</button>
          </div>
        </div>

        {/* Settings by Category */}
        {categories.map((category) => {
          const catSettings = settings.filter((s) => s.category === category);
          return (
            <div key={category} className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{category}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {catSettings.map((setting) => (
                  <div key={setting.id} className="flex items-start gap-4 px-5 py-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${setting.enabled ? '' : 'bg-gray-100'}`} style={setting.enabled ? { background: `${TEAL}15` } : {}}>
                      <i className={`${setting.icon} text-sm transition-colors ${setting.enabled ? '' : 'text-gray-300'}`} style={setting.enabled ? { color: TEAL } : {}} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-semibold transition-colors ${setting.enabled ? 'text-[#1a2340]' : 'text-gray-400'}`}>{setting.label}</p>
                          <p className={`text-xs mt-0.5 transition-colors ${setting.enabled ? 'text-gray-400' : 'text-gray-300'}`}>{setting.description}</p>
                        </div>
                        <button
                          onClick={() => toggle(setting.id)}
                          className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 mt-1 ${setting.enabled ? 'bg-[#0097B2]' : 'bg-gray-200'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${setting.enabled ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {hasChanges && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <i className="ri-error-warning-line" />
              Unsaved changes
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${hasChanges ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
            style={{ background: TEAL }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}