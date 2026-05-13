export type Role = "SUPER_ADMIN" | "ORG_ADMIN" | "USER";

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
  isActive: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupPayload {
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  industry: string;
  plan: "starter" | "professional" | "enterprise";
  password: string;
}

export interface LoginIdentity {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  organizationId: string;
  isActive: boolean;
  organizationDbName?: string;
}
