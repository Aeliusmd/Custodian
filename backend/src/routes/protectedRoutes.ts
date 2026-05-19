import { Router } from "express";
import { protectedController } from "../controllers/protectedController";
import { memoryUploadBulk } from "../middlewares/documentUploadMemory";
import { requireAuth, requireRole } from "../middlewares/authMiddleware";

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
protectedRoutes.post(
  "/org-admin/documents/single",
  requireAuth,
  requireRole("ORG_ADMIN"),
  protectedController.createOrgAdminSingleDocument,
);
protectedRoutes.post(
  "/org-admin/documents/bulk",
  requireAuth,
  requireRole("ORG_ADMIN"),
  memoryUploadBulk,
  protectedController.createOrgAdminBulkDocuments,
);
protectedRoutes.get("/org-admin/search", requireAuth, requireRole("ORG_ADMIN"), protectedController.searchOrgAdminDocuments);
protectedRoutes.post(
  "/org-admin/search/reindex",
  requireAuth,
  requireRole("ORG_ADMIN"),
  protectedController.reindexOrgAdminSearch,
);
protectedRoutes.post(
  "/org-admin/advanced-search",
  requireAuth,
  requireRole("ORG_ADMIN"),
  protectedController.advancedSearchOrgAdminDocuments,
);
protectedRoutes.get("/org-admin/documents", requireAuth, requireRole("ORG_ADMIN"), protectedController.listOrgAdminDocuments);
protectedRoutes.get(
  "/org-admin/documents/:id/preview/:pageNum",
  requireAuth,
  requireRole("ORG_ADMIN"),
  protectedController.getOrgAdminDocumentPreview,
);
protectedRoutes.get(
  "/org-admin/documents/:id/file",
  requireAuth,
  requireRole("ORG_ADMIN"),
  protectedController.getOrgAdminDocumentFile,
);
protectedRoutes.get("/org-admin/documents/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.getOrgAdminDocument);
protectedRoutes.patch("/org-admin/documents/:id/archive", requireAuth, requireRole("ORG_ADMIN"), protectedController.updateOrgAdminDocumentArchiveStatus);
protectedRoutes.patch("/org-admin/documents/:id/metadata", requireAuth, requireRole("ORG_ADMIN"), protectedController.updateOrgAdminDocumentMetadata);
protectedRoutes.delete("/org-admin/documents/:id", requireAuth, requireRole("ORG_ADMIN"), protectedController.deleteOrgAdminDocument);

protectedRoutes.get("/user", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.userData);
protectedRoutes.get("/user/dashboard", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.userDashboard);
protectedRoutes.get("/user/categories", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.listOrgAdminCategories);
protectedRoutes.get("/user/search", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.searchUserOwnDocuments);
protectedRoutes.post(
  "/user/advanced-search",
  requireAuth,
  requireRole("USER", "ORG_ADMIN"),
  protectedController.advancedSearchUserDocuments,
);
protectedRoutes.post("/user/documents/single", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.createOrgAdminSingleDocument);
protectedRoutes.post("/user/documents/bulk", requireAuth, requireRole("USER", "ORG_ADMIN"), memoryUploadBulk, protectedController.createOrgAdminBulkDocuments);
protectedRoutes.get("/user/documents", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.listUserDocuments);
protectedRoutes.get("/user/documents/:id", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.getUserDocument);
protectedRoutes.get(
  "/user/documents/:id/file",
  requireAuth,
  requireRole("USER", "ORG_ADMIN"),
  protectedController.getUserDocumentFile,
);
protectedRoutes.patch("/user/documents/:id/archive", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.updateUserDocumentArchiveStatus);
protectedRoutes.patch("/user/documents/:id/metadata", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.updateUserDocumentMetadata);
protectedRoutes.delete("/user/documents/:id", requireAuth, requireRole("USER", "ORG_ADMIN"), protectedController.deleteUserDocument);

protectedRoutes.get(
  "/super-admin",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  protectedController.superAdminData,
);

export default protectedRoutes;
