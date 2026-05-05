export type UserRole = 'Admin' | 'User';

export type UserStatus = 'Active' | 'Inactive';

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  createdDate: string;
}