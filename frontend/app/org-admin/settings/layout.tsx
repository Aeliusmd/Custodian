'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const TEAL = '#0097B2';

const settingsTabs = [
  {
    path: '/org-admin/settings/profile',
    label: 'Profile',
    sublabel: 'Personal info and password',
    icon: 'ri-user-line',
  },
  {
    path: '/org-admin/settings/activity',
    label: 'Activity Log',
    sublabel: 'System activity records',
    icon: 'ri-history-line',
  },
  {
    path: '/org-admin/settings/notifications',
    label: 'Notifications',
    sublabel: 'Manage your alerts',
    icon: 'ri-notification-3-line',
  },
];

type SettingsLayoutProps = {
  children: ReactNode;
};

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row bg-[#f8f9fb] font-inter">
      <aside className="w-full lg:w-64 flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col py-4 lg:py-6">
        <div className="px-4 sm:px-5 mb-3 lg:mb-6">
          <h1 className="text-lg font-bold text-[#1a2340]">Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your account and preferences</p>
        </div>

        <nav className="flex-1 px-3 space-y-1 lg:space-y-1 overflow-x-auto lg:overflow-x-visible">
          <div className="flex gap-2 lg:block lg:space-y-1 min-w-max lg:min-w-0">
          {settingsTabs.map((tab) => {
            const active = pathname === tab.path;

            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex items-center lg:items-start gap-3 px-3 py-3 rounded-xl transition-all duration-150 group min-w-[220px] sm:min-w-[250px] lg:min-w-0 ${
                  active ? 'bg-[#0097B2]/10' : 'hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    active ? 'bg-white' : 'bg-gray-100 group-hover:bg-white'
                  }`}
                  style={active ? { boxShadow: `0 0 0 1.5px ${TEAL}30` } : {}}
                >
                  <i
                    className={`${tab.icon} text-base transition-colors ${
                      active ? '' : 'text-gray-400 group-hover:text-[#1a2340]'
                    }`}
                    style={active ? { color: TEAL } : {}}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold transition-colors ${
                      active ? '' : 'text-gray-700 group-hover:text-[#1a2340]'
                    }`}
                    style={active ? { color: TEAL } : {}}
                  >
                    {tab.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap hidden sm:block lg:block">{tab.sublabel}</p>
                </div>
              </Link>
            );
          })}
          </div>
        </nav>
      </aside>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
