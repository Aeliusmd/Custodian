import bcrypt from "bcryptjs";
import type { Role } from "../types/auth";

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  organizationId: string;
  isActive: boolean;
}

const users: UserRecord[] = [
  {
    id: "u_1",
    email: "superadmin@custodian.local",
    passwordHash: bcrypt.hashSync("Password@123", 10),
    fullName: "System Super Admin",
    role: "SUPER_ADMIN",
    organizationId: "system",
    isActive: true,
  },
  {
    id: "u_2",
    email: "orgadmin@acme.local",
    passwordHash: bcrypt.hashSync("Password@123", 10),
    fullName: "Acme Org Admin",
    role: "ORG_ADMIN",
    organizationId: "org_acme",
    isActive: true,
  },
  {
    id: "u_3",
    email: "user@acme.local",
    passwordHash: bcrypt.hashSync("Password@123", 10),
    fullName: "Acme End User",
    role: "USER",
    organizationId: "org_acme",
    isActive: true,
  },
];

export const userModel = {
  findByEmail(email: string): UserRecord | undefined {
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
  },
  findById(id: string): UserRecord | undefined {
    return users.find((user) => user.id === id);
  },
  create(user: UserRecord): UserRecord {
    users.push(user);
    return user;
  },
  updatePassword(id: string, passwordHash: string): boolean {
    const user = users.find((item) => item.id === id);
    if (!user) {
      return false;
    }
    user.passwordHash = passwordHash;
    return true;
  },
};
