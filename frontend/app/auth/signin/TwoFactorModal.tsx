'use client';

import { useState, useRef, useEffect } from 'react';

interface TwoFactorModalProps {
  isOpen: boolean;
  email: string;
  onVerify: (code: string) => void;
  onResend: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function TwoFactorModal({
  isOpen,
  email,
  onVerify,
  onResend,
  onCancel,
  isLoading,
  error,
}: TwoFactorModalProps) {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (isOpen) {
      setCode(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((c) => c !== '')) {
      onVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);

    const newCode = [...code];

    pasted.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });

    setCode(newCode);

    if (pasted.length >= 6) {
      onVerify(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl border border-brand-border shadow-xl p-8 w-full max-w-sm mx-4 animate-[slideUp_0.3s_ease-out]">
        
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 rounded-full bg-brand-cyan-light/20 flex items-center justify-center">
            <i className="ri-shield-keyhole-line text-2xl text-brand-cyan" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-brand-navy text-center mb-1">
          Two-Factor Authentication
        </h2>

        <p className="text-sm text-brand-muted text-center mb-6">
          Enter the 6-digit code sent to{' '}
          <span className="text-brand-navy font-medium">{email}</span>
        </p>

        {/* OTP Inputs */}
        <div className="flex justify-center gap-2 mb-6">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              disabled={isLoading}
              className={`w-11 h-12 text-center text-lg font-semibold rounded-lg border-2 focus:outline-none transition-all ${
                digit
                  ? 'border-brand-cyan bg-brand-cyan-light/10 text-brand-navy'
                  : 'border-brand-border bg-brand-surface text-brand-navy'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <i className="ri-error-warning-line text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <i className="ri-loader-4-line animate-spin text-brand-cyan" />
            <span className="text-sm text-brand-muted">
              Verifying code...
            </span>
          </div>
        )}

        {/* Resend */}
        <p className="text-center text-sm text-brand-muted">
          Didn&apos;t receive it?{' '}
          <button
            type="button"
            onClick={async () => {
              setCode(['', '', '', '', '', '']);
              inputRefs.current[0]?.focus();
              await onResend();
            }}
            className="text-brand-cyan font-medium hover:underline"
            disabled={isLoading}
          >
            Resend code
          </button>
        </p>

        {/* Cancel */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full mt-4 py-2 text-sm text-brand-muted hover:text-brand-navy transition-colors"
          disabled={isLoading}
        >
          Cancel and go back
        </button>
      </div>
    </div>
  );
}