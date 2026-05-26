"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';

const TEAL = '#0097B2';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

type Stage = 'loading' | 'otp' | 'verified' | 'expired' | 'error';

interface ShareInfo {
  documentName: string;
  expiresAt: string;
  verified: boolean;
}

export default function SharePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : '';

  const [stage, setStage] = useState<Stage>('loading');
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!token || hasLoaded.current) return;
    hasLoaded.current = true;

    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/share/${encodeURIComponent(token)}`);
        if (res.status === 410) { setStage('expired'); return; }
        if (!res.ok) { setErrorMsg('This link is invalid or has been revoked.'); setStage('error'); return; }
        const data = (await res.json()) as ShareInfo;
        setShareInfo(data);
        setStage(data.verified ? 'verified' : 'otp');
      } catch {
        setErrorMsg('Could not reach the server. Please try again later.');
        setStage('error');
      }
    })();
  }, [token]);

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    setOtpError('');
    if (val && i < 5) document.getElementById(`sr-otp-${i + 1}`)?.focus();
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) document.getElementById(`sr-otp-${i - 1}`)?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setOtp(next);
    document.getElementById(`sr-otp-${Math.min(pasted.length, 5)}`)?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    setVerifying(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_BASE_URL}/share/${encodeURIComponent(token)}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setOtpError(body.message ?? 'Incorrect OTP. Please try again.');
      } else {
        setStage('verified');
      }
    } catch {
      setOtpError('Failed to verify. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const downloadUrl = `${API_BASE_URL}/share/${encodeURIComponent(token)}/download`;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-bold text-2xl text-[#1a2340]">
            Custo<span style={{ color: TEAL }}>dox</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Secure Document Access</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {stage === 'loading' && (
            <div className="text-center py-8">
              <i className="ri-loader-4-line text-3xl animate-spin" style={{ color: TEAL }} />
              <p className="text-sm text-gray-400 mt-3">Verifying link…</p>
            </div>
          )}

          {stage === 'expired' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-time-line text-2xl text-gray-400" />
              </div>
              <h2 className="text-base font-semibold text-[#1a2340]">Link Expired</h2>
              <p className="text-sm text-gray-400 mt-2">This share link has expired. Please contact the sender to get a new link.</p>
            </div>
          )}

          {stage === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-2xl text-red-400" />
              </div>
              <h2 className="text-base font-semibold text-[#1a2340]">Link Not Found</h2>
              <p className="text-sm text-gray-400 mt-2">{errorMsg}</p>
            </div>
          )}

          {(stage === 'otp' || stage === 'verified') && shareInfo && (
            <>
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl" style={{ background: `${TEAL}08` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}20` }}>
                  <i className="ri-file-line text-base" style={{ color: TEAL }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#1a2340] truncate">{shareInfo.documentName}</p>
                  <p className="text-xs text-gray-400">Shared document · Expires {new Date(shareInfo.expiresAt).toLocaleString()}</p>
                </div>
              </div>

              {stage === 'otp' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${TEAL}15` }}>
                      <i className="ri-shield-keyhole-line text-2xl" style={{ color: TEAL }} />
                    </div>
                    <h2 className="text-base font-semibold text-[#1a2340]">Enter Verification Code</h2>
                    <p className="text-xs text-gray-400 mt-1">Enter the 6-digit OTP sent to your email</p>
                  </div>

                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        id={`sr-otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-11 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${
                          otpError ? 'border-red-400 bg-red-50 text-red-600' : d ? 'border-[#0097B2] text-[#0097B2] bg-[#0097B2]/5' : 'border-gray-200 text-[#1a2340]'
                        }`}
                        style={{ height: '52px' }}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1">
                      <i className="ri-error-warning-line" /> {otpError}
                    </p>
                  )}

                  <button
                    onClick={() => void handleVerify()}
                    disabled={otp.join('').length < 6 || verifying}
                    className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: TEAL }}
                  >
                    {verifying
                      ? <><i className="ri-loader-4-line animate-spin" /> Verifying…</>
                      : <><i className="ri-shield-check-line" /> Verify &amp; Access Document</>}
                  </button>
                </div>
              )}

              {stage === 'verified' && (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <i className="ri-check-line text-2xl text-green-600" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#1a2340]">Access Granted</p>
                    <p className="text-xs text-gray-400 mt-1">Your identity has been verified. Click below to download.</p>
                  </div>
                  <a
                    href={downloadUrl}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold"
                    style={{ background: TEAL }}
                  >
                    <i className="ri-download-2-line" />
                    Download {shareInfo.documentName}
                  </a>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <span className="font-semibold text-[#1a2340]">Custo<span style={{ color: TEAL }}>dox</span></span> · Secure Document Management
        </p>
      </div>
    </div>
  );
}
