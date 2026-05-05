"use client";

import { useEffect, useState } from 'react';
import { settingsApi } from '@/app/org-admin/settings/lib/api';
import type { NotificationSetting } from '@/app/org-admin/settings/lib/types';

const TEAL = '#0097B2';

interface Toast {
  id: number;
  message: string;
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      const savedSettings = await settingsApi.getNotificationSettings();
      setSettings(savedSettings);
      setIsLoading(false);
    };

    void loadSettings();
  }, []);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const toggle = (id: string) => {
    setSettings((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
    setHasChanges(true);
  };

  const enableAll = () => {
    setSettings((prev) => prev.map((s) => ({ ...s, enabled: true })));
    setHasChanges(true);
  };

  const disableAll = () => {
    setSettings((prev) => prev.map((s) => ({ ...s, enabled: false })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updated = await settingsApi.updateNotificationSettings(settings);
    setSettings(updated);
    setHasChanges(false);
    setIsSaving(false);
    showToast('Notification preferences saved');
  };

  const categories = Array.from(new Set(settings.map((s) => s.category)));
  const enabledCount = settings.filter((s) => s.enabled).length;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 min-h-full font-inter">
        <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
          Loading notification preferences...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 min-h-full font-inter">
      {/* Toast */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[999] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-sm">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 bg-green-500">
            <i className="ri-checkbox-circle-line" />
            {t.message}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#1a2340]">Notification Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">Control which notifications you receive</p>
      </div>

      <div className="max-w-2xl">
        {/* Summary Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={enableAll} className="flex-1 sm:flex-none text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Enable All</button>
            <button onClick={disableAll} className="flex-1 sm:flex-none text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Disable All</button>
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
                  <div key={setting.id} className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
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
                          title={setting.enabled ? `Disable ${setting.label}` : `Enable ${setting.label}`}
                          aria-label={setting.enabled ? `Disable ${setting.label}` : `Enable ${setting.label}`}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
          {hasChanges && (
            <p className="text-xs text-amber-500 flex items-center gap-1">
              <i className="ri-error-warning-line" />
              Unsaved changes
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${hasChanges ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
            style={{ background: TEAL }}
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
