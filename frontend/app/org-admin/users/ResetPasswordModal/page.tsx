"use client";

import { useState } from 'react';
import type { OrgUser } from '../types';

const TEAL = '#0097B2';

interface ResetPasswordModalProps {
  user?: OrgUser | null;
  onClose?: () => void;
  onReset?: () => void;
}

export default function ResetPasswordModal({ user, onClose, onReset }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user || !onClose || !onReset) {
    return null;
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters';
    if (!confirmPassword) e.confirmPassword = 'Please confirm the password';
    else if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReset = () => {
    if (!validate()) return;
    onReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
              <i className="ri-lock-password-line text-base text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1a2340]">Reset Password</h2>
              <p className="text-xs text-gray-400 truncate max-w-[180px]">{user.name}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" title="Close modal" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <i className="ri-information-line text-amber-500" />
            <p className="text-xs text-amber-700">You are resetting the password for <strong>{user.email}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">New Password <span className="text-red-400">*</span></label>
            <div className={`flex items-center border rounded-xl px-4 py-2.5 gap-2 transition-all ${errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} aria-label={showNew ? 'Hide password' : 'Show password'} title={showNew ? 'Hide password' : 'Show password'} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className={showNew ? 'ri-eye-off-line' : 'ri-eye-line'} />
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Confirm Password <span className="text-red-400">*</span></label>
            <div className={`flex items-center border rounded-xl px-4 py-2.5 gap-2 transition-all ${errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} title={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className={showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} />
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleReset} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap" style={{ background: TEAL }}>
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}
