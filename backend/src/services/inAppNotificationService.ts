import { notificationModel } from "../models/notificationModel";
import type { SafeUser } from "../types/auth";
import type { AppNotification } from "../types/notification";

export const inAppNotificationService = {
  async list(user: SafeUser, limit: unknown): Promise<AppNotification[]> {
    return notificationModel.listForUser(user.organizationId, user.id, limit);
  },

  async unreadCount(user: SafeUser): Promise<{ unreadCount: number }> {
    return {
      unreadCount: await notificationModel.countUnreadForUser(user.organizationId, user.id),
    };
  },

  async markRead(user: SafeUser, notificationId: string): Promise<{ success: boolean }> {
    await notificationModel.markRead(user.organizationId, user.id, notificationId);
    return { success: true };
  },

  async markAllRead(user: SafeUser): Promise<{ success: boolean }> {
    await notificationModel.markAllRead(user.organizationId, user.id);
    return { success: true };
  },

  async delete(user: SafeUser, notificationId: string): Promise<{ success: boolean }> {
    await notificationModel.deleteForUser(user.organizationId, user.id, notificationId);
    return { success: true };
  },
};
