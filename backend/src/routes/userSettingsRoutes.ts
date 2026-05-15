import { Router } from "express";
import { settingsController } from "../controllers/settingsController";

const userSettingsRoutes = Router();

userSettingsRoutes.get("/profile", settingsController.getProfile);
userSettingsRoutes.put("/profile", settingsController.updateProfile);
userSettingsRoutes.post("/change-password", settingsController.changePassword);
userSettingsRoutes.get("/activity", settingsController.getActivityLogs);

export default userSettingsRoutes;
