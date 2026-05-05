"use client";

import type { OrgUser } from '../types';

interface DeleteUserModalProps {
  user?: OrgUser | null;
  onClose?: () => void;
  onConfirm?: (id: string) => void;
}

export default function DeleteUserModal({ user, onClose, onConfirm }: DeleteUserModalProps) {
  if (!user || !onClose || !onConfirm) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="h-1.5 w-full bg-red-500" />
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <i className="ri-user-unfollow-line text-2xl text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-[#1a2340] mb-1">Delete User?</h3>
            <p className="text-sm text-gray-400">Are you sure you want to delete this user? This action cannot be undone.</p>
          </div>
          <div className="w-full p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
              <span className="text-red-700 text-xs font-bold">{user.avatar}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800 truncate">{user.name}</p>
              <p className="text-xs text-red-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={() => onConfirm(user.id)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap">Delete User</button>
          </div>
        </div>
      </div>
    </div>
  );
}
