import type { Request, Response } from "express";
import { settingsService } from "../services/settingsService";

const unauthorized = (res: Response) => res.status(401).json({ message: "Unauthorized" });

export const settingsController = {
  async getProfile(req: Request, res: Response) {
    if (!req.user) {
      return unauthorized(res);
    }
    return res.status(200).json(await settingsService.getProfile(req.user));
  },

  async updateProfile(req: Request, res: Response) {
    if (!req.user) {
      return unauthorized(res);
    }
    return res.status(200).json(await settingsService.updateProfile(req.user, req.body));
  },

  async changePassword(req: Request, res: Response) {
    if (!req.user) {
      return unauthorized(res);
    }

    try {
      const result = await settingsService.changePassword(req.user, req.body);
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to change password";
      return res.status(400).json({ message });
    }
  },

  getNotificationSettings(req: Request, res: Response) {
    if (!req.user) {
      return unauthorized(res);
    }
    return res.status(200).json(settingsService.getNotificationSettings(req.user));
  },

  updateNotificationSettings(req: Request, res: Response) {
    if (!req.user) {
      return unauthorized(res);
    }
    return res.status(200).json(settingsService.updateNotificationSettings(req.user, req.body));
  },

  getActivityLogs(req: Request, res: Response) {
    if (!req.user) {
      return unauthorized(res);
    }
    return res.status(200).json(settingsService.getActivityLogs(req.user));
  },
};
