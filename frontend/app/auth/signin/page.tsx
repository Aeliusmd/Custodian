"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TwoFactorModal from "./TwoFactorModal";

export default function SignIn() {
  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3351";
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Login failed");
      }

      if (!data.challengeId) {
        throw new Error("Missing OTP challenge");
      }

      setChallengeId(data.challengeId);
      setShow2FA(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const [show2FA, setShow2FA] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);

  const handleVerify2FA = async (code: string) => {
    setTwoFAError(null);
    setIsLoading(true);

    try {
      if (!challengeId) {
        throw new Error("Missing OTP challenge. Please login again.");
      }

      const response = await fetch(`${API_BASE_URL}/auth/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeId, code }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Invalid verification code");
      }

      setShow2FA(false);
      router.push(data.redirectTo ?? "/");
    } catch (error) {
      setTwoFAError(error instanceof Error ? error.message : "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId) {
      setTwoFAError("Session expired. Please login again.");
      return;
    }
    try {
      setTwoFAError(null);
      const response = await fetch(`${API_BASE_URL}/auth/mfa/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ challengeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Failed to resend OTP");
      }
    } catch (error) {
      setTwoFAError(error instanceof Error ? error.message : "Failed to resend OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-8">
          {/* Logo INSIDE card */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/images/logo_full.png"
              alt="MEDCUBE"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-brand-navy mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-brand-muted">
              Sign in to your Custodox account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-brand-navy mb-1.5">
                Email address
              </label>
              <div className="relative">
                <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-brand-navy mb-1.5">
                Password
              </label>
              <div className="relative">
                <i className="ri-lock-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-10 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy transition-colors"
                >
                  <i
                    className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}
                  />
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({ ...formData, rememberMe: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-brand-border text-brand-cyan focus:ring-brand-cyan"
                />
                <span className="text-sm text-brand-body">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-brand-cyan hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-cyan text-white font-medium rounded-lg hover:bg-brand-cyan-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <i className="ri-error-warning-line text-red-500" />
                <span className="text-sm text-red-600">{authError}</span>
              </div>
            )}
          </form>
          {/* Sign up link */}
          <p className="text-center mt-6 text-sm text-brand-body">
            Don't have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="text-brand-cyan font-medium hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 mt-4 text-sm text-brand-muted hover:text-brand-navy transition-colors"
        >
          <i className="ri-arrow-left-line" />
          Back to home
        </Link>
      </div>
      <TwoFactorModal
        isOpen={show2FA}
        email={formData.email}
        onVerify={handleVerify2FA}
        onResend={handleResendOtp}
        onCancel={() => {
          setShow2FA(false);
          setTwoFAError(null);
        }}
        isLoading={isLoading}
        error={twoFAError}
      />
    </div>
  );
}
