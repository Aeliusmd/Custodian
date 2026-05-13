import type { Request, Response } from "express";
import { superAdminService } from "../services/superAdminService";

const unauthorized = (res: Response) => res.status(401).json({ message: "Unauthorized" });
const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export const superAdminController = {
  async getDashboardSummary(_req: Request, res: Response) {
    try {
      const summary = await superAdminService.getDashboardSummary();
      return res.status(200).json(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch dashboard summary";
      return res.status(500).json({ message });
    }
  },
  async listOrganizations(req: Request, res: Response) {
    const query = {
      search: asString(req.query.search),
      status: asString(req.query.status),
      planType: asString(req.query.planType),
    };
    try {
      const organizations = await superAdminService.listOrganizations(query);
      return res.status(200).json(organizations);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch organizations";
      return res.status(500).json({ message });
    }
  },
  async createOrganization(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const org = await superAdminService.createOrganization(req.user, req.body);
      return res.status(201).json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create organization";
      return res.status(400).json({ message });
    }
  },
  async getOrganizationById(req: Request, res: Response) {
    const org = await superAdminService.getOrganizationById(asString(req.params.id) ?? "");
    if (!org) return res.status(404).json({ message: "Organization not found" });
    return res.status(200).json(org);
  },
  async updateOrganization(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const org = await superAdminService.updateOrganization(req.user, asString(req.params.id) ?? "", req.body);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      return res.status(200).json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update organization";
      return res.status(400).json({ message });
    }
  },
  async patchOrganizationStatus(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    const org = await superAdminService.updateOrganizationStatus(
      req.user,
      asString(req.params.id) ?? "",
      req.body.status,
    );
    if (!org) return res.status(404).json({ message: "Organization not found" });
    return res.status(200).json(org);
  },
  async deleteOrganization(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    const ok = await superAdminService.deleteOrganization(req.user, asString(req.params.id) ?? "");
    if (!ok) return res.status(404).json({ message: "Organization not found" });
    return res.status(204).send();
  },

  async listBilling(_req: Request, res: Response) {
    try {
      const billing = await superAdminService.listBilling();
      return res.status(200).json(billing);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch billing data";
      return res.status(500).json({ message });
    }
  },
  async createManualPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const plan = await superAdminService.createManualPlan(req.user, req.body);
      return res.status(201).json(plan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create manual plan";
      return res.status(400).json({ message });
    }
  },
  async createSubPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const plan = await superAdminService.createSubPlan(req.user, req.body);
      return res.status(201).json(plan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create subscription plan";
      return res.status(400).json({ message });
    }
  },
  async createTopUpPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const plan = await superAdminService.createTopUpPlan(req.user, req.body);
      return res.status(201).json(plan);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create top-up plan";
      return res.status(400).json({ message });
    }
  },
  async updateManualPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const ok = await superAdminService.updateManualPlan(req.user, asString(req.params.id) ?? "", req.body);
      if (!ok) return res.status(404).json({ message: "Manual plan not found" });
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update manual plan";
      return res.status(400).json({ message });
    }
  },
  async updateSubPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const ok = await superAdminService.updateSubPlan(req.user, asString(req.params.id) ?? "", req.body);
      if (!ok) return res.status(404).json({ message: "Subscription plan not found" });
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update subscription plan";
      return res.status(400).json({ message });
    }
  },
  async updateTopUpPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const ok = await superAdminService.updateTopUpPlan(req.user, asString(req.params.id) ?? "", req.body);
      if (!ok) return res.status(404).json({ message: "Top-up plan not found" });
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update top-up plan";
      return res.status(400).json({ message });
    }
  },
  async deleteManualPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const ok = await superAdminService.deleteManualPlan(req.user, asString(req.params.id) ?? "");
      if (!ok) return res.status(404).json({ message: "Manual plan not found" });
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete manual plan";
      return res.status(500).json({ message });
    }
  },
  async deleteSubPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const ok = await superAdminService.deleteSubPlan(req.user, asString(req.params.id) ?? "");
      if (!ok) return res.status(404).json({ message: "Subscription plan not found" });
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete subscription plan";
      return res.status(500).json({ message });
    }
  },
  async deleteTopUpPlan(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    try {
      const ok = await superAdminService.deleteTopUpPlan(req.user, asString(req.params.id) ?? "");
      if (!ok) return res.status(404).json({ message: "Top-up plan not found" });
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete top-up plan";
      return res.status(500).json({ message });
    }
  },

  async listActivity(req: Request, res: Response) {
    const query = {
      search: asString(req.query.search),
      module: asString(req.query.module),
      performedBy: asString(req.query.performedBy),
      organization: asString(req.query.organization),
    };
    try {
      const logs = await superAdminService.listActivity(query);
      return res.status(200).json(logs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch activity logs";
      return res.status(500).json({ message });
    }
  },
};
