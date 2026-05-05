"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const industries = [
  "Legal",
  "Healthcare",
  "Insurance",
  "Finance",
  "Government",
  "Education",
  "Other",
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "$49/mo",
    description: "Up to 5 users, 100GB storage",
  },
  {
    id: "professional",
    name: "Professional",
    price: "$149/mo",
    description: "Up to 25 users, 500GB storage",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "Unlimited users, dedicated support",
  },
];

export default function SignUp() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    industry: "",
    plan: "professional",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    router.push("/dashboard");
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`flex items-center gap-2 ${s !== 3 ? "flex-1" : ""}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              s <= step
                ? "bg-brand-cyan text-white"
                : "bg-brand-surface text-brand-muted border border-brand-border"
            }`}
          >
            {s < step ? <i className="ri-check-line" /> : s}
          </div>
          {s !== 3 && (
            <div
              className={`flex-1 h-0.5 transition-colors ${
                s < step ? "bg-brand-cyan" : "bg-brand-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-navy mb-1.5">
          Organization Name *
        </label>
        <div className="relative">
          <i className="ri-building-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
          <input
            type="text"
            required
            value={formData.orgName}
            onChange={(e) =>
              setFormData({ ...formData, orgName: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
            placeholder="Acme Corporation"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-brand-navy mb-1.5">
            First Name *
          </label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            className="w-full px-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-navy mb-1.5">
            Last Name *
          </label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            className="w-full px-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy mb-1.5">
          Work Email *
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
            placeholder="john@company.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy mb-1.5">
          Phone Number
        </label>
        <div className="relative">
          <i className="ri-phone-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy mb-1.5">
          Industry *
        </label>
        <div className="relative">
          <i className="ri-briefcase-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
          <select
            required
            title="Industry"
            value={formData.industry}
            onChange={(e) =>
              setFormData({ ...formData, industry: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors appearance-none"
          >
            <option value="">Select your industry</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
          <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-3">
      <p className="text-sm text-brand-body mb-4">
        Select the plan that fits your organization
      </p>
      {plans.map((plan) => (
        <label
          key={plan.id}
          className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
            formData.plan === plan.id
              ? "border-brand-cyan bg-brand-cyan-light/20"
              : "border-brand-border hover:border-brand-cyan/50"
          }`}
        >
          <input
            type="radio"
            name="plan"
            value={plan.id}
            checked={formData.plan === plan.id}
            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
            className="mt-0.5 w-4 h-4 text-brand-cyan focus:ring-brand-cyan"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-brand-navy">{plan.name}</span>
              <span className="font-semibold text-brand-cyan">
                {plan.price}
              </span>
            </div>
            <p className="text-xs text-brand-muted mt-1">{plan.description}</p>
          </div>
        </label>
      ))}

      {formData.plan === "enterprise" && (
        <div className="mt-4 p-4 bg-brand-surface rounded-xl border border-brand-border">
          <p className="text-sm text-brand-body">
            Our sales team will contact you to discuss custom pricing and
            requirements.
          </p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-navy mb-1.5">
          Create Password *
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
            placeholder="Min 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-navy transition-colors"
          >
            <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"} />
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${
                formData.password.length >= i * 2
                  ? "bg-green-500"
                  : "bg-brand-border"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-brand-muted mt-1">
          Use 8+ characters with letters, numbers & symbols
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-navy mb-1.5">
          Confirm Password *
        </label>
        <div className="relative">
          <i className="ri-lock-password-line absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-navy focus:outline-none focus:border-brand-cyan transition-colors"
            placeholder="Confirm your password"
          />
        </div>
        {formData.confirmPassword &&
          formData.password !== formData.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
      </div>

      <label className="flex items-start gap-2 cursor-pointer mt-4">
        <input
          type="checkbox"
          required
          checked={formData.agreeTerms}
          onChange={(e) =>
            setFormData({ ...formData, agreeTerms: e.target.checked })
          }
          className="mt-0.5 w-4 h-4 rounded border-brand-border text-brand-cyan focus:ring-brand-cyan"
        />
        <span className="text-sm text-brand-body">
          I agree to the{" "}
          <Link href="/terms" className="text-brand-cyan hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-cyan hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-brand-border shadow-sm p-6">
          {/* Logo INSIDE card */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/images/logo_full.png"
              alt="MEDCUBE"
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-brand-navy mb-1">
              Create your account
            </h1>
            <p className="text-sm text-brand-muted">
              Start your 14-day free trial
            </p>
          </div>

          {renderStepIndicator()}
          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 py-2.5 border border-brand-border text-brand-body font-medium rounded-lg hover:bg-brand-surface transition-colors"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-2.5 bg-brand-cyan text-white font-medium rounded-lg hover:bg-brand-cyan-dark transition-colors"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !formData.agreeTerms}
                  className="flex-1 py-2.5 bg-brand-cyan text-white font-medium rounded-lg hover:bg-brand-cyan-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Sign in link */}
          <p className="text-center mt-6 text-sm text-brand-body">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-brand-cyan font-medium hover:underline"
            >
              Sign in
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
    </div>
  );
}
