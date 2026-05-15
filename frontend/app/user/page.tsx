"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3051';

export default function UserIndexPage() {
  const router = useRouter();

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json() as Promise<{ id: string }>;
      })
      .then(() => {
        router.replace('/user/dashboard');
      })
      .catch(() => {
        router.replace('/sign-in');
      });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8f9fb]">
      <div className="w-6 h-6 rounded-full border-2 border-[#0097B2] border-t-transparent animate-spin" />
    </div>
  );
}
