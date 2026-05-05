"use client";

import { useState } from 'react';
import { MOCK_USERS } from './mockData';
import type { OrgUser } from './types';
import UserModal from './UserModal/page';
import DeleteUserModal from './DeleteUserModal/page';
import ResetPasswordModal from './ResetPasswordModal/page';

const TEAL = '#0097B2';

type ModalType = 'create' | 'edit' | 'delete' | 'reset' | null;

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<OrgUser[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [activeUser, setActiveUser] = useState<OrgUser | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (filterStatus && u.status !== filterStatus) return false;
    return true;
  });

  const openModal = (type: ModalType, user?: OrgUser) => {
    setActiveUser(user ?? null);
    setModal(type);
    setActiveMenu(null);
  };

  const handleSave = (data: Omit<OrgUser, 'id' | 'createdDate' | 'avatar'> & { password?: string }) => {
    if (modal === 'create') {
      const initials = data.name.split(' ').map((part: string) => part[0]).join('').substring(0, 2).toUpperCase();
      const newUser: OrgUser = {
        id: `u${Date.now()}`,
        ...data,
        avatar: initials,
        createdDate: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      showToast(`User "${data.name}" created successfully`);
    } else if (modal === 'edit' && activeUser) {
      setUsers((prev) => prev.map((u) => (u.id === activeUser.id ? { ...u, ...data } : u)));
      showToast(`User "${data.name}" updated successfully`);
    }
    setModal(null);
  };

  const handleDelete = (id: string) => {
    const user = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setModal(null);
    showToast(`User "${user?.name}" deleted`);
  };

  const handleReset = () => {
    setModal(null);
    showToast(`Password reset for "${activeUser?.name}"`);
  };

  const activeCount = users.filter((u) => u.status === 'Active').length;
  const adminCount = users.filter((u) => u.role === 'Admin').length;

  return (
    <div className="px-4 py-5 sm:p-6 min-h-full font-inter" onClick={() => setActiveMenu(null)}>
      {/* Toast */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:top-5 sm:right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 ${t.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            <i className={t.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-alert-line'} />
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#1a2340]">User Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} users in your organization</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          style={{ background: TEAL }}
        >
          <i className="ri-user-add-line" />
          Create User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: 'ri-team-line', color: TEAL },
          { label: 'Active Users', value: activeCount, icon: 'ri-user-heart-line', color: '#10b981' },
          { label: 'Admin Users', value: adminCount, icon: 'ri-shield-user-line', color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15` }}>
              <i className={`${s.icon} text-lg`} style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2340]">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 lg:col-span-2">
            <i className="ri-search-line text-gray-400 text-sm" />
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none text-sm text-[#1a2340] bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search" title="Clear search" className="text-gray-300 hover:text-gray-500 cursor-pointer">
                <i className="ri-close-line text-sm" />
              </button>
            )}
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label="Filter by role"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer w-full"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none bg-white cursor-pointer w-full"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {(search || filterRole || filterStatus) && (
            <button
              onClick={() => { setSearch(''); setFilterRole(''); setFilterStatus(''); }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap lg:justify-self-end"
            >
              <i className="ri-filter-off-line" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">User</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Role</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Created Date</th>
                <th className="px-5 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400 px-4">
                    <i className="ri-user-search-line text-3xl block mb-2" />
                    <p className="text-sm">No users match your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-[#0097B2]/[0.03] transition-all">
                    <td className="px-4 sm:px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: TEAL }}>
                          {user.avatar}
                        </div>
                        <span className="text-sm font-semibold text-[#1a2340] whitespace-nowrap">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${user.role === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                        <i className={`mr-1 ${user.role === 'Admin' ? 'ri-shield-user-line' : 'ri-user-line'}`} />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                        <i className={`mr-1 ${user.status === 'Active' ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'}`} />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-4 text-sm text-gray-500 whitespace-nowrap">{user.createdDate}</td>
                    <td className="px-4 sm:px-5 py-4">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                          aria-label={`Open actions for ${user.name}`}
                          title={`Open actions for ${user.name}`}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${activeMenu === user.id ? 'bg-[#0097B2]/10 text-[#0097B2]' : 'text-gray-400 hover:bg-gray-100 hover:text-[#1a2340]'}`}
                        >
                          <i className="ri-more-2-fill text-base" />
                        </button>
                        {activeMenu === user.id && (
                          <div className="absolute right-0 top-10 w-52 bg-white border border-gray-200 rounded-2xl overflow-hidden z-40 py-1.5">
                            <button onClick={() => openModal('edit', user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0097B2]/5 hover:text-[#0097B2] transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-[#0097B2]/10 transition-colors flex-shrink-0">
                                <i className="ri-edit-2-line text-xs text-gray-500 group-hover/item:text-[#0097B2]" />
                              </span>
                              <span className="font-medium">Edit User</span>
                            </button>
                            <button onClick={() => openModal('reset', user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 group-hover/item:bg-amber-100 transition-colors flex-shrink-0">
                                <i className="ri-lock-password-line text-xs text-gray-500 group-hover/item:text-amber-500" />
                              </span>
                              <span className="font-medium">Reset Password</span>
                            </button>
                            <div className="mx-4 my-1 border-t border-gray-100" />
                            <button onClick={() => openModal('delete', user)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer group/item">
                              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 group-hover/item:bg-red-100 transition-colors flex-shrink-0">
                                <i className="ri-delete-bin-line text-xs text-red-400" />
                              </span>
                              <span className="font-medium">Delete User</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Showing {filtered.length} of {users.length} users</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <UserModal user={activeUser} onClose={() => setModal(null)} onSave={handleSave} />
      )}
      {modal === 'delete' && activeUser && (
        <DeleteUserModal user={activeUser} onClose={() => setModal(null)} onConfirm={handleDelete} />
      )}
      {modal === 'reset' && activeUser && (
        <ResetPasswordModal user={activeUser} onClose={() => setModal(null)} onReset={handleReset} />
      )}
    </div>
  );
}
