'use client';

import { useState } from 'react';

const TEAL = '#0097B2';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export default function UserProfilePage() {
  const [firstName, setFirstName] = useState('Alex');
  const [lastName, setLastName] = useState('Harrison');
  const [email, setEmail] = useState('alex.harrison@acmecorp.com');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [language, setLanguage] = useState('English');
  const [bio, setBio] = useState('Document specialist responsible for managing and organizing company files across legal, financial and compliance categories.');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const handleProfileSave = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email address';
    setProfileErrors(e);
    if (Object.keys(e).length === 0) showToast('Profile updated successfully');
  };

  const handleCancel = () => {
    setFirstName('Alex');
    setLastName('Harrison');
    setEmail('alex.harrison@acmecorp.com');
    setPhone('+1 (555) 234-5678');
    setBio('Document specialist responsible for managing and organizing company files across legal, financial and compliance categories.');
    setProfileErrors({});
  };

  const handlePasswordChange = () => {
    const e: Record<string, string> = {};
    if (!currentPass) e.currentPass = 'Current password is required';
    if (!newPass) e.newPass = 'New password is required';
    else if (newPass.length < 8) e.newPass = 'Minimum 8 characters required';
    if (!confirmPass) e.confirmPass = 'Please confirm your password';
    else if (newPass !== confirmPass) e.confirmPass = 'Passwords do not match';
    setPassErrors(e);
    if (Object.keys(e).length === 0) {
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      showToast('Password changed successfully');
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

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'AH';

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
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0" style={{ background: '#d97706' }}>
            {initials}
          </div>
          <div>
            <p className="text-base font-bold text-[#1a2340]">{firstName} {lastName}</p>
            <p className="text-sm mt-0.5 text-amber-600">User</p>
            <button className="text-sm font-semibold mt-1 cursor-pointer hover:underline" style={{ color: TEAL }}>Change Avatar</button>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-user-line text-base text-gray-500" />
            </div>
            <h3 className="text-sm font-bold text-[#1a2340]">Personal Information</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">First Name</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${profileErrors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  placeholder="First name"
                />
                {profileErrors.firstName && <p className="text-xs text-red-500 mt-1">{profileErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Last Name</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full border rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none transition-all ${profileErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-[#0097B2]'}`}
                  placeholder="email@example.com"
                />
                {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
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
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-[#1a2340] outline-none focus:border-[#0097B2] transition-all resize-none"
                placeholder="Write a short bio about yourself..."
              />
              <div className="text-right text-xs text-gray-400 mt-1">{bio.length}/500</div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleProfileSave} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap" style={{ background: TEAL }}>
                Save Changes
              </button>
              <button onClick={handleCancel} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <i className="ri-lock-line text-base text-gray-500" />
            </div>
            <h3 className="text-sm font-bold text-[#1a2340]">Change Password</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Current Password</label>
              <div className={`flex items-center border rounded-lg px-3.5 py-2.5 gap-2 transition-all ${passErrors.currentPass ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-4 h-4 flex items-center justify-center">
                  <i className={showCurrent ? 'ri-eye-off-line' : 'ri-eye-line'} />
                </button>
              </div>
              {passErrors.currentPass && <p className="text-xs text-red-500 mt-1">{passErrors.currentPass}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
                <div className={`flex items-center border rounded-lg px-3.5 py-2.5 gap-2 transition-all ${passErrors.newPass ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-[#0097B2]'}`}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
                  />
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
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new password"
                    className="flex-1 text-sm text-[#1a2340] outline-none bg-transparent"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-4 h-4 flex items-center justify-center">
                    <i className={showConfirm ? 'ri-eye-off-line' : 'ri-eye-line'} />
                  </button>
                </div>
                {passErrors.confirmPass && <p className="text-xs text-red-500 mt-1">{passErrors.confirmPass}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handlePasswordChange} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap" style={{ background: TEAL }}>
                Update Password
              </button>
              <button
                onClick={() => { setCurrentPass(''); setNewPass(''); setConfirmPass(''); setPassErrors({}); }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}