import bcrypt from "bcryptjs";
import { settingsModel } from "../models/settingsModel";
import { superAdminAuthModel } from "../models/superAdminAuthModel";
import { userModel } from "../models/userModel";
import type { SafeUser } from "../types/auth";
import type { NotificationSetting, PasswordPayload, UserProfile } from "../types/settings";

const nowStamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");

export const settingsService = {
  /**
   * Returns the current profile for the authenticated user.
   * Super-admins are sourced from the super_admins table; tenant users fall
   * back to JWT-supplied fields (name / email) until explicit updates are made.
   *
   * @param user - The authenticated SafeUser from the request.
   */
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
        avatarDataUrl: "",
      };
    }
    const dbUser = await userModel.findById(user.id);
    const fullName = dbUser?.fullName ?? user.fullName;
    const [firstName = "", ...rest] = fullName.trim().split(" ");
    return {
      firstName,
      lastName: rest.join(" "),
      email: dbUser?.email ?? user.email,
      phone: dbUser?.phone ?? "",
      language: dbUser?.language ?? "English",
      role: user.role,
      bio: dbUser?.bio ?? "",
      avatarDataUrl: dbUser?.avatarDataUrl ?? "",
    };
  },

  /**
   * Persists profile updates and appends an activity log entry.
   * Super-admins write to the super_admins table; tenant users write to
   * their org tenant DB via userModel.update.
   *
   * @param user - The authenticated SafeUser from the request.
   * @param payload - The updated profile fields.
   */
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

    // Persist name / phone / language / bio / avatar to the tenant users table.
    const fullName = `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim();
    const profileUpdate: Partial<{ name: string; phone: string; language: string; bio: string; avatarDataUrl: string }> = {};
    if (fullName) profileUpdate.name = fullName;
    if (payload.phone !== undefined) profileUpdate.phone = payload.phone;
    if (payload.language !== undefined) profileUpdate.language = payload.language;
    if (payload.bio !== undefined) profileUpdate.bio = payload.bio;
    if (payload.avatarDataUrl !== undefined) profileUpdate.avatarDataUrl = payload.avatarDataUrl;
    await userModel.update(user.id, profileUpdate);

    await settingsModel.appendActivity(user.id, user.organizationId, {
      id: `log-${Date.now()}`,
      dateTime: nowStamp(),
      action: "Profile Updated",
      module: "Settings",
      description: "Updated personal profile information.",
    });

    return settingsModel.setProfile(user.id, payload);
  },

  /**
   * Changes the authenticated user's password after verifying the current one.
   *
   * @param user - The authenticated SafeUser from the request.
   * @param payload - Object containing currentPassword, newPassword, and confirmPassword.
   */
  async changePassword(user: SafeUser, payload: PasswordPayload): Promise<{ success: boolean }> {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new Error("New password and confirm password do not match");
    }

    const superAdminRecord = user.role === "SUPER_ADMIN" ? await superAdminAuthModel.findById(user.id) : null;
    const regularUserRecord = user.role === "SUPER_ADMIN" ? null : await userModel.findById(user.id);
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
      await userModel.updatePassword(user.id, nextHash);
    }

    // Super-admins have no tenant DB, so activity logging is skipped for them.
    if (user.role !== "SUPER_ADMIN") {
      await settingsModel.appendActivity(user.id, user.organizationId, {
        id: `log-${Date.now()}`,
        dateTime: nowStamp(),
        action: "Password Changed",
        module: "Security",
        description: "Updated account password.",
      });
    }

    return { success: true };
  },

  /**
   * Returns all notification settings for the authenticated user.
   * Seeds defaults on first access.
   *
   * @param user - The authenticated SafeUser from the request.
   */
  async getNotificationSettings(user: SafeUser): Promise<NotificationSetting[]> {
    return settingsModel.getNotifications(user.id, user.organizationId);
  },

  /**
   * Replaces all notification settings for the authenticated user and logs
   * the change.
   *
   * @param user - The authenticated SafeUser from the request.
   * @param payload - The full updated list of notification settings.
   */
  async updateNotificationSettings(user: SafeUser, payload: NotificationSetting[]): Promise<NotificationSetting[]> {
    await settingsModel.appendActivity(user.id, user.organizationId, {
      id: `log-${Date.now()}`,
      dateTime: nowStamp(),
      action: "Notification Settings Updated",
      module: "Settings",
      description: "Updated notification preferences.",
    });
    return settingsModel.setNotifications(user.id, user.organizationId, payload);
  },

  /**
   * Returns the activity log for the authenticated user (most recent 50 entries).
   *
   * @param user - The authenticated SafeUser from the request.
   */
  async getActivityLogs(user: SafeUser): Promise<ReturnType<typeof settingsModel.getActivity>> {
    return settingsModel.getActivity(user.id, user.organizationId);
  },
};
