export interface OrgAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface BillingEntry {
  date: string;
  amount: string;
  description: string;
  status: 'Paid' | 'Failed' | 'Pending';
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  createdDate: string;
  status: 'Active' | 'Inactive';
  planType: 'Manual' | 'Subscription';
  planName: string;
  planExpiry: string;
  industry: string;
  phone: string;
  address: string;
  adminCount: number;
  admins: OrgAdmin[];
  docUsed: number;
  docTotal: number;
  billingHistory: BillingEntry[];
}
