import type {
  ActivityLog,
  NotificationSetting,
  PasswordPayload,
  UserProfile,
} from '@/app/org-admin/settings/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

const PROFILE_STORAGE_KEY = 'org-admin-settings-profile';
const NOTIFICATIONS_STORAGE_KEY = 'org-admin-settings-notifications';

const defaultProfile: UserProfile = {
  firstName: 'James',
  lastName: 'Whitfield',
  email: 'james.whitfield@acmecorp.com',
  phone: '+1 (555) 012-3456',
  language: 'English',
  role: 'Org Admin',
  bio: 'Responsible for managing the Custodox document management system, overseeing all document operations, category management, and user access control within the organization.',
};

const defaultNotifications: NotificationSetting[] = [
  {
    id: 'email_notifications',
    label: 'Email Notifications',
    description: 'Receive email alerts for important system events and updates',
    icon: 'ri-mail-send-line',
    enabled: true,
    category: 'General',
  },
  {
    id: 'upload_notifications',
    label: 'Upload Notifications',
    description: 'Get notified when a new document is uploaded to any category',
    icon: 'ri-upload-cloud-2-line',
    enabled: true,
    category: 'Documents',
  },
  {
    id: 'sharing_notifications',
    label: 'Sharing Notifications',
    description: 'Receive alerts when documents are shared with you or on your behalf',
    icon: 'ri-share-line',
    enabled: true,
    category: 'Documents',
  },
  {
    id: 'version_notifications',
    label: 'Version Updates',
    description: 'Be notified when a new version of a document is uploaded',
    icon: 'ri-history-line',
    enabled: false,
    category: 'Documents',
  },
  {
    id: 'user_notifications',
    label: 'User Management Alerts',
    description: 'Get alerts when new users are added, removed, or their status changes',
    icon: 'ri-user-received-line',
    enabled: true,
    category: 'Users',
  },
  {
    id: 'login_notifications',
    label: 'Login Activity',
    description: 'Receive email alerts for sign-ins from new devices or unusual locations',
    icon: 'ri-shield-check-line',
    enabled: true,
    category: 'Security',
  },
  {
    id: 'storage_notifications',
    label: 'Storage Limit Warnings',
    description: 'Get notified when storage usage reaches 80% or 95% of your limit',
    icon: 'ri-database-2-line',
    enabled: true,
    category: 'System',
  },
  {
    id: 'report_notifications',
    label: 'Weekly Summary Report',
    description: 'Receive a weekly digest of activity, uploads, and user actions',
    icon: 'ri-bar-chart-2-line',
    enabled: false,
    category: 'Reports',
  },
];

const defaultActivityLogs: ActivityLog[] = [
  {
    id: 'log-001',
    dateTime: '2026-04-10 09:42',
    action: 'Document Uploaded',
    module: 'Documents',
    description: 'Uploaded "Service Agreement - Apex Corp.pdf" to Legal Contracts.',
  },
  {
    id: 'log-002',
    dateTime: '2026-04-10 11:20',
    action: 'User Invited',
    module: 'Users',
    description: 'Invited Sarah Lin with editor access.',
  },
  {
    id: 'log-003',
    dateTime: '2026-04-10 13:05',
    action: 'Advanced Search',
    module: 'Search',
    description: 'Searched for "Q1 financial summary" in Reports category.',
  },
  {
    id: 'log-004',
    dateTime: '2026-04-09 16:48',
    action: 'Category Updated',
    module: 'Categories',
    description: 'Updated metadata fields for Compliance category.',
  },
  {
    id: 'log-005',
    dateTime: '2026-04-09 18:12',
    action: 'Profile Updated',
    module: 'Settings',
    description: 'Updated profile details and preferred language.',
  },
];

const parseStored = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
};

const requestWithFallback = async <T,>(
  endpoint: string,
  init: RequestInit,
  fallback: () => T,
): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback();
  }
};

export const settingsApi = {
  async getProfile(): Promise<UserProfile> {
    return requestWithFallback<UserProfile>('/org-admin/settings/profile', { method: 'GET' }, () => {
      return parseStored<UserProfile>(PROFILE_STORAGE_KEY, defaultProfile);
    });
  },

  async updateProfile(payload: UserProfile): Promise<UserProfile> {
    return requestWithFallback<UserProfile>(
      '/org-admin/settings/profile',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => {
        writeStored(PROFILE_STORAGE_KEY, payload);
        return payload;
      },
    );
  },

  async changePassword(payload: PasswordPayload): Promise<{ success: boolean }> {
    return requestWithFallback<{ success: boolean }>(
      '/org-admin/settings/change-password',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => ({ success: true }),
    );
  },

  async getNotificationSettings(): Promise<NotificationSetting[]> {
    return requestWithFallback<NotificationSetting[]>(
      '/org-admin/settings/notifications',
      { method: 'GET' },
      () => parseStored<NotificationSetting[]>(NOTIFICATIONS_STORAGE_KEY, defaultNotifications),
    );
  },

  async updateNotificationSettings(payload: NotificationSetting[]): Promise<NotificationSetting[]> {
    return requestWithFallback<NotificationSetting[]>(
      '/org-admin/settings/notifications',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      () => {
        writeStored(NOTIFICATIONS_STORAGE_KEY, payload);
        return payload;
      },
    );
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    return requestWithFallback<ActivityLog[]>('/org-admin/settings/activity', { method: 'GET' }, () => {
      return defaultActivityLogs;
    });
  },
};
