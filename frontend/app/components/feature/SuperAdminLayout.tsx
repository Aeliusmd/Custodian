"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

const TEAL = '#0097B2';

const navItems = [
  { path: '/super-admin/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { path: '/super-admin/organizations', label: 'Organizations', icon: 'ri-building-2-line' },
  { path: '/super-admin/billing', label: 'Billing', icon: 'ri-bank-card-line' },
  { path: '/super-admin/settings', label: 'Admin Settings', icon: 'ri-settings-3-line' },
  { path: '/super-admin/activity-logs', label: 'Activity Logs', icon: 'ri-list-check-2' },
];

const pageMeta: Record<string, { title: string; icon: string }> = {
  '/super-admin/dashboard': { title: 'Dashboard', icon: 'ri-dashboard-line' },
  '/super-admin/organizations': { title: 'Organizations', icon: 'ri-building-2-line' },
  '/super-admin/billing': { title: 'Billing Management', icon: 'ri-bank-card-line' },
  '/super-admin/settings': { title: 'Admin Settings', icon: 'ri-settings-3-line' },
  '/super-admin/activity-logs': { title: 'Activity Logs', icon: 'ri-list-check-2' },
};

const notifications = [
  { id: 1, text: 'New organization registered: Apex Legal Group', time: '12 min ago', unread: true },
  { id: 2, text: 'Plan expiring soon: Coastal Insurance (3 days)', time: '1 hr ago', unread: true },
  { id: 3, text: 'Billing plan updated: Enterprise → $699/mo', time: '3 hr ago', unread: false },
];

type SuperAdminLayoutProps = {
  children: ReactNode;
};

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [search, setSearch] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const current = pageMeta[pathname] ?? { title: 'Super Admin', icon: 'ri-shield-star-line' };
  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    setShowSignOutModal(false);
    router.push('/auth/signin');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fb] font-inter">
      {mobileSidebarOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sign Out Modal */}
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

      {/* Sidebar — white theme */}
      <aside
        className={`${collapsed ? 'md:w-16' : 'md:w-60'} fixed inset-y-0 left-0 z-50 w-72 md:static flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden transform ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
          <Image
            src="/images/DIV-5.png"
            alt="Custodox logo"
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
            priority
          />
          {!collapsed && (
            <div>
              <div className="font-outfit font-bold text-brand-navy text-base tracking-wide whitespace-nowrap">
                Custo<span className="text-[#0097B2]">dox</span>
              </div>
              <div className="text-[10px] font-medium text-[#0097B2] whitespace-nowrap">Super Admin Portal</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap mb-0.5 ${
                  active
                    ? 'bg-[#0097B2] text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-brand-navy'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <i className={`${item.icon} text-base`} />
                </div>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user */}
        <div className="border-t border-gray-100 py-3 px-2">
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-all ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-[#0097B2] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">SC</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-brand-navy truncate">Sarah Chen</div>
                <div className="text-[10px] text-[#0097B2] truncate font-medium">Super Admin</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar — white theme */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-3 sm:px-4 md:px-5 gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={() => { setMobileSidebarOpen(true); setShowNotifs(false); setShowUserMenu(false); }}
            aria-label="Open sidebar"
            title="Open sidebar"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-all"
          >
            <i className="ri-menu-line" />
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-all"
          >
            <i className={collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-gray-400 hidden sm:inline">Custodox</span>
            <span className="text-gray-300 hidden sm:inline">/</span>
            <div className="flex items-center gap-1.5 text-brand-navy font-medium min-w-0">
              <i className={`${current.icon} text-[#0097B2]`} />
              <span className="truncate">{current.title}</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-brand-body focus:outline-none focus:border-[#0097B2] transition-colors"
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          </div>

          {/* Notifications */}
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
                  <button className="text-xs text-[#0097B2] hover:underline">Mark all read</button>
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

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-[#0097B2] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SC</span>
              </div>
              <span className="text-sm font-medium text-brand-navy hidden md:block">Sarah Chen</span>
              <i className="ri-arrow-down-s-line text-gray-400 text-sm" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-brand-navy">Sarah Chen</div>
                  <div className="text-xs text-[#0097B2]">Super Admin</div>
                </div>
                <Link href="/super-admin/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors">
                  <i className="ri-user-line" />
                  Profile Settings
                </Link>
                <Link href="/super-admin/activity-logs" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors">
                  <i className="ri-list-check-2" />
                  Activity Logs
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

        {/* Content */}
        <main className="flex-1 overflow-y-auto" onClick={() => { setShowNotifs(false); setShowUserMenu(false); setMobileSidebarOpen(false); }}>
          {children}
        </main>
      </div>
    </div>
  );
}
