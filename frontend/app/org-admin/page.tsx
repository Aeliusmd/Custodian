'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default function OrgAdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/session`, {
          method: 'GET',
          credentials: 'include',
        });
        if (cancelled) return;
        if (!res.ok) {
          router.replace('/auth/signin');
          return;
        }
        const data = (await res.json()) as { user?: { id?: string; role?: string } };
        const user = data.user;
        if (!user?.id || user.role !== 'ORG_ADMIN') {
          router.replace('/');
          return;
        }
        router.replace('/org-admin/dashboard');
      } catch {
        if (!cancelled) router.replace('/auth/signin');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-gray-500">
      Redirecting…
    </div>
  );
}
