'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const TEAL = '#0097B2';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
  role: string;
  bio: string;
  avatarDataUrl?: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '', lastName: '', email: '', phone: '', language: 'English', role: 'USER', bio: '', avatarDataUrl: '',
  });
  const [original, setOriginal] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [changingPass, setChangingPass] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/user/settings/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json() as UserProfile;
      setProfile(data);
      setOriginal(data);
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  const putProfile = async (payload: UserProfile): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/user/settings/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(body.message ?? 'Failed to save profile');
    }
    return res.json() as UserProfile;
  };

  const persistAvatar = async (jpegDataUrl: string) => {
    if (!original) return;
    const previousUrl = original.avatarDataUrl ?? '';
    setIsSavingAvatar(true);
    try {
      const payload: UserProfile = {
        ...profile,
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        bio: profile.bio.trim(),
        avatarDataUrl: jpegDataUrl,
      };
      const updated = await putProfile(payload);
      if (jpegDataUrl.trim() && !updated.avatarDataUrl?.trim()) {
        throw new Error('Avatar was not saved. Please try again.');
      }
      setProfile(updated);
      setOriginal(updated);
      showToast('Avatar updated');
    } catch (err) {
      setProfile((p) => ({ ...p, avatarDataUrl: previousUrl }));
      showToast(err instanceof Error ? err.message : 'Failed to save avatar', 'error');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleProfileSave = async () => {
    const e: Record<string, string> = {};
    if (!profile.firstName.trim()) e.firstName = 'First name is required';
    if (!profile.lastName.trim()) e.lastName = 'Last name is required';
    if (!profile.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = 'Invalid email address';
    setProfileErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      setSaving(true);
      const payload: UserProfile = {
        ...profile,
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        bio: profile.bio.trim(),
      };
      const sentAvatar = profile.avatarDataUrl?.trim();
      const updated = await putProfile(payload);
      if (sentAvatar && !updated.avatarDataUrl?.trim()) {
        throw new Error('Avatar was not saved. Please try again.');
      }
      setProfile(updated);
      setOriginal(updated);
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (original) { setProfile(original); setProfileErrors({}); }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5 MB', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallback = ev.target?.result as string;
          setProfile((p) => ({ ...p, avatarDataUrl: fallback }));
          void persistAvatar(fallback);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProfile((p) => ({ ...p, avatarDataUrl: jpegDataUrl }));
        void persistAvatar(jpegDataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.onerror = () => showToast('Failed to read avatar image', 'error');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePasswordChange = async () => {
    const e: Record<string, string> = {};
    if (!currentPass) e.currentPass = 'Current password is required';
    if (!newPass) e.newPass = 'New password is required';
    else if (newPass.length < 8) e.newPass = 'Minimum 8 characters required';
    if (!confirmPass) e.confirmPass = 'Please confirm your password';
    else if (newPass !== confirmPass) e.confirmPass = 'Passwords do not match';
    setPassErrors(e);
    if (Object.keys(e).length > 0) return;

    try {
      setChangingPass(true);
      const res = await fetch(`${API_BASE_URL}/user/settings/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass, confirmPassword: confirmPass }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? 'Failed to change password');
      }
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      showToast('Password changed successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  const passwordStrength = (() => {
    if (!newPass) return null;
    if (newPass.length < 6) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/4' };
    if (newPass.length < 8) return { label: 'Fair', color: 'bg-amber-400', width: 'w-2/4' };
    if (/[A-Z]/.test(newPass) && /\d/.test(newPass) && /[^a-zA-Z0-9]/.test(newPass))
      return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
    if (/[A-Z]/.test(newPass) && /\d/.test(newPass))
      return { label: 'Good', color: 'bg-[#0097B2]', width: 'w-3/4' };
    return { label: 'Fair', color: 'bg-amber-400', width: 'w-2/4' };
  })();

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || '??';

  if (loading) {
    return (
      <div className="p-8 font-inter min-h-full">
        <div className="max-w-3xl space-y-6 animate-pulse">
          <div className="h-6 bg-gray-100 rounded w-40 mb-2" />
          <div className="bg-white rounded-2xl border border-gray-200 p-6 h-28" />
          <div className="bg-white rounded-2xl border border-gray-200 p-6 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 font-inter min-h-full">
      {/* Toasts */}
      <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-3 rounded-xl text-sm font-medium text-white flex items-center gap-2 ${t.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            <i className={t.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} />
            {t.message}
          </div>
        ))}
      </div>

      <div className="mb-7">
        <h2 className="text-xl font-bold text-[#1a2340]">Profile Settings</h2>
        <p className="text-sm text-gray-400 mt-0.5">View and update your personal information.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Avatar card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-5">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden"
            style={{ background: profile.avatarDataUrl ? 'transparent' : '#d97706' }}
          >
            {profile.avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarDataUrl} alt="Profile avatar" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
            {isSavingAvatar && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <i className="ri-loader-4-line text-white text-xl animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="text-base font-bold text-[#1a2340]">{profile.firstName} {profile.lastName}</p>
            <p className="text-sm mt-0.5 text-amber-600">User</p>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isSavingAvatar}
                className="text-sm font-semibold cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: TEAL }}
              >
                {isSavingAvatar ? 'Saving...' : 'Change Avatar'}
              </button>
              {profile.avatarDataUrl && (
                <button
                  type="button"
                  disabled={isSavingAvatar}
                  onClick={() => {
                    setProfile((p) => ({ ...p, avatarDataUrl: '' }));
                    void persistAvatar('');
                  }}
                  className="text-sm font-semibold text-gray-400 hover:text-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Photo saves automatically when you choose an image.</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <i className="ri-user-line text-base text-gray-500" />
            <h3 className="text-sm font-bold text-[#1a2340]">Personal Information</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">First Name</label>
                <input
                  value={profile.firstName}
                  onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${profileErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  placeholder="First name"
                />
                {profileErrors.firstName && <p className="text-xs text-red-500 mt-1">{profileErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Name</label>
                <input
                  value={profile.lastName}
                  onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${profileErrors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  placeholder="Last name"
                />
                {profileErrors.lastName && <p className="text-xs text-red-500 mt-1">{profileErrors.lastName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${profileErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  placeholder="email@example.com"
                />
                {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone Number</label>
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Role</label>
                <input value="User" readOnly className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-400 outline-none bg-gray-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Language</label>
                <select
                  value={profile.language}
                  onChange={(e) => setProfile((p) => ({ ...p, language: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all bg-white cursor-pointer"
                >
                  <option>English</option>
                  <option>Arabic</option>
                  <option>French</option>
                  <option>Spanish</option>
                  <option>German</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio / Profile Information</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value.slice(0, 500) }))}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all resize-none"
                placeholder="Write a short bio about yourself..."
              />
              <div className="text-right text-xs text-gray-400 mt-1">{profile.bio.length}/500</div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => void handleProfileSave()} disabled={saving} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-70" style={{ background: TEAL }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={handleCancel} disabled={saving} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <i className="ri-lock-line text-base text-gray-500" />
            <h3 className="text-sm font-bold text-[#1a2340]">Change Password</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
              <div className={`flex items-center border rounded-lg px-3.5 py-2.5 gap-2 transition-all ${passErrors.currentPass ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  name="profile-current-password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
                />
              </div>
              {passErrors.currentPass && <p className="text-xs text-red-500 mt-1">{passErrors.currentPass}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
                <div className={`flex items-center border rounded-lg px-3.5 py-2.5 gap-2 transition-all ${passErrors.newPass ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
                  <input type={showNew ? 'text' : 'password'} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent" />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-4 h-4 flex items-center justify-center">
                    <i className={showNew ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
                {passErrors.newPass && <p className="text-xs text-red-500 mt-1">{passErrors.newPass}</p>}
                {passwordStrength && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${passwordStrength.color} ${passwordStrength.width}`} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Strength: <span className="font-semibold text-[#1a2340]">{passwordStrength.label}</span></p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm New Password</label>
                <div className={`flex items-center border rounded-lg px-3.5 py-2.5 gap-2 transition-all ${passErrors.confirmPass ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-4 h-4 flex items-center justify-center">
                    <i className={showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
                {passErrors.confirmPass && <p className="text-xs text-red-500 mt-1">{passErrors.confirmPass}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => void handlePasswordChange()} disabled={changingPass} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-70" style={{ background: TEAL }}>
                {changingPass ? 'Updating...' : 'Update Password'}
              </button>
              <button onClick={() => { setCurrentPass(''); setNewPass(''); setConfirmPass(''); setPassErrors({}); }} disabled={changingPass} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
