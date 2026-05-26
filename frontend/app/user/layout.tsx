'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

const UserLayout = dynamic(() => import('../components/feature/UserLayout'), { ssr: false });

async function getUserId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json() as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

export default function UserRootLayout({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getUserId()
      .then((id) => {
        if (!id) {
          router.replace('/sign-in');
          return;
        }
        setUserId(id);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fb]">
        <div className="w-6 h-6 rounded-full border-2 border-[#0097B2] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!userId) return null;

  return <UserLayout userId={userId}>{children}</UserLayout>;
}