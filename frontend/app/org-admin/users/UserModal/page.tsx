"use client";

import { useEffect, useState } from 'react';
import type { OrgUser } from '../types';

const TEAL = '#0097B2';

interface UserModalProps {
  user: OrgUser | null;
  onClose: () => void;
  onSave: (data: Omit<OrgUser, 'id' | 'createdDate' | 'avatar'> & { password?: string }) => void;
}

export default function UserModal({ user, onClose, onSave }: UserModalProps) {
  const isEdit = !!user;
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'User'>(user?.role ?? 'User');
  const [status, setStatus] = useState<'Active' | 'Inactive'>(user?.status ?? 'Active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
    }
  }, [user]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    if (!isEdit && !password.trim()) e.password = 'Password is required';
    else if (!isEdit && password.length < 8) e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ name: name.trim(), email: email.trim(), role, status, password: isEdit ? undefined : password });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${TEAL}18` }}>
              <i className={`${isEdit ? 'ri-user-settings-line' : 'ri-user-add-line'} text-base`} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1a2340]">{isEdit ? 'Edit User' : 'Create New User'}</h2>
              <p className="text-xs text-gray-400">{isEdit ? `Editing ${user?.name}` : 'Add a user to your organization'}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" title="Close modal" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
            <i className="ri-close-line" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email Address <span className="text-red-400">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Password (create only) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Password <span className="text-red-400">*</span></label>
              <div className={`flex items-center border rounded-xl px-4 py-2.5 gap-2 transition-all ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Hide password' : 'Show password'} title={showPass ? 'Hide password' : 'Show password'} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <i className={showPass ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Role & Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Admin' | 'User')}
                aria-label="Role"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] bg-white cursor-pointer"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Status</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-2.5">
                <span className="text-sm text-gray-600 flex-1">{status}</span>
                <button
                  type="button"
                  onClick={() => setStatus(status === 'Active' ? 'Inactive' : 'Active')}
                  aria-label={`Toggle status to ${status === 'Active' ? 'Inactive' : 'Active'}`}
                  aria-pressed={status === 'Active'}
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${status === 'Active' ? 'bg-[#0097B2]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${status === 'Active' ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            style={{ background: TEAL }}
          >
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}
