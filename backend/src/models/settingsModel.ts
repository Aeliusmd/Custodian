import type { ActivityLog, NotificationSetting, UserProfile } from "../types/settings";

const defaultNotifications: NotificationSetting[] = [
  {
    id: "email_notifications",
    label: "Email Notifications",
    description: "Receive email alerts for important system events and updates",
    icon: "ri-mail-send-line",
    enabled: true,
    category: "General",
  },
  {
    id: "upload_notifications",
    label: "Upload Notifications",
    description: "Get notified when a new document is uploaded to any category",
    icon: "ri-upload-cloud-2-line",
    enabled: true,
    category: "Documents",
  },
  {
    id: "sharing_notifications",
    label: "Sharing Notifications",
    description: "Receive alerts when documents are shared with you or on your behalf",
    icon: "ri-share-line",
    enabled: true,
    category: "Documents",
  },
];

const defaultActivityLogs: ActivityLog[] = [
  {
    id: "log-001",
    dateTime: "2026-04-10 09:42",
    action: "Document Uploaded",
    module: "Documents",
    description: 'Uploaded "Service Agreement - Apex Corp.pdf" to Legal Contracts.',
  },
  {
    id: "log-002",
    dateTime: "2026-04-10 11:20",
    action: "User Invited",
    module: "Users",
    description: "Invited Sarah Lin with editor access.",
  },
];

const profileByUserId = new Map<string, UserProfile>();
const notificationsByUserId = new Map<string, NotificationSetting[]>();
const activityByUserId = new Map<string, ActivityLog[]>();

const toDefaultProfile = (email: string, fullName: string, role: string): UserProfile => {
  const [firstName = "", ...rest] = fullName.split(" ");
  return {
    firstName,
    lastName: rest.join(" "),
    email,
    phone: "",
    language: "English",
    role,
    bio: "",
  };
};

export const settingsModel = {
  getProfile(userId: string, email: string, fullName: string, role: string): UserProfile {
    const existing = profileByUserId.get(userId);
    if (existing) {
      return existing;
    }
    const profile = toDefaultProfile(email, fullName, role);
    profileByUserId.set(userId, profile);
    return profile;
  },
  setProfile(userId: string, profile: UserProfile): UserProfile {
    profileByUserId.set(userId, profile);
    return profile;
  },
  getNotifications(userId: string): NotificationSetting[] {
    const existing = notificationsByUserId.get(userId);
    if (existing) {
      return existing;
    }
    const fresh = [...defaultNotifications];
    notificationsByUserId.set(userId, fresh);
    return fresh;
  },
  setNotifications(userId: string, payload: NotificationSetting[]): NotificationSetting[] {
    notificationsByUserId.set(userId, payload);
    return payload;
  },
  getActivity(userId: string): ActivityLog[] {
    const existing = activityByUserId.get(userId);
    if (existing) {
      return existing;
    }
    const fresh = [...defaultActivityLogs];
    activityByUserId.set(userId, fresh);
    return fresh;
  },
  appendActivity(userId: string, log: ActivityLog) {
    const current = this.getActivity(userId);
    activityByUserId.set(userId, [log, ...current]);
  },
};
