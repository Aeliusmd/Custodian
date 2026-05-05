'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TEAL = '#0097B2';

const settingsTabs = [
  {
    path: '/user/settings/profile',
    label: 'Profile',
    sublabel: 'Personal info & password',
    icon: 'ri-user-line',
  },
  {
    path: '/user/settings/notifications',
    label: 'Notifications',
    sublabel: 'Manage your alerts',
    icon: 'ri-notification-3-line',
  },
];

export default function UserSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full min-h-0 bg-[#f8f9fb] font-inter">
      {/* Left sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col py-6">
        <div className="px-5 mb-6">
          <h1 className="text-lg font-bold text-[#1a2340]">Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your account &amp; preferences</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {settingsTabs.map((tab) => {
            const active = pathname === tab.path;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-150 group cursor-pointer ${
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
                  <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{tab.sublabel}</p>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}