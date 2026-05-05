import Link from "next/link";

const quickLinks = [
  { href: "/auth/signin", label: "Sign In", icon: "ri-login-box-line" },
  { href: "/super-admin/dashboard", label: "Super Admin", icon: "ri-shield-star-line" },
  { href: "/user/dashboard", label: "User Profile", icon: "ri-user-line" },
  { href: "/org-admin/dashboard", label: "Org Admin", icon: "ri-building-2-line" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-navy">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl border border-brand-border bg-white p-8 shadow-sm md:p-12">
          <div className="mb-8 text-center">
            <p className="text-sm font-medium text-brand-cyan">MEDCUBE FRONTEND</p>
            <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Next.js App Router Ready</h1>
            <p className="mx-auto mt-3 max-w-2xl text-brand-muted">
              Your frontend is now using Next.js structure. Use the links below to navigate to
              converted pages and layouts.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface px-4 py-3 transition-colors hover:border-brand-cyan hover:bg-white"
              >
                <span className="flex items-center gap-2 text-brand-body">
                  <i className={`${item.icon} text-brand-cyan`} />
                  {item.label}
                </span>
                <i className="ri-arrow-right-line text-brand-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
