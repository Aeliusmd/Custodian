import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env";
import { superAdminModel } from "../models/superAdminModel";
import { superAdminAuthModel } from "../models/superAdminAuthModel";
import { emailService } from "./emailService";
import type { SafeUser } from "../types/auth";
import type { ManualPlan, Organization, SubPlan, SuperAdminActivityLog, TopUpPlan } from "../types/superAdmin";

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const assertAllowed = <T extends string>(value: unknown, allowed: readonly T[], label: string): T => {
  if (typeof value !== "string") throw new Error(`${label} is required`);
  const v = value.trim() as T;
  if (!allowed.includes(v)) throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
  return v;
};

const cleanFeatures = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .slice(0, 50);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  return [];
};

const toCreateManualPlanPayload = (payload: unknown): Omit<ManualPlan, "id" | "orgsCount"> => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const name = asNonEmptyString(p.name);
  if (!name) throw new Error("Plan name is required");
  const duration = assertAllowed(p.duration, ["3 Months", "6 Months", "1 Year"] as const, "Duration");
  const price = asFiniteNumber(p.price);
  if (price === null || price < 0) throw new Error("Price must be a non-negative number");
  const pageCount = asFiniteNumber(p.pageCount);
  if (pageCount === null || pageCount < 0) throw new Error("Page count must be a non-negative number");
  return { name, duration, price, pageCount };
};

const toCreateSubPlanPayload = (payload: unknown): Omit<SubPlan, "id" | "orgsCount"> => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const name = asNonEmptyString(p.name);
  if (!name) throw new Error("Plan name is required");
  const monthlyPrice = asFiniteNumber(p.monthlyPrice);
  if (monthlyPrice === null || monthlyPrice < 0) throw new Error("Monthly price must be a non-negative number");
  const monthlyPageLimit = asFiniteNumber(p.monthlyPageLimit);
  if (monthlyPageLimit === null || monthlyPageLimit < 0) throw new Error("Monthly page limit must be a non-negative number");
  const features = cleanFeatures(p.features);
  return { name, monthlyPrice, monthlyPageLimit, features };
};

const toCreateTopUpPlanPayload = (payload: unknown): Omit<TopUpPlan, "id" | "usageCount"> => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const name = asNonEmptyString(p.name);
  if (!name) throw new Error("Plan name is required");
  const pages = asFiniteNumber(p.pages);
  if (pages === null || pages < 0) throw new Error("Pages must be a non-negative number");
  const price = asFiniteNumber(p.price);
  if (price === null || price < 0) throw new Error("Price must be a non-negative number");
  return { name, pages, price };
};

const toUpdateManualPlanPayload = (payload: unknown): Partial<ManualPlan> => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const out: Partial<ManualPlan> = {};
  if (p.name !== undefined) {
    const name = asNonEmptyString(p.name);
    if (!name) throw new Error("Plan name cannot be empty");
    out.name = name;
  }
  if (p.duration !== undefined) {
    out.duration = assertAllowed(p.duration, ["3 Months", "6 Months", "1 Year"] as const, "Duration");
  }
  if (p.price !== undefined) {
    const price = asFiniteNumber(p.price);
    if (price === null || price < 0) throw new Error("Price must be a non-negative number");
    out.price = price;
  }
  if (p.pageCount !== undefined) {
    const pageCount = asFiniteNumber(p.pageCount);
    if (pageCount === null || pageCount < 0) throw new Error("Page count must be a non-negative number");
    out.pageCount = pageCount;
  }
  return out;
};

const toUpdateSubPlanPayload = (payload: unknown): Partial<SubPlan> => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const out: Partial<SubPlan> = {};
  if (p.name !== undefined) {
    const name = asNonEmptyString(p.name);
    if (!name) throw new Error("Plan name cannot be empty");
    out.name = name;
  }
  if (p.monthlyPrice !== undefined) {
    const monthlyPrice = asFiniteNumber(p.monthlyPrice);
    if (monthlyPrice === null || monthlyPrice < 0) throw new Error("Monthly price must be a non-negative number");
    out.monthlyPrice = monthlyPrice;
  }
  if (p.monthlyPageLimit !== undefined) {
    const monthlyPageLimit = asFiniteNumber(p.monthlyPageLimit);
    if (monthlyPageLimit === null || monthlyPageLimit < 0) throw new Error("Monthly page limit must be a non-negative number");
    out.monthlyPageLimit = monthlyPageLimit;
  }
  if (p.features !== undefined) {
    out.features = cleanFeatures(p.features);
  }
  return out;
};

const toUpdateTopUpPlanPayload = (payload: unknown): Partial<TopUpPlan> => {
  const p = (payload ?? {}) as Record<string, unknown>;
  const out: Partial<TopUpPlan> = {};
  if (p.name !== undefined) {
    const name = asNonEmptyString(p.name);
    if (!name) throw new Error("Plan name cannot be empty");
    out.name = name;
  }
  if (p.pages !== undefined) {
    const pages = asFiniteNumber(p.pages);
    if (pages === null || pages < 0) throw new Error("Pages must be a non-negative number");
    out.pages = pages;
  }
  if (p.price !== undefined) {
    const price = asFiniteNumber(p.price);
    if (price === null || price < 0) throw new Error("Price must be a non-negative number");
    out.price = price;
  }
  return out;
};

const addLog = async (
  user: SafeUser,
  module: SuperAdminActivityLog["module"],
  action: string,
  details: string,
  organization = "System",
) => {
  const orgId = organization === "System" ? null : await superAdminModel.findOrganizationIdByName(organization);
  await superAdminModel.createActivityLogInDb({
    performedBy: user.id,
    orgId,
    action,
    module,
    details,
  });
};

export const superAdminService = {
  async getDashboardSummary() {
    return superAdminModel.getDashboardSummaryFromDb();
  },
  async listOrganizations(query: {
    search: string | undefined;
    status: string | undefined;
    planType: string | undefined;
  }) {
    return superAdminModel.listOrganizationsFromDb(query);
  },
  async createOrganization(user: SafeUser, payload: Omit<Organization, "id">): Promise<Organization> {
    const { organization, invites } = await superAdminModel.createOrganizationWithTenantProvisioning({
      actorId: user.id,
      name: payload.name,
      email: payload.email,
      industry: payload.industry,
      phone: payload.phone,
      address: payload.address,
      planType: payload.planType,
      planName: payload.planName,
      planExpiry: payload.planExpiry,
      admins: payload.admins?.map((a) => ({ name: a.name, email: a.email })),
    });

    for (const invite of invites) {
      const inviteUrl = `${env.frontendBaseUrl}/auth/set-password?token=${encodeURIComponent(invite.token)}`;
      try {
        await emailService.sendOrgAdminInviteEmail({
          email: invite.email,
          name: invite.name,
          organizationName: organization.name,
          inviteUrl,
          expiresMinutes: 60,
        });
      } catch (error) {
        // Creation should not fail if one email fails; admin can resend invite.
        console.error(`[ORG-INVITE-EMAIL-FAILED] email=${invite.email}`, error);
      }
    }

    await addLog(user, "Organization", "Organization Created", `Created ${organization.name}`, organization.name);
    return organization;
  },
  async updateOrganization(user: SafeUser, id: string, payload: Partial<Organization>) {
    const ok = await superAdminModel.updateOrganizationInDb(id, payload);
    if (!ok) return null;
    await superAdminModel.updateOrganizationPlanInDb(id, {
      planName: payload.planName,
      planExpiry: payload.planExpiry,
      actorId: user.id,
    });
    const adminInvites = await superAdminModel.syncOrganizationAdminsInDb({
      orgId: id,
      actorId: user.id,
      admins: (payload.admins ?? []).map((a) => ({ id: a.id, name: a.name, email: a.email })),
    });

    const orgNameForInvite = payload.name ?? "your organization";
    for (const invite of adminInvites) {
      const inviteUrl = `${env.frontendBaseUrl}/auth/set-password?token=${encodeURIComponent(invite.token)}`;
      try {
        await emailService.sendOrgAdminInviteEmail({
          email: invite.email,
          name: invite.name,
          organizationName: orgNameForInvite,
          inviteUrl,
          expiresMinutes: 60,
        });
      } catch (error) {
        console.error(`[ORG-INVITE-EMAIL-FAILED] email=${invite.email}`, error);
      }
    }

    const updated = await superAdminModel.getOrganizationByIdFromDb(id);
    if (updated) {
      await addLog(user, "Organization", "Organization Updated", `Updated ${updated.name}`, updated.name);
    }
    return updated;
  },
  async updateOrganizationStatus(user: SafeUser, id: string, status: "Active" | "Inactive") {
    const ok = await superAdminModel.updateOrganizationStatusInDb(id, status);
    if (!ok) return null;
    const updated = await superAdminModel.getOrganizationByIdFromDb(id);
    if (updated) {
      await addLog(
        user,
        "Organization",
        `Organization ${status === "Active" ? "Activated" : "Deactivated"}`,
        `${updated.name} status set to ${status}`,
        updated.name,
      );
    }
    return updated;
  },
  async deleteOrganization(user: SafeUser, id: string) {
    const org = await superAdminModel.getOrganizationByIdFromDb(id);
    const ok = await superAdminModel.deleteOrganizationInDb(id);
    if (ok && org) await addLog(user, "Organization", "Organization Deleted", `Deleted ${org.name}`, org.name);
    return ok;
  },
  async getOrganizationById(id: string) { return superAdminModel.getOrganizationByIdFromDb(id); },

  async listBilling() {
    return superAdminModel.listBillingFromDb();
  },
  async createManualPlan(user: SafeUser, payload: Omit<ManualPlan, "id" | "orgsCount">) {
    const plan = await superAdminModel.createManualPlanInDb(toCreateManualPlanPayload(payload));
    await addLog(user, "Billing", "Manual Plan Created", `Created ${plan.name}`);
    return plan;
  },
  async createSubPlan(user: SafeUser, payload: Omit<SubPlan, "id" | "orgsCount">) {
    const plan = await superAdminModel.createSubPlanInDb(toCreateSubPlanPayload(payload));
    await addLog(user, "Billing", "Subscription Plan Created", `Created ${plan.name}`);
    return plan;
  },
  async createTopUpPlan(user: SafeUser, payload: Omit<TopUpPlan, "id" | "usageCount">) {
    const plan = await superAdminModel.createTopUpPlanInDb(toCreateTopUpPlanPayload(payload));
    await addLog(user, "Billing", "Top-Up Plan Created", `Created ${plan.name}`);
    return plan;
  },
  async updateManualPlan(user: SafeUser, id: string, payload: Partial<ManualPlan>) {
    const ok = await superAdminModel.updateManualPlanInDb(id, toUpdateManualPlanPayload(payload));
    if (ok) await addLog(user, "Billing", "Manual Plan Updated", `Updated ${id}`);
    return ok;
  },
  async updateSubPlan(user: SafeUser, id: string, payload: Partial<SubPlan>) {
    const ok = await superAdminModel.updateSubPlanInDb(id, toUpdateSubPlanPayload(payload));
    if (ok) await addLog(user, "Billing", "Subscription Plan Updated", `Updated ${id}`);
    return ok;
  },
  async updateTopUpPlan(user: SafeUser, id: string, payload: Partial<TopUpPlan>) {
    const ok = await superAdminModel.updateTopUpPlanInDb(id, toUpdateTopUpPlanPayload(payload));
    if (ok) await addLog(user, "Billing", "Top-Up Plan Updated", `Updated ${id}`);
    return ok;
  },
  async deleteManualPlan(user: SafeUser, id: string) {
    const ok = await superAdminModel.deleteManualPlanInDb(id);
    if (ok) await addLog(user, "Billing", "Manual Plan Deleted", `Deleted manual plan ${id}`);
    return ok;
  },
  async deleteSubPlan(user: SafeUser, id: string) {
    const ok = await superAdminModel.deleteSubPlanInDb(id);
    if (ok) await addLog(user, "Billing", "Subscription Plan Deleted", `Deleted subscription plan ${id}`);
    return ok;
  },
  async deleteTopUpPlan(user: SafeUser, id: string) {
    const ok = await superAdminModel.deleteTopUpPlanInDb(id);
    if (ok) await addLog(user, "Billing", "Top-Up Plan Deleted", `Deleted top-up plan ${id}`);
    return ok;
  },

  async listActivity(query: {
    search: string | undefined;
    module: string | undefined;
    performedBy: string | undefined;
    organization: string | undefined;
  }) {
    return superAdminModel.listActivityLogsFromDb(query);
  },

  async listAdmins(): Promise<{ id: string; name: string; email: string; status: "Active" | "Inactive" }[]> {
    const admins = await superAdminAuthModel.listAll();
    return admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      status: a.status === "active" ? "Active" : "Inactive",
    }));
  },

  async createAdmin(
    user: SafeUser,
    payload: { name: string; email: string; password: string },
  ): Promise<{ id: string; name: string; email: string; status: "Active" }> {
    const name = payload.name?.trim();
    const email = payload.email?.trim();
    const password = payload.password;
    if (!name) throw new Error("Name is required");
    if (!email) throw new Error("Email is required");
    if (!password) throw new Error("Password is required");

    const existing = await superAdminAuthModel.findByEmail(email);
    if (existing) throw new Error("An admin with this email already exists");

    const passwordHash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    await superAdminAuthModel.createAdmin({ id, name, email, passwordHash });
    await addLog(user, "User", "Admin Created", `Created admin ${name}`);
    return { id, name, email, status: "Active" };
  },

  async deleteAdmin(user: SafeUser, id: string): Promise<boolean> {
    if (user.id === id) throw new Error("Cannot delete your own account");
    const admin = await superAdminAuthModel.findById(id);
    const ok = await superAdminAuthModel.deleteById(id);
    if (ok && admin) await addLog(user, "User", "Admin Deleted", `Deleted admin ${admin.name}`);
    return ok;
  },
};
