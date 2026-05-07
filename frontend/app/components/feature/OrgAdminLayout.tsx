"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

const TEAL = "#0097B2";

const navItems = [
  {
    path: "/org-admin/dashboard",
    label: "Dashboard",
    icon: "ri-dashboard-line",
  },
  {
    path: "/org-admin/upload-documents",
    label: "Upload Documents",
    icon: "ri-upload-cloud-2-line",
  },
  {
    path: "/org-admin/categories",
    label: "Category Management",
    icon: "ri-folder-settings-line",
  },
  {
    path: "/org-admin/documents",
    label: "All Documents",
    icon: "ri-file-list-3-line",
  },
  { path: "/org-admin/users", label: "User Management", icon: "ri-team-line" },
  { path: "/org-admin/search", label: "Global Search", icon: "ri-search-line" },
  {
    path: "/org-admin/advanced-search",
    label: "Advanced Search",
    icon: "ri-search-eye-line",
  },
];

const pageMeta: Record<string, { title: string; icon: string }> = {
  "/org-admin/dashboard": { title: "Dashboard", icon: "ri-dashboard-line" },
  "/org-admin/upload-documents": {
    title: "Upload Documents",
    icon: "ri-upload-cloud-2-line",
  },
  "/org-admin/categories": {
    title: "Category Management",
    icon: "ri-folder-settings-line",
  },
  "/org-admin/documents": {
    title: "All Documents",
    icon: "ri-file-list-3-line",
  },
  "/org-admin/users": { title: "User Management", icon: "ri-team-line" },
  "/org-admin/search": { title: "Global Search", icon: "ri-search-line" },
  "/org-admin/advanced-search": {
    title: "Advanced Search",
    icon: "ri-search-eye-line",
  },
  "/org-admin/settings/profile": {
    title: "Admin Profile",
    icon: "ri-user-settings-line",
  },
};

const notifications = [
  {
    id: 1,
    text: "12 new documents uploaded today",
    time: "5 min ago",
    unread: true,
  },
  {
    id: 2,
    text: "Storage usage at 82% — consider upgrading",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: 3,
    text: "User James Whitfield added to Legal team",
    time: "3 hr ago",
    unread: false,
  },
];

type Props = {
  children: ReactNode;
};

export default function OrgAdminLayout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [search, setSearch] = useState("");

  const pathname = usePathname();
  const router = useRouter();

  const isSettingsActive = pathname.startsWith("/org-admin/settings");
  const current = pageMeta[pathname] ?? {
    title: "Organization Admin",
    icon: "ri-building-2-line",
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSignOut = () => {
    setShowSignOutModal(false);
    router.push("/auth/signin");
  };

  const handleNavSelect = () => {
    setMobileNavOpen(false);
    setShowNotifs(false);
    setShowUserMenu(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] font-inter">
      {mobileNavOpen && (
        <button
          aria-label="Close sidebar"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] md:hidden"
        />
      )}

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
              <h3 className="text-base font-semibold text-brand-navy mb-1">
                Sign out of Custodox?
              </h3>
              <p className="text-sm text-brand-muted">
                You will be returned to the sign in page.
              </p>
            </div>
            <div className="flex gap-3 w-full">
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
        className={`${collapsed ? "md:w-16" : "md:w-60"} 
  w-60 fixed inset-y-0 left-0 z-[90] 
  flex-shrink-0 bg-white border-r border-gray-200 
  flex flex-col transition-transform duration-200 
  ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
          <Image src="/images/DIV-5.png" alt="logo" width={36} height={36} />
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
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={handleNavSelect}
                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg ${
                  active
                    ? "bg-[#0097B2] text-white"
                    : "text-gray-500 hover:bg-gray-50"
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
              isSettingsActive
                ? "bg-[#0097B2] text-white"
                : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <i className="ri-settings-3-line" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </nav>

        {/* Bottom user */}
        <div className="border-t border-gray-200 py-3 px-2">
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-all ${collapsed ? "justify-center" : ""}`}
          >
            <div className="w-7 h-7 rounded-full bg-[#0097B2] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">SC</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-semibold text-brand-navy truncate">
                  James Whitfield
                </div>
                <div className="text-[10px] text-[#0097B2] truncate font-medium">
                  Org Admin
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div
        className={`flex-1 flex flex-col ${collapsed ? "md:ml-16" : "md:ml-60"}`}
      >
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
          {/* Mobile */}
          <button onClick={() => setMobileNavOpen(true)} className="md:hidden">
            <i className="ri-menu-line text-lg" />
          </button>

          {/* Collapse */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:block text-gray-400 hover:text-gray-600"
          >
            <i
              className={
                collapsed ? "ri-menu-unfold-line" : "ri-menu-fold-line"
              }
            />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Custodox</span>
            <span>/</span>
            <span className="flex items-center gap-1 text-[#1a2340] font-medium">
              <i className={`${current.icon} text-[#0097B2]`} />
              {current.title}
            </span>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden md:block relative">
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0097B2]"
            />
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setShowUserMenu(false);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-navy hover:bg-gray-100 transition-all relative"
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
                  <span className="font-semibold text-brand-navy text-sm">
                    Notifications
                  </span>
                  <button className="text-xs text-[#0097B2] hover:underline">
                    Mark all read
                  </button>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer ${n.unread ? "bg-[#0097B2]/5" : ""}`}
                  >
                    <p className="text-sm text-brand-navy">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-[#0097B2] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SC</span>
              </div>
              <span className="text-sm font-medium text-brand-navy hidden md:block">
                James Whitfield
              </span>
              <i className="ri-arrow-down-s-line text-gray-400 text-sm" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-brand-navy">
                    James Whitfield
                  </div>
                  <div className="text-xs text-[#0097B2]">org Admin</div>
                </div>

                <Link
                  href="/org-admin/settings/profile" // ✅ was /org-admin/settings
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors"
                >
                  <i className="ri-user-line" />
                  Profile Settings
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
        <main
          className="flex-1 overflow-y-auto"
          onClick={() => {
            setShowNotifs(false);
            setShowUserMenu(false);
            setMobileNavOpen(false);
          }}
        >
          {children}
        </main>
      </div>

      {/* Sign Out Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-xl">
            <p className="mb-4">Sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOutModal(false)}>Cancel</button>
              <button onClick={handleSignOut} className="text-red-500">
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
