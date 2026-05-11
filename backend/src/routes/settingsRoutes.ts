import { Router } from "express";
import { settingsController } from "../controllers/settingsController";

const settingsRoutes = Router();

settingsRoutes.get("/profile", settingsController.getProfile);
settingsRoutes.put("/profile", settingsController.updateProfile);
settingsRoutes.post("/change-password", settingsController.changePassword);
settingsRoutes.get("/notifications", settingsController.getNotificationSettings);
settingsRoutes.put("/notifications", settingsController.updateNotificationSettings);
settingsRoutes.get("/activity", settingsController.getActivityLogs);

export default settingsRoutes;
