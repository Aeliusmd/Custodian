export interface OrgAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
}

export interface BillingEntry {
  date: string;
  amount: string;
  description: string;
  status: "Paid" | "Failed" | "Pending";
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  createdDate: string;
  status: "Active" | "Inactive";
  planType: "Manual" | "Subscription";
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

export interface ManualPlan {
  id: string;
  name: string;
  duration: "3 Months" | "6 Months" | "1 Year";
  price: number;
  pageCount: number;
  orgsCount: number;
}

export interface SubPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  monthlyPageLimit: number;
  features: string[];
  orgsCount: number;
}

export interface TopUpPlan {
  id: string;
  name: string;
  pages: number;
  price: number;
  usageCount: number;
}

export interface SuperAdminActivityLog {
  id: string;
  dateTime: string;
  action: string;
  module: "Organization" | "Billing" | "User" | "System";
  organization: string;
  performedBy: string;
  details: string;
  icon: string;
  color: string;
}
