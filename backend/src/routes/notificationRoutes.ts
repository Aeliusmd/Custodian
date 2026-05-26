import { Router } from "express";
import { notificationController } from "../controllers/notificationController";

const notificationRoutes = Router();

notificationRoutes.get("/", notificationController.list);
notificationRoutes.get("/unread-count", notificationController.unreadCount);
notificationRoutes.patch("/read-all", notificationController.markAllRead);
notificationRoutes.patch("/:id/read", notificationController.markRead);
notificationRoutes.delete("/:id", notificationController.delete);

export default notificationRoutes;
