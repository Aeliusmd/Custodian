"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import TwoFactorModal from "./TwoFactorModal";

export default function SignIn() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate login API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);

    // 👉 Open 2FA modal instead of redirect
    setShow2FA(true);
  };

  const [show2FA, setShow2FA] = useState(false);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);

  const handleVerify2FA = async (code: string) => {
    setTwoFAError(null);
    setIsLoading(true);

    try {
      // Simulate verification API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Example: fake validation
      if (code !== "123456") {
        throw new Error("Invalid verification code");
      }

      setShow2FA(false);
      router.push("/dashboard");
    } catch (err: any) {
      setTwoFAError(err.message);
    } finally {
      setIsLoading(false);
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
