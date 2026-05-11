"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

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
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3051';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ fullName: string; email: string; role: string } | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  const isSettingsActive = pathname.startsWith('/org-admin/settings');
  const current = pageMeta[pathname] ?? { title: 'Organization Admin', icon: 'ri-building-2-line' };
  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/session`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { user?: { fullName?: string; email?: string; role?: string } };
      })
      .then((data) => {
        if (!data?.user) return;
        setSessionUser({
          fullName: data.user.fullName ?? 'Organization Admin',
          email: data.user.email ?? '',
          role: data.user.role ?? 'ORG_ADMIN',
        });
      })
      .catch(() => {
        // Keep static fallback labels.
      });
  }, [API_BASE_URL]);

  const displayName = sessionUser?.fullName?.trim() || 'Organization Admin';
  const displayRole = sessionUser?.role === 'ORG_ADMIN' ? 'Organization Admin' : (sessionUser?.role ?? 'Organization Admin');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'OA';

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await fetch(`${API_BASE_URL}/auth/signout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Redirect anyway.
    }
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
      {showSignOutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSignOutModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-logout-box-r-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-brand-navy mb-1">Sign out of Custodox?</h3>
              <p className="text-sm text-brand-muted">You will be returned to the sign in page.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowSignOutModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={handleSignOut} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap">Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}

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
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-3 sm:px-4 md:px-5 gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-all"
          >
            <i className="ri-menu-line" />
          </button>

          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-gray-400 hidden sm:inline">Custodox</span>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <div className="flex items-center gap-1.5 text-brand-navy font-medium min-w-0">
              <i className={`${current.icon} text-[#0097B2]`} />
              <span className="truncate">{current.title}</span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-all relative"
            >
              <i className="ri-notification-3-line text-lg" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-brand-navy text-sm">Notifications</span>
                </div>
                {notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer ${n.unread ? 'bg-[#0097B2]/5' : ''}`}>
                    <p className="text-sm text-brand-navy">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-[#0097B2] flex items-center justify-center">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
              <span className="text-sm font-medium text-brand-navy hidden md:block">{displayName}</span>
              <i className="ri-arrow-down-s-line text-gray-400 text-sm" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-brand-navy truncate">{displayName}</div>
                  <div className="text-xs text-[#0097B2]">{displayRole}</div>
                </div>
                <Link href="/org-admin/settings/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors">
                  <i className="ri-user-line" />
                  Profile Settings
                </Link>
                <Link href="/org-admin/settings/activity" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors">
                  <i className="ri-list-check-2" />
                  Activity
                </Link>
                <div className="border-t border-gray-100" />
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => { setShowUserMenu(false); setShowSignOutModal(true); }}
                >
                  <i className="ri-logout-box-r-line" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" onClick={() => { setShowNotifs(false); setShowUserMenu(false); setMobileNavOpen(false); }}>
          {children}
        </main>
      </div>

    </div>
  );
}
