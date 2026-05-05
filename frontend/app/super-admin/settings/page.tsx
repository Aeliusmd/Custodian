"use client";

import { useState } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Admin';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  avatar: string;
}

const initAdmins: AdminUser[] = [
  { id: 'adm-1', name: 'Sarah Chen', email: 'sarah.chen@custodox.io', role: 'Super Admin', status: 'Active', lastLogin: '2026-04-07 09:14', avatar: 'SC' },
  { id: 'adm-2', name: 'James Okafor', email: 'james.okafor@custodox.io', role: 'Admin', status: 'Active', lastLogin: '2026-04-06 17:42', avatar: 'JO' },
  { id: 'adm-3', name: 'Maria Lopez', email: 'maria.lopez@custodox.io', role: 'Admin', status: 'Inactive', lastLogin: '2026-03-28 11:05', avatar: 'ML' },
];

const avatarColors: Record<string, string> = {
  'adm-1': 'bg-[#0097B2]',
  'adm-2': 'bg-[#7c3aed]',
  'adm-3': 'bg-[#d97706]',
};

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'admins'>('profile');
  const [admins, setAdmins] = useState<AdminUser[]>(initAdmins);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [deleteAdminId, setDeleteAdminId] = useState<string | null>(null);

  const [profile, setProfile] = useState({ name: 'Sarah Chen', email: 'sarah.chen@custodox.io', phone: '+1 (555) 100-2200', timezone: 'UTC-5 (Eastern Time)' });
  const [profileSaved, setProfileSaved] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'Admin' as 'Super Admin' | 'Admin' });

  const handleSaveProfile = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleSavePassword = () => {
    if (!passwords.current || !passwords.newPass || passwords.newPass !== passwords.confirm) return;
    setPasswordSaved(true);
    setPasswords({ current: '', newPass: '', confirm: '' });
    setTimeout(() => setPasswordSaved(false), 2500);
  };

  const handleAddAdmin = () => {
    if (!newAdmin.name || !newAdmin.email) return;
    const id = `adm-${Date.now()}`;
    setAdmins((prev) => [...prev, {
      id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      status: 'Active',
      lastLogin: 'Never',
      avatar: newAdmin.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
    }]);
    setNewAdmin({ name: '', email: '', role: 'Admin' });
    setShowAddAdmin(false);
  };

  const sections = [
    { key: 'profile', label: 'Profile', icon: 'ri-user-line' },
    { key: 'security', label: 'Security', icon: 'ri-shield-keyhole-line' },
    // { key: 'admins', label: 'Admin Accounts', icon: 'ri-team-line' },
  ] as const;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="font-outfit font-bold text-2xl text-brand-navy">Admin Settings</h1>
        <p className="text-brand-muted text-sm mt-0.5">Manage your account and admin access</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="w-full lg:w-52 lg:flex-shrink-0">
          <div className="bg-white rounded-xl border border-brand-border p-2">
            <div className="flex lg:flex-col gap-1 overflow-x-auto">
              {sections.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`w-full lg:w-auto flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeSection === s.key ? 'bg-[#0097B2] text-white' : 'text-brand-body hover:bg-brand-surface hover:text-brand-navy'
                  }`}
                >
                  <i className={s.icon} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-brand-border p-4 sm:p-6 space-y-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-16 h-16 bg-[#0097B2] rounded-full flex items-center justify-center">
                  <span className="text-white text-xl font-bold">SC</span>
                </div>
                <div>
                  <h2 className="font-outfit font-semibold text-brand-navy">Profile Information</h2>
                  <p className="text-sm text-brand-muted">Update your personal details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Full Name</label>
                    <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      title="Full Name"
                      placeholder="Enter full name"
                    className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Email Address</label>
                    <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      title="Email Address"
                      placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Phone</label>
                    <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                      title="Phone"
                      placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Timezone</label>
                    <select
                    value={profile.timezone}
                    onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                      title="Timezone"
                    className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors bg-white"
                  >
                    {['UTC-8 (Pacific Time)', 'UTC-7 (Mountain Time)', 'UTC-6 (Central Time)', 'UTC-5 (Eastern Time)', 'UTC+0 (GMT)', 'UTC+1 (CET)', 'UTC+5:30 (IST)'].map((tz) => (
                      <option key={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={handleSaveProfile}
                  className="w-full sm:w-auto px-5 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap"
                >
                  Save Changes
                </button>
                {profileSaved && (
                  <div className="flex items-center gap-2 text-[#16a34a] text-sm">
                    <i className="ri-checkbox-circle-line" />
                    Profile saved!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-xl border border-brand-border p-4 sm:p-6 space-y-5">
              <div>
                <h2 className="font-outfit font-semibold text-brand-navy">Change Password</h2>
                <p className="text-sm text-brand-muted">Keep your account secure with a strong password</p>
              </div>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={passwords.current}
                      onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                      placeholder="Enter current password"
                    />
                    <button onClick={() => setShowCurrent(!showCurrent)} title={showCurrent ? 'Hide current password' : 'Show current password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy">
                      <i className={showCurrent ? 'ri-eye-off-line' : 'ri-eye-line'} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={passwords.newPass}
                      onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                      className="w-full px-3 py-2 pr-10 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                      placeholder="Enter new password"
                    />
                    <button onClick={() => setShowNew(!showNew)} title={showNew ? 'Hide new password' : 'Show new password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy">
                      <i className={showNew ? 'ri-eye-off-line' : 'ri-eye-line'} />
                    </button>
                  </div>
                  {passwords.newPass && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`h-1 flex-1 rounded-full ${passwords.newPass.length >= i * 3 ? (passwords.newPass.length >= 12 ? 'bg-[#16a34a]' : 'bg-[#d97706]') : 'bg-brand-surface'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-brand-muted">{passwords.newPass.length < 6 ? 'Weak' : passwords.newPass.length < 10 ? 'Fair' : passwords.newPass.length < 14 ? 'Good' : 'Strong'}</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-muted mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none transition-colors ${
                      passwords.confirm && passwords.confirm !== passwords.newPass ? 'border-red-400 focus:border-red-400' : 'border-brand-border focus:border-[#0097B2]'
                    }`}
                    placeholder="Confirm new password"
                  />
                  {passwords.confirm && passwords.confirm !== passwords.newPass && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  onClick={handleSavePassword}
                  disabled={!passwords.current || !passwords.newPass || passwords.newPass !== passwords.confirm}
                  className="w-full sm:w-auto px-5 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  Update Password
                </button>
                {passwordSaved && (
                  <div className="flex items-center gap-2 text-[#16a34a] text-sm">
                    <i className="ri-checkbox-circle-line" />
                    Password updated!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'admins' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-brand-border flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-outfit font-semibold text-brand-navy text-sm">Admin Accounts</h2>
                  <button
                    onClick={() => setShowAddAdmin(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#0097B2] text-white rounded-lg text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap"
                  >
                    <i className="ri-user-add-line" />
                    Add Admin
                  </button>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[860px]">
                    <thead className="bg-brand-surface">
                      <tr>
                        {['Admin', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map((h) => (
                          <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-brand-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {admins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-brand-surface/50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColors[admin.id] ?? 'bg-brand-muted'}`}>
                                <span className="text-white text-xs font-bold">{admin.avatar}</span>
                              </div>
                              <span className="text-sm font-medium text-brand-navy">{admin.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-brand-body">{admin.email}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${admin.role === 'Super Admin' ? 'bg-[#0097B2]/10 text-[#0097B2]' : 'bg-[#7c3aed]/10 text-[#7c3aed]'}`}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${admin.status === 'Active' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-100 text-red-500'}`}>
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-brand-muted whitespace-nowrap">{admin.lastLogin}</td>
                          <td className="px-5 py-3.5">
                            {admin.role !== 'Super Admin' && (
                              <button
                                onClick={() => setDeleteAdminId(admin.id)}
                                title={`Remove ${admin.name}`}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"
                              >
                                <i className="ri-delete-bin-line text-sm" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden divide-y divide-brand-border">
                  {admins.map((admin) => (
                    <div key={admin.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColors[admin.id] ?? 'bg-brand-muted'}`}>
                            <span className="text-white text-xs font-bold">{admin.avatar}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-brand-navy truncate">{admin.name}</div>
                            <div className="text-xs text-brand-muted truncate">{admin.email}</div>
                          </div>
                        </div>
                        {admin.role !== 'Super Admin' && (
                          <button
                            onClick={() => setDeleteAdminId(admin.id)}
                            title={`Remove ${admin.name}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <i className="ri-delete-bin-line text-sm" />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2.5 py-1 rounded-full font-medium ${admin.role === 'Super Admin' ? 'bg-[#0097B2]/10 text-[#0097B2]' : 'bg-[#7c3aed]/10 text-[#7c3aed]'}`}>{admin.role}</span>
                        <span className={`px-2.5 py-1 rounded-full font-medium ${admin.status === 'Active' ? 'bg-[#16a34a]/10 text-[#16a34a]' : 'bg-red-100 text-red-500'}`}>{admin.status}</span>
                      </div>
                      <div className="text-xs text-brand-muted">Last login: {admin.lastLogin}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddAdmin(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit font-bold text-brand-navy">Add Admin Account</h3>
              <button onClick={() => setShowAddAdmin(false)} title="Close add admin dialog" className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-muted hover:bg-brand-surface transition-all">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Email *</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm focus:outline-none focus:border-[#0097B2] transition-colors"
                  placeholder="john@medcube.io"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-muted mb-1.5">Role</label>
                <div className="flex gap-2">
                  {(['Admin', 'Super Admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewAdmin((p) => ({ ...p, role: r }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                        newAdmin.role === r ? 'bg-[#0097B2] text-white border-[#0097B2]' : 'border-brand-border text-brand-muted hover:text-brand-navy'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddAdmin(false)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={handleAddAdmin} className="flex-1 py-2.5 rounded-lg bg-[#0097B2] text-white text-sm font-medium hover:bg-[#007a91] transition-colors whitespace-nowrap">Add Admin</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Admin Confirm */}
      {deleteAdminId && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteAdminId(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <i className="ri-user-unfollow-line text-2xl text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-brand-navy mb-1">Remove Admin?</h3>
              <p className="text-sm text-brand-muted">This admin will lose access to the system immediately.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteAdminId(null)} className="flex-1 py-2.5 rounded-lg border border-brand-border text-sm font-medium text-brand-body hover:bg-brand-surface transition-colors whitespace-nowrap">Cancel</button>
              <button onClick={() => { setAdmins((prev) => prev.filter((a) => a.id !== deleteAdminId)); setDeleteAdminId(null); }} className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors whitespace-nowrap">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
