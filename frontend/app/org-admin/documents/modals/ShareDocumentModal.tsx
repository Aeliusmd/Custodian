"use client";

import { useState, useRef } from 'react';
import type { DocumentRecord } from '../../../../mocks/documents';

const TEAL = '#0097B2';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

type Stage = 'form' | 'link' | 'otp';

interface Props {
  docs: DocumentRecord[];
  onClose: () => void;
}

const DURATION_OPTIONS = [
  { value: '30min', label: '30 Minutes', icon: 'ri-time-line' },
  { value: '1hr',   label: '1 Hour',     icon: 'ri-timer-line' },
  { value: '2hr',   label: '2 Hours',    icon: 'ri-timer-2-line' },
  { value: '24hr',  label: '24 Hours',   icon: 'ri-calendar-line' },
];

export default function ShareDocumentModal({ docs, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('form');
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [emailError, setEmailError] = useState('');
  const [duration, setDuration] = useState('30min');
  const [generatedLink, setGeneratedLink] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const durationLabel = DURATION_OPTIONS.find((d) => d.value === duration)?.label ?? '';

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const addEmail = (val: string) => {
    const trimmed = val.trim().replace(/,$/, '');
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { setEmailError('Please enter a valid email address'); return; }
    if (emails.includes(trimmed)) { setEmailError('This email is already added'); return; }
    setEmails((prev) => [...prev, trimmed]);
    setEmailInput('');
    setEmailError('');
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(emailInput); }
    if (e.key === 'Backspace' && !emailInput && emails.length) setEmails((prev) => prev.slice(0, -1));
  };

  const removeEmail = (em: string) => setEmails((prev) => prev.filter((x) => x !== em));

  const handleGenerate = async () => {
    if (emailInput.trim()) addEmail(emailInput);
    const finalEmails = emailInput.trim() && isValidEmail(emailInput.trim())
      ? [...emails, emailInput.trim()]
      : emails;
    if (finalEmails.length === 0) { setEmailError('Add at least one recipient email'); return; }

    setGenerating(true);
    setGenerateError('');
    try {
      const docId = docs[0]?.id;
      if (!docId) throw new Error('No document selected');

      const res = await fetch(`${API_BASE_URL}/protected/org-admin/documents/${encodeURIComponent(docId)}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmails: finalEmails, duration }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { token: string; shareLink: string; expiresAt: string };
      setShareToken(data.token);
      setGeneratedLink(data.shareLink);
      setStage('link');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setOtpError('');
    if (val && i < 5) document.getElementById(`otp-box-${i + 1}`)?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`otp-box-${i - 1}`)?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setOtp(next);
    document.getElementById(`otp-box-${Math.min(pasted.length, 5)}`)?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    setVerifying(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_BASE_URL}/share/${encodeURIComponent(shareToken)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setOtpError(body.message ?? 'Incorrect OTP code');
      } else {
        setOtpVerified(true);
      }
    } catch {
      setOtpError('Failed to verify OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const isBulk = docs.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0" style={{ background: `${TEAL}15` }}>
              <i className={`text-base ${stage === 'otp' ? 'ri-shield-keyhole-line' : 'ri-share-forward-line'}`} style={{ color: TEAL }} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1a2340]">
                {stage === 'otp' ? 'Verify Access' : stage === 'link' ? 'Link Generated' : 'Share Document'}
                {isBulk && stage === 'form' && (
                  <span className="ml-2 text-xs font-normal bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{docs.length} files</span>
                )}
              </h2>
              {stage === 'form' && !isBulk && (
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">{docs[0]?.name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} title="Close" aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="px-6 py-5">
          {stage === 'form' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Recipient Emails
                </label>
                <div
                  className={`min-h-[48px] flex flex-wrap gap-1.5 items-center border rounded-xl px-3 py-2 cursor-text transition-colors ${
                    emailError ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 focus-within:border-[#0097B2]'
                  }`}
                  onClick={() => inputRef.current?.focus()}
                >
                  {emails.map((em) => (
                    <span key={em} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: TEAL }}>
                      <i className="ri-mail-line text-[10px] opacity-70" />
                      {em}
                      <button onClick={(e) => { e.stopPropagation(); removeEmail(em); }} title={`Remove ${em}`} aria-label={`Remove ${em}`} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer">
                        <i className="ri-close-line text-[10px]" />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={inputRef}
                    id="email-inp"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                    onKeyDown={handleEmailKeyDown}
                    onBlur={() => emailInput.trim() && addEmail(emailInput)}
                    placeholder={emails.length === 0 ? 'Type email and press Enter...' : ''}
                    className="flex-1 min-w-[120px] outline-none text-sm text-[#1a2340] bg-transparent"
                  />
                </div>
                {emailError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><i className="ri-error-warning-line" /> {emailError}</p>}
                <p className="text-xs text-gray-400 mt-1">Press Enter or comma after each email</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Session Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map(({ value, label, icon }) => (
                    <button key={value} onClick={() => setDuration(value)} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${duration === value ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'}`} style={duration === value ? { background: TEAL, borderColor: TEAL } : {}}>
                      <i className={`${icon} text-base ${duration === value ? 'text-white' : 'text-gray-400'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl border" style={{ background: `${TEAL}08`, borderColor: `${TEAL}30` }}>
                <i className="ri-shield-check-line mt-0.5 flex-shrink-0 text-base" style={{ color: TEAL }} />
                <p className="text-xs text-gray-600 leading-relaxed">
                  The link will expire after <strong>{durationLabel}</strong>. Recipients will receive an OTP code by email to verify their identity before downloading.
                </p>
              </div>

              {generateError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
                  <i className="ri-error-warning-line flex-shrink-0" />
                  {generateError}
                </div>
              )}

              <button onClick={() => void handleGenerate()} disabled={generating} className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer" style={{ background: TEAL }}>
                {generating ? <><i className="ri-loader-4-line animate-spin" /> Generating Link…</> : <><i className="ri-links-line" /> Create Link</>}
              </button>
            </div>
          )}

          {stage === 'link' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: `${TEAL}15` }}>
                  <i className="ri-links-line text-3xl" style={{ color: TEAL }} />
                </div>
                <p className="text-base font-semibold text-[#1a2340]">Secure Link Created!</p>
                <p className="text-xs text-gray-400 mt-1">Expires in {durationLabel} · OTP sent to recipients</p>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50">
                <i className="ri-lock-2-line text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 flex-1 truncate font-mono">{generatedLink}</span>
                <button onClick={handleCopy} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer whitespace-nowrap" style={{ background: copied ? '#22c55e' : TEAL }}>
                  <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">OTP sent to</p>
                {emails.map((em) => (
                  <div key={em} className="flex items-center gap-2 py-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${TEAL}15` }}>
                      <i className="ri-mail-line text-[10px]" style={{ color: TEAL }} />
                    </div>
                    <span className="text-sm text-gray-600">{em}</span>
                    <i className="ri-check-line text-green-500 text-xs ml-auto" />
                  </div>
                ))}
              </div>

              <button onClick={() => setStage('otp')} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2">
                <i className="ri-eye-line" />
                Preview OTP Verification Screen
              </button>
            </div>
          )}

          {stage === 'otp' && (
            <div className="space-y-5">
              <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50">
                <i className="ri-eye-line text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Receiver&apos;s view.</strong> Recipients enter the OTP sent to their email. Session expires after <strong>{durationLabel}</strong>.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: `${TEAL}15` }}>
                  <i className="ri-shield-keyhole-line text-3xl" style={{ color: TEAL }} />
                </div>
                <p className="text-base font-semibold text-[#1a2340]">Enter Verification Code</p>
                <p className="text-xs text-gray-400 mt-1">A 6-digit OTP was sent to your email address</p>
              </div>

              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input key={i} id={`otp-box-${i}`} type="text" inputMode="numeric" maxLength={1} value={d} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${otpError ? 'border-red-400 bg-red-50 text-red-600' : d ? 'border-[#0097B2] text-[#0097B2] bg-[#0097B2]/5' : 'border-gray-200 text-[#1a2340]'}`}
                    style={{ height: '52px' }}
                  />
                ))}
              </div>

              {otpError && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-red-500">
                  <i className="ri-error-warning-line" /> {otpError}
                </div>
              )}

              {otpVerified ? (
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-green-100 mb-3">
                    <i className="ri-check-line text-green-600 text-xl" />
                  </div>
                  <p className="text-sm font-semibold text-green-600">Access Granted!</p>
                  <p className="text-xs text-gray-400 mt-1">Session active for {durationLabel}</p>
                  <a href={`${API_BASE_URL}/share/${encodeURIComponent(shareToken)}/download`} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer" style={{ background: TEAL }}>
                    <i className="ri-download-2-line" /> Download Document
                  </a>
                </div>
              ) : (
                <button onClick={() => void handleVerifyOtp()} disabled={otp.join('').length < 6 || verifying} className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2" style={{ background: TEAL }}>
                  {verifying ? <><i className="ri-loader-4-line animate-spin" /> Verifying…</> : <><i className="ri-shield-check-line" /> Verify &amp; Access Document</>}
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <i className="ri-timer-line" />
                Session terminates after {durationLabel}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
