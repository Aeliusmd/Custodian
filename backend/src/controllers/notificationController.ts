import type { Request, Response } from "express";
import { inAppNotificationService } from "../services/inAppNotificationService";

const unauthorized = (res: Response) => res.status(401).json({ message: "Unauthorized" });

export const notificationController = {
  async list(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    const notifications = await inAppNotificationService.list(req.user, req.query.limit);
    return res.status(200).json({ notifications });
  },

  async unreadCount(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    return res.status(200).json(await inAppNotificationService.unreadCount(req.user));
  },

  async markRead(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "Notification id is required" });
    return res.status(200).json(await inAppNotificationService.markRead(req.user, id));
  },

  async markAllRead(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    return res.status(200).json(await inAppNotificationService.markAllRead(req.user));
  },

  async delete(req: Request, res: Response) {
    if (!req.user) return unauthorized(res);
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "Notification id is required" });
    return res.status(200).json(await inAppNotificationService.delete(req.user, id));
  },
};
