import { use, ReactNode } from 'react';
import UserLayout from '@/app/components/feature/UserLayout';

export default function UserIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  return <UserLayout userId={userId}>{children}</UserLayout>;
}
