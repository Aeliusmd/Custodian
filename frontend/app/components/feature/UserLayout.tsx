'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const TEAL = '#0097B2';

const navItems = [
  { path: '/user/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/user/upload-documents', label: 'Upload Documents', icon: 'ri-upload-cloud-2-line' },
  { path: '/user/documents', label: 'All Documents', icon: 'ri-file-list-3-line' },
  { path: '/user/search', label: 'Global Search', icon: 'ri-search-line' },
  { path: '/user/advanced-search', label: 'Advanced Search', icon: 'ri-search-eye-line' },
];

const settingsItems = [
  { path: '/user/settings/profile', label: 'My Profile', icon: 'ri-user-settings-line' },
  { path: '/user/settings/activity', label: 'Activity Log', icon: 'ri-list-check-2' },
  { path: '/user/settings/notifications', label: 'Notifications', icon: 'ri-notification-3-line' },
];

const pageMeta: Record<string, { title: string; icon: string }> = {
  '/user/dashboard': { title: 'Dashboard', icon: 'ri-dashboard-line' },
  '/user/upload-documents': { title: 'Upload Documents', icon: 'ri-upload-cloud-2-line' },
  '/user/documents': { title: 'All Documents', icon: 'ri-file-list-3-line' },
  '/user/search': { title: 'Global Search', icon: 'ri-search-line' },
  '/user/advanced-search': { title: 'Advanced Search', icon: 'ri-search-eye-line' },
  '/user/settings/profile': { title: 'Settings', icon: 'ri-settings-3-line' },
  '/user/settings/activity': { title: 'Settings', icon: 'ri-settings-3-line' },
  '/user/settings/notifications': { title: 'Settings', icon: 'ri-settings-3-line' },
};

const notifications = [
  { id: 1, text: '5 new documents added in Legal Contracts', time: '10 min ago', unread: true },
  { id: 2, text: 'Your document was approved by admin', time: '2 hr ago', unread: true },
  { id: 3, text: 'Shared document "Q1 Report 2026" is now available', time: '5 hr ago', unread: false },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ✅ Next.js: usePathname instead of useLocation
  const pathname = usePathname();
  // ✅ Next.js: useRouter instead of useNavigate
  const router = useRouter();

  const isSettingsActive = settingsItems.some((s) => pathname.startsWith(s.path));
  const current = pageMeta[pathname] ?? { title: 'User Portal', icon: 'ri-user-line' };
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSignOut = () => {
    setShowSignOutModal(false);
    // ✅ Next.js: router.push instead of navigate
    router.push('/sign-in');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb] font-inter">
      {/* Sign Out Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSignOutModal(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-logout-box-r-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-[#1a2340] mb-1">Sign out of Custodox?</h3>
              <p className="text-sm text-gray-400">You will be returned to the sign in page.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: TEAL }}
          >
            <i className="ri-file-shield-2-fill text-white text-lg" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-outfit font-bold text-[#1a2340] text-base tracking-wide whitespace-nowrap">
                Custo<span style={{ color: TEAL }}>dox</span>
              </div>
              <div className="text-[10px] font-medium whitespace-nowrap" style={{ color: TEAL }}>
                User Portal
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              // ✅ Next.js: Link from 'next/link' (no 'to' prop — uses 'href')
              <Link
                key={item.path}
                href={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap mb-0.5 ${
                  active ? 'text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1a2340]'
                } ${collapsed ? 'justify-center' : ''}`}
                style={active ? { background: TEAL } : {}}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <i className={`${item.icon} text-base`} />
                </div>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}

          {/* Settings Accordion */}
          <div className="mx-2 mb-0.5">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              title={collapsed ? 'Settings' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap ${
                isSettingsActive ? 'text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1a2340]'
              } ${collapsed ? 'justify-center' : ''}`}
              style={isSettingsActive ? { background: TEAL } : {}}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <i className="ri-settings-3-line text-base" />
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">Settings</span>
                  {settingsOpen ? (
                    <i className="ri-arrow-up-s-line text-sm" />
                  ) : (
                    <i className="ri-arrow-down-s-line text-sm" />
                  )}
                </>
              )}
            </button>
            {settingsOpen && !collapsed && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {settingsItems.map((s) => {
                  const active = pathname === s.path;
                  return (
                    <Link
                      key={s.path}
                      href={s.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 whitespace-nowrap text-sm ${
                        active ? 'font-semibold' : 'text-gray-400 hover:bg-gray-50 hover:text-[#1a2340]'
                      }`}
                      style={active ? { color: TEAL } : {}}
                    >
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        <i className={`${s.icon} text-sm`} />
                      </div>
                      <span>{s.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom user */}
        <div className="border-t border-gray-100 py-3 px-2">
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#d97706' }}
            >
              <span className="text-white text-xs font-bold">AH</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#1a2340] truncate">Alex Harrison</div>
                <div className="text-[10px] font-medium truncate text-amber-600">User</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-5 gap-4 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#1a2340] hover:bg-gray-100 transition-all"
          >
            <i className={collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} />
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Custodox</span>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-1.5 text-[#1a2340] font-medium">
              <i className={`${current.icon} text-sm`} style={{ color: TEAL }} />
              <span>{current.title}</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Quick Upload CTA */}
          <Link
            href="/user/upload-documents"
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors whitespace-nowrap"
            style={{ background: TEAL }}
          >
            <i className="ri-upload-cloud-2-line text-sm" />
            Upload Document
          </Link>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setShowUserMenu(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#1a2340] hover:bg-gray-100 transition-all relative"
            >
              <i className="ri-notification-3-line text-lg" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-[#1a2340] text-sm">Notifications</span>
                  <button className="text-xs hover:underline" style={{ color: TEAL }}>
                    Mark all read
                  </button>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer ${
                      n.unread ? 'bg-[#0097B2]/5' : ''
                    }`}
                  >
                    <p className="text-sm text-[#1a2340]">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: '#d97706' }}
              >
                <span className="text-white text-xs font-bold">AH</span>
              </div>
              <span className="text-sm font-medium text-[#1a2340] hidden md:block">Alex Harrison</span>
              <i className="ri-arrow-down-s-line text-gray-400 text-sm" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-[#1a2340]">Alex Harrison</div>
                  <div className="text-xs text-amber-600">User</div>
                </div>
                <Link
                  href="/user/settings/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1a2340] transition-colors"
                >
                  <i className="ri-user-line" />
                  My Profile
                </Link>
                <Link
                  href="/user/settings/activity"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-[#1a2340] transition-colors"
                >
                  <i className="ri-list-check-2" />
                  Activity Log
                </Link>
                <div className="border-t border-gray-100" />
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowSignOutModal(true);
                  }}
                >
                  <i className="ri-logout-box-r-line" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        {/* ✅ Next.js: {children} instead of <Outlet /> */}
        <main
          className="flex-1 overflow-y-auto"
          onClick={() => {
            setShowNotifs(false);
            setShowUserMenu(false);
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}