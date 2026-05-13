import { Router } from "express";
import { protectedController } from "../controllers/protectedController";
import { requireAuth, requireRole } from "../middlewares/authMiddleware";
import { validateOwnUserId } from "../middlewares/userScopeMiddleware";

const protectedRoutes = Router();

protectedRoutes.get("/org-admin", requireAuth, requireRole("ORG_ADMIN"), protectedController.orgAdminData);
protectedRoutes.get("/org-admin/dashboard", requireAuth, requireRole("ORG_ADMIN"), protectedController.orgAdminDashboard);
protectedRoutes.get("/org-admin/categories", requireAuth, requireRole("ORG_ADMIN"), protectedController.listOrgAdminCategories);
protectedRoutes.post("/org-admin/categories", requireAuth, requireRole("ORG_ADMIN"), protectedController.createOrgAdminCategory);
protectedRoutes.put("/org-admin/categories/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.updateOrgAdminCategory);
protectedRoutes.delete("/org-admin/categories/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.deleteOrgAdminCategory);
protectedRoutes.get("/org-admin/users", requireAuth, requireRole("ORG_ADMIN"), protectedController.listOrgAdminUsers);
protectedRoutes.post("/org-admin/users", requireAuth, requireRole("ORG_ADMIN"), protectedController.createOrgAdminUser);
protectedRoutes.put("/org-admin/users/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.updateOrgAdminUser);
protectedRoutes.delete("/org-admin/users/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.deleteOrgAdminUser);
protectedRoutes.post("/org-admin/users/:id/reset-password", requireAuth, requireRole("ORG_ADMIN"), protectedController.resetOrgAdminUserPassword);
protectedRoutes.post("/org-admin/documents/single", requireAuth, requireRole("ORG_ADMIN"), protectedController.createOrgAdminSingleDocument);
protectedRoutes.post("/org-admin/documents/bulk", requireAuth, requireRole("ORG_ADMIN"), protectedController.createOrgAdminBulkDocuments);
protectedRoutes.get("/org-admin/documents", requireAuth, requireRole("ORG_ADMIN"), protectedController.listOrgAdminDocuments);
protectedRoutes.get("/org-admin/documents/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.getOrgAdminDocument);
protectedRoutes.patch("/org-admin/documents/:id/archive", requireAuth, requireRole("ORG_ADMIN"), protectedController.updateOrgAdminDocumentArchiveStatus);
protectedRoutes.patch("/org-admin/documents/:id/metadata", requireAuth, requireRole("ORG_ADMIN"), protectedController.updateOrgAdminDocumentMetadata);
protectedRoutes.delete("/org-admin/documents/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.deleteOrgAdminDocument);
protectedRoutes.get("/user", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.userData);
protectedRoutes.get("/user/dashboard", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.userDashboard);
protectedRoutes.get("/user/categories", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.listOrgAdminCategories);
protectedRoutes.get("/user/search", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.searchUserDocuments);
protectedRoutes.post("/user/documents/single", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.createOrgAdminSingleDocument);
protectedRoutes.post("/user/documents/bulk", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.createOrgAdminBulkDocuments);
protectedRoutes.get("/user/documents", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.listOrgAdminDocuments);
protectedRoutes.get("/user/documents/:id", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.getOrgAdminDocument);
protectedRoutes.patch("/user/documents/:id/archive", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.updateOrgAdminDocumentArchiveStatus);
protectedRoutes.patch("/user/documents/:id/metadata", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.updateOrgAdminDocumentMetadata);
protectedRoutes.delete("/user/documents/:id", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.deleteOrgAdminDocument);

// User-scoped routes — /:userId in path, validated against JWT session
protectedRoutes.get("/user/:userId", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.userData);
protectedRoutes.get("/user/:userId/dashboard", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.userDashboard);
protectedRoutes.get("/user/:userId/categories", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.listOrgAdminCategories);
protectedRoutes.get("/user/:userId/search", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.searchUserDocuments);
protectedRoutes.post("/user/:userId/documents/single", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.createOrgAdminSingleDocument);
protectedRoutes.post("/user/:userId/documents/bulk", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.createOrgAdminBulkDocuments);
protectedRoutes.get("/user/:userId/documents", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.listUserDocuments);
protectedRoutes.get("/user/:userId/documents/:id", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.getOrgAdminDocument);
protectedRoutes.patch("/user/:userId/documents/:id/archive", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.updateOrgAdminDocumentArchiveStatus);
protectedRoutes.patch("/user/:userId/documents/:id/metadata", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.updateOrgAdminDocumentMetadata);
protectedRoutes.delete("/user/:userId/documents/:id", requireAuth, requireRole("USER", "ORG_ADMIN"), validateOwnUserId, protectedController.deleteOrgAdminDocument);
protectedRoutes.get(
  "/super-admin",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  protectedController.superAdminData,
);

export default protectedRoutes;
