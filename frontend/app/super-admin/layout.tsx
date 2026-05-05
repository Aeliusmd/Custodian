import { ReactNode } from 'react';

import SuperAdminLayout from '../components/feature/SuperAdminLayout';

type SuperAdminRouteLayoutProps = {
  children: ReactNode;
};

export default function SuperAdminRouteLayout({ children }: SuperAdminRouteLayoutProps) {
  return <SuperAdminLayout>{children}</SuperAdminLayout>;
}