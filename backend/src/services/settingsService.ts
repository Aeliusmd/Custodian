import bcrypt from "bcryptjs";
import { settingsModel } from "../models/settingsModel";
import { superAdminAuthModel } from "../models/superAdminAuthModel";
import { userModel } from "../models/userModel";
import type { SafeUser } from "../types/auth";
import type { NotificationSetting, PasswordPayload, UserProfile } from "../types/settings";

const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export const settingsService = {
  async getProfile(user: SafeUser): Promise<UserProfile> {
    if (user.role === "SUPER_ADMIN") {
      const record = await superAdminAuthModel.findById(user.id);
      const fullName = record?.name ?? user.fullName;
      const [firstName = "", ...rest] = fullName.split(" ");
      return {
        firstName,
        lastName: rest.join(" "),
        email: record?.email ?? user.email,
        phone: record?.phone ?? "",
        language: "English",
        role: user.role,
        bio: "",
      };
    }
    return settingsModel.getProfile(user.id, user.email, user.fullName, user.role);
  },

  async updateProfile(user: SafeUser, payload: UserProfile): Promise<UserProfile> {
    if (user.role === "SUPER_ADMIN") {
      const fullName = `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim();
      if (fullName) {
        await superAdminAuthModel.updateProfileById(user.id, {
          name: fullName,
          email: payload.email,
          phone: payload.phone,
        });
      } else if (payload.email || payload.phone !== undefined) {
        await superAdminAuthModel.updateProfileById(user.id, {
          email: payload.email,
          phone: payload.phone,
        });
      }
      return this.getProfile(user);
    }

    settingsModel.appendActivity(user.id, {
      id: `log-${Date.now()}`,
      dateTime: nowStamp(),
      action: "Profile Updated",
      module: "Settings",
      description: "Updated personal profile information.",
    });
    return settingsModel.setProfile(user.id, payload);
  },

  async changePassword(user: SafeUser, payload: PasswordPayload): Promise<{ success: boolean }> {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new Error("New password and confirm password do not match");
    }

    const superAdminRecord = user.role === "SUPER_ADMIN" ? await superAdminAuthModel.findById(user.id) : null;
    const regularUserRecord = user.role === "SUPER_ADMIN" ? null : userModel.findById(user.id);
    const passwordHash = superAdminRecord?.passwordHash ?? regularUserRecord?.passwordHash;
    if (!passwordHash) {
      throw new Error("User not found");
    }

    const isCurrentPasswordValid = await bcrypt.compare(payload.currentPassword, passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const nextHash = await bcrypt.hash(payload.newPassword, 10);
    if (user.role === "SUPER_ADMIN") {
      await superAdminAuthModel.updatePasswordById(user.id, nextHash);
    } else {
      userModel.updatePassword(user.id, nextHash);
    }
    settingsModel.appendActivity(user.id, {
      id: `log-${Date.now()}`,
      dateTime: nowStamp(),
      action: "Password Changed",
      module: "Security",
      description: "Updated account password.",
    });
    return { success: true };
  },

  getNotificationSettings(user: SafeUser): NotificationSetting[] {
    return settingsModel.getNotifications(user.id);
  },

  updateNotificationSettings(user: SafeUser, payload: NotificationSetting[]): NotificationSetting[] {
    settingsModel.appendActivity(user.id, {
      id: `log-${Date.now()}`,
      dateTime: nowStamp(),
      action: "Notification Settings Updated",
      module: "Settings",
      description: "Updated notification preferences.",
    });
    return settingsModel.setNotifications(user.id, payload);
  },

  getActivityLogs(user: SafeUser) {
    return settingsModel.getActivity(user.id);
  },
};
