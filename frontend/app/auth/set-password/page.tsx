"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3351";

  const [inviteInfo, setInviteInfo] = useState<{ email: string; organizationName: string } | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordError = useMemo(() => {
    if (!password) return null;
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }, [password]);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setError("Invite token is missing.");
        setLoadingInvite(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/invite/validate?token=${encodeURIComponent(token)}`,
          { method: "GET", credentials: "include" },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Invalid invite token.");
        }
        setInviteInfo({ email: data.email, organizationName: data.organizationName });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invite validation failed.");
      } finally {
        setLoadingInvite(false);
      }
    };
    void run();
  }, [API_BASE_URL, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Invite token is missing.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/auth/invite/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "Failed to set password.");
      }
      setSuccess("Password set successfully. Redirecting to sign in...");
      setTimeout(() => router.push("/auth/signin"), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-brand-border shadow-sm p-8">
        <h1 className="text-xl font-semibold text-brand-navy text-center">Set Your Password</h1>
        <p className="text-sm text-brand-muted text-center mt-1">
          Complete your organization admin invitation
        </p>

        {loadingInvite ? (
          <p className="mt-6 text-sm text-brand-muted text-center">Validating invite...</p>
        ) : error ? (
          <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        ) : (
          <>
            <div className="mt-6 p-3 bg-brand-surface rounded-lg border border-brand-border text-sm">
              <p className="text-brand-body">
                <span className="font-medium text-brand-navy">Email:</span> {inviteInfo?.email}
              </p>
              <p className="text-brand-body mt-1">
                <span className="font-medium text-brand-navy">Organization:</span> {inviteInfo?.organizationName}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-brand-navy mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan"
                />
                {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-navy mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-brand-cyan text-white font-medium rounded-lg hover:bg-brand-cyan-dark transition-colors disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Set Password"}
              </button>
            </form>
          </>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}

        <Link
          href="/auth/signin"
          className="flex items-center justify-center gap-2 mt-6 text-sm text-brand-muted hover:text-brand-navy"
        >
          <i className="ri-arrow-left-line" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-brand-border shadow-sm p-8">
            <p className="text-sm text-brand-muted text-center">Loading invite...</p>
          </div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
