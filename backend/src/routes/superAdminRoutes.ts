import { Router } from "express";
import { superAdminController } from "../controllers/superAdminController";

const superAdminRoutes = Router();

superAdminRoutes.get("/dashboard", superAdminController.getDashboardSummary);
superAdminRoutes.get("/organizations", superAdminController.listOrganizations);
superAdminRoutes.post("/organizations", superAdminController.createOrganization);
superAdminRoutes.get("/organizations/:id", superAdminController.getOrganizationById);
superAdminRoutes.put("/organizations/:id", superAdminController.updateOrganization);
superAdminRoutes.patch("/organizations/:id/status", superAdminController.patchOrganizationStatus);
superAdminRoutes.delete("/organizations/:id", superAdminController.deleteOrganization);

superAdminRoutes.get("/billing", superAdminController.listBilling);
superAdminRoutes.post("/billing/manual-plans", superAdminController.createManualPlan);
superAdminRoutes.post("/billing/subscription-plans", superAdminController.createSubPlan);
superAdminRoutes.post("/billing/topup-plans", superAdminController.createTopUpPlan);
superAdminRoutes.put("/billing/manual-plans/:id", superAdminController.updateManualPlan);
superAdminRoutes.put("/billing/subscription-plans/:id", superAdminController.updateSubPlan);
superAdminRoutes.put("/billing/topup-plans/:id", superAdminController.updateTopUpPlan);
superAdminRoutes.delete("/billing/manual-plans/:id", superAdminController.deleteManualPlan);
superAdminRoutes.delete("/billing/subscription-plans/:id", superAdminController.deleteSubPlan);
superAdminRoutes.delete("/billing/topup-plans/:id", superAdminController.deleteTopUpPlan);

superAdminRoutes.get("/activity-logs", superAdminController.listActivity);

superAdminRoutes.get("/admins", superAdminController.listAdmins);
superAdminRoutes.post("/admins", superAdminController.createAdmin);
superAdminRoutes.delete("/admins/:id", superAdminController.deleteAdmin);

export default superAdminRoutes;
