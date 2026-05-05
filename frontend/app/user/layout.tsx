import { ReactNode } from 'react';
import UserLayout from '@/app/components/feature/UserLayout';

type UserLayoutWrapperProps = {
  children: ReactNode;
};

export default function UserLayoutWrapper({ children }: UserLayoutWrapperProps) {
  return <UserLayout>{children}</UserLayout>;
}
