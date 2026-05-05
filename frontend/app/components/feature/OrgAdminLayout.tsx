"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

const navItems = [
  { path: '/org-admin/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/org-admin/upload-documents', label: 'Upload Documents', icon: 'ri-upload-cloud-2-line' },
  { path: '/org-admin/categories', label: 'Category Management', icon: 'ri-folder-settings-line' },
  { path: '/org-admin/documents', label: 'All Documents', icon: 'ri-file-list-3-line' },
  { path: '/org-admin/users', label: 'User Management', icon: 'ri-team-line' },
  { path: '/org-admin/search', label: 'Global Search', icon: 'ri-search-line' },
  { path: '/org-admin/advanced-search', label: 'Advanced Search', icon: 'ri-search-eye-line' },
];

const pageMeta: Record<string, { title: string; icon: string }> = {
  '/org-admin/dashboard': { title: 'Dashboard', icon: 'ri-dashboard-line' },
  '/org-admin/upload-documents': { title: 'Upload Documents', icon: 'ri-upload-cloud-2-line' },
  '/org-admin/categories': { title: 'Category Management', icon: 'ri-folder-settings-line' },
  '/org-admin/documents': { title: 'All Documents', icon: 'ri-file-list-3-line' },
  '/org-admin/users': { title: 'User Management', icon: 'ri-team-line' },
  '/org-admin/search': { title: 'Global Search', icon: 'ri-search-line' },
  '/org-admin/advanced-search': { title: 'Advanced Search', icon: 'ri-search-eye-line' },
  '/org-admin/settings/profile': { title: 'Admin Profile', icon: 'ri-user-settings-line' },
};

const notifications = [
  { id: 1, text: '12 new documents uploaded today', time: '5 min ago', unread: true },
  { id: 2, text: 'Storage usage at 82% — consider upgrading', time: '1 hr ago', unread: true },
  { id: 3, text: 'User James Whitfield added to Legal team', time: '3 hr ago', unread: false },
];

type OrgAdminLayoutProps = {
  children: ReactNode;
};

export default function OrgAdminLayout({ children }: OrgAdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const isSettingsActive = pathname.startsWith('/org-admin/settings');
  const current = pageMeta[pathname] ?? { title: 'Organization Admin', icon: 'ri-building-2-line' };
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSignOut = () => {
    setShowSignOutModal(false);
    router.push('/auth/signin');
  };

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileNavOpen((prev) => !prev);
      return;
    }
    setCollapsed((prev) => !prev);
  };

  const handleNavSelect = () => {
    setMobileNavOpen(false);
    setShowNotifs(false);
    setShowUserMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] font-inter">

      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'md:w-16' : 'md:w-60'} 
        w-60 fixed inset-y-0 left-0 z-[90] 
        flex-shrink-0 bg-white border-r border-gray-200 
        flex flex-col transition-transform duration-200 overflow-hidden 
        ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >

        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
          <Image
            src="/images/DIV-5.png"
            alt="Custodox logo"
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover"
          />
          {!collapsed && (
            <div>
              <div className="font-bold text-[#1a2340]">
                Custo<span className="text-[#0097B2]">dox</span>
              </div>
              <div className="text-xs text-[#0097B2]">Organization Admin</div>
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
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg ${
                  active ? 'bg-[#0097B2] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <i className={item.icon} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Settings */}
          <Link
            href="/org-admin/settings/profile"
            onClick={handleNavSelect}
            className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg ${
              isSettingsActive ? 'bg-[#0097B2] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <i className="ri-settings-3-line" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${collapsed ? 'md:ml-16' : 'md:ml-60'}`}>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}