"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

const TEAL = '#0097B2';

const navItems = [
  { path: '/user/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/user/upload-documents', label: 'Upload Documents', icon: 'ri-upload-cloud-2-line' },
  { path: '/user/documents', label: 'All Documents', icon: 'ri-file-list-3-line' },
  { path: '/user/search', label: 'Global Search', icon: 'ri-search-line' },
  { path: '/user/advanced-search', label: 'Advanced Search', icon: 'ri-search-eye-line' },
  { path: '/user/settings/profile', label: 'Settings', icon: 'ri-settings-3-line' },
];

type UserLayoutProps = {
  children: ReactNode;
};

export default function UserLayout({ children }: UserLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileNavOpen((prev) => !prev);
      return;
    }
    setCollapsed((prev) => !prev);
  };

  const handleNavSelect = () => {
    setMobileNavOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] font-inter">

      {/* Sidebar */}
      <aside className={`
        ${collapsed ? 'md:w-16' : 'md:w-60'}
        w-60
        fixed top-0 left-0 h-screen
        z-[90]
        bg-white border-r border-gray-200
        flex flex-col
        transition-all duration-200
        ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Logo */}
<div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
  <img
    src="/images/DIV-5.png"
    alt="Custodox Logo"
    className="w-9 h-9 rounded-xl object-contain flex-shrink-0"
  />
  {!collapsed && (
    <div>
      <div className="font-bold text-[#1a2340] text-base">
        Custo<span style={{ color: TEAL }}>dox</span>
      </div>
      <div className="text-[10px]" style={{ color: TEAL }}>User Portal</div>
    </div>
  )}
</div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleNavSelect}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition ${
                  active ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
                } ${collapsed ? 'justify-center' : ''}`}
                style={active ? { background: TEAL } : {}}
              >
                <i className={`${item.icon}`} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-gray-100 py-3 px-2">
          <div className={`flex items-center gap-3 px-3 py-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center bg-orange-500 text-white text-xs font-bold">
              AH
            </div>
            {!collapsed && (
              <div>
                <div className="text-xs font-semibold">Alex Harrison</div>
                <div className="text-[10px] text-amber-600">User</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main — no topbar */}
      <div className={`flex-1 flex flex-col ${collapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}