"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';

const navSections = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/flows/onboarding', label: 'Self-Onboarding', icon: 'ri-user-add-line' },
      { path: '/flows/custodian-ops', label: 'Custodian Ops', icon: 'ri-team-line' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { path: '/flows/document', label: 'Cases & Documents', icon: 'ri-folder-3-line' },
      { path: '/flows/access', label: 'Access & Sharing', icon: 'ri-shield-user-line' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { path: '/flows/billing', label: 'Billing', icon: 'ri-bank-card-line' },
      { path: '/flows/payment-failure', label: 'Payment Recovery', icon: 'ri-error-warning-line' },
    ],
  },
];

const pageMeta: Record<string, { title: string; icon: string }> = {
  '/dashboard': { title: 'Dashboard', icon: 'ri-dashboard-line' },
  '/flows/onboarding': { title: 'Self-Onboarding', icon: 'ri-user-add-line' },
  '/flows/billing': { title: 'Billing & Subscriptions', icon: 'ri-bank-card-line' },
  '/flows/document': { title: 'Cases & Documents', icon: 'ri-folder-3-line' },
  '/flows/access': { title: 'Access Control', icon: 'ri-shield-user-line' },
  '/flows/payment-failure': { title: 'Payment Recovery', icon: 'ri-error-warning-line' },
  '/flows/custodian-ops': { title: 'Custodian Operations', icon: 'ri-team-line' },
};

const notifications = [
  { id: 1, text: 'SLA alert: MDC-2026-00138 overdue by 4h', time: '10 min ago', unread: true },
  { id: 2, text: 'New intake request REQ-2026-0089 assigned', time: '32 min ago', unread: true },
  { id: 3, text: 'Payment retry scheduled for Apr 3', time: '1 hour ago', unread: false },
];

type AppLayoutProps = {
  children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const current = pageMeta[pathname] ?? { title: 'MEDCUBE', icon: 'ri-apps-line' };
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSignOut = () => {
    setShowSignOutModal(false);
    router.push('/auth/signin');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg font-inter">
      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSignOutModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-logout-box-r-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-brand-navy mb-1">Sign out of MEDCUBE?</h3>
              <p className="text-sm text-brand-muted">
                You&apos;ll be signed out and returned to the sign in page. Any unsaved changes will be lost.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap"
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
        } flex-shrink-0 bg-white border-r border-brand-border flex flex-col transition-all duration-200 overflow-hidden`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b border-brand-border ${collapsed ? 'justify-center' : ''}`}>
          <img
            src="https://public.readdy.ai/ai/img_res/a0c14596-4612-41a7-bcf3-8ba14244b461.png"
            alt="MEDCUBE"
            className="h-8 w-auto flex-shrink-0"
          />
          {!collapsed && (
            <span className="font-outfit font-bold text-brand-navy text-sm tracking-wide whitespace-nowrap">
              MEDCUBE
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          {navSections.map((section, si) => (
            <div key={si} className="mb-1">
              {section.title && !collapsed && (
                <div className="px-4 py-2 text-[10px] font-semibold text-brand-muted uppercase tracking-widest">
                  {section.title}
                </div>
              )}
              {section.title && collapsed && <div className="my-2 mx-3 border-t border-brand-border" />}
              {section.items.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap ${
                      active
                        ? 'bg-brand-cyan text-white'
                        : 'text-brand-body hover:bg-brand-surface hover:text-brand-navy'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <i className={`${item.icon} text-base`} />
                    </div>
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-brand-border py-3 px-2 space-y-1">
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-brand-body hover:bg-brand-surface hover:text-brand-navy transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Settings' : undefined}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-settings-3-line text-base" />
            </div>
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </button>
          <button
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-brand-body hover:bg-brand-surface hover:text-brand-navy transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
            title={collapsed ? 'Help & Support' : undefined}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-question-line text-base" />
            </div>
            {!collapsed && <span className="text-sm font-medium">Help & Support</span>}
          </button>
          {/* User chip */}
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-brand-surface transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-7 h-7 bg-brand-cyan rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">SC</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-brand-navy truncate">Sarah Chen</div>
                <div className="text-[10px] text-brand-muted truncate">Super Admin</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-brand-border flex items-center px-5 gap-4 flex-shrink-0">
          {/* Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-navy hover:bg-brand-surface transition-all"
          >
            <i className={collapsed ? 'ri-menu-unfold-line' : 'ri-menu-fold-line'} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link href="/dashboard" className="text-brand-muted hover:text-brand-cyan transition-colors">
              MEDCUBE 
            </Link>
            <span className="text-brand-border">/</span>
            <div className="flex items-center gap-1.5 text-brand-navy font-medium">
              <i className={`${current.icon} text-brand-cyan`} />
              <span>{current.title}</span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search cases, docs..."
              className="w-56 pl-9 pr-4 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-body focus:outline-none focus:border-brand-cyan transition-colors"
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-sm" />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-brand-navy hover:bg-brand-surface transition-all relative"
            >
              <i className="ri-notification-3-line text-lg" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-10 w-80 bg-white border border-brand-border rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
                  <span className="font-semibold text-brand-navy text-sm">Notifications</span>
                  <button className="text-xs text-brand-cyan hover:underline">Mark all read</button>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-brand-border last:border-0 hover:bg-brand-surface cursor-pointer ${
                      n.unread ? 'bg-brand-cyan-light/30' : ''
                    }`}
                  >
                    <p className="text-sm text-brand-navy">{n.text}</p>
                    <p className="text-xs text-brand-muted mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-brand-surface transition-all"
            >
              <div className="w-7 h-7 bg-brand-cyan rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">SC</span>
              </div>
              <span className="text-sm font-medium text-brand-navy hidden md:block">Sarah Chen</span>
              <i className="ri-arrow-down-s-line text-brand-muted text-sm" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-10 w-44 bg-white border border-brand-border rounded-xl overflow-hidden z-50">
                {[
                  { icon: 'ri-user-line', label: 'Profile' },
                  { icon: 'ri-settings-3-line', label: 'Settings' },
                  { icon: 'ri-shield-keyhole-line', label: 'Security' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-body hover:bg-brand-surface hover:text-brand-navy transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <i className={item.icon} />
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-brand-border" />
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
        <main className="flex-1 overflow-y-auto" onClick={() => { setShowNotifs(false); setShowUserMenu(false); }}>
          {children}
        </main>
      </div>
    </div>
  );
}
