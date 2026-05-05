import { ReactNode } from 'react';
import OrgAdminLayout from '@/app/components/feature/OrgAdminLayout';

type OrgAdminLayoutWrapperProps = {
  children: ReactNode;
};

export default function OrgAdminLayoutWrapper({ children }: OrgAdminLayoutWrapperProps) {
  return <OrgAdminLayout>{children}</OrgAdminLayout>;
}
