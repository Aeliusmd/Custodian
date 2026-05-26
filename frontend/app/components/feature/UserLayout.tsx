"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

const TEAL = '#0097B2';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

type UserLayoutProps = {
  children: ReactNode;
  userId: string;
};

export default function UserLayout({ children, userId }: UserLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [sessionUser, setSessionUser] = useState<{ fullName: string; email: string } | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/session`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { user?: { fullName?: string; email?: string } };
      })
      .then((data) => {
        if (!data?.user) return;
        setSessionUser({
          fullName: data.user.fullName ?? '',
          email: data.user.email ?? '',
        });
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    setShowSignOutModal(false);
    try {
      await fetch(`${API_BASE_URL}/auth/signout`, { method: 'POST', credentials: 'include' });
    } catch { /* redirect anyway */ }
    router.push('/auth/signin');
  };

  const displayName = sessionUser?.fullName?.trim() || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || 'U';

  const base = '/user';
  const navItems = [
    { path: `${base}/dashboard`, label: 'Dashboard', icon: 'ri-dashboard-line' },
    { path: `${base}/upload-documents`, label: 'Upload Documents', icon: 'ri-upload-cloud-2-line' },
    { path: `${base}/documents`, label: 'All Documents', icon: 'ri-file-list-3-line' },
    { path: `${base}/search`, label: 'Global Search', icon: 'ri-search-line' },
    { path: `${base}/advanced-search`, label: 'Advanced Search', icon: 'ri-search-eye-line' },
    { path: `${base}/settings/profile`, label: 'Settings', icon: 'ri-settings-3-line' },
  ];

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

      {/* Sign-out confirmation modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSignOutModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-logout-box-r-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-[#1a2340] mb-1">Sign out of Custodox?</h3>
              <p className="text-sm text-gray-400">You will be returned to the sign in page.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setShowSignOutModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={() => void handleSignOut()} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap">Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}

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

        {/* User + Sign Out */}
        <div className="border-t border-gray-100 py-3 px-2 space-y-1">
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: TEAL }}>
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1a2340] truncate">{displayName}</div>
                <div className="text-[10px]" style={{ color: TEAL }}>User</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSignOutModal(true)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <i className="ri-logout-box-r-line flex-shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
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