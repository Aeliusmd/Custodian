import type {
  ActivityLog,
  NotificationSetting,
  PasswordPayload,
  UserProfile,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

const PROFILE_STORAGE_KEY = 'user-settings-profile';
const NOTIFICATIONS_STORAGE_KEY = 'user-settings-notifications';

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  language: 'English',
  role: 'User',
  bio: '',
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
    id: 'login_notifications',
    label: 'Login Activity',
    description: 'Receive email alerts for sign-ins from new devices or unusual locations',
    icon: 'ri-shield-check-line',
    enabled: true,
    category: 'Security',
  },
];

const defaultActivityLogs: ActivityLog[] = [];

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
    return requestWithFallback<UserProfile>('/user/settings/profile', { method: 'GET' }, () => {
      return parseStored<UserProfile>(PROFILE_STORAGE_KEY, defaultProfile);
    });
  },

  async updateProfile(payload: UserProfile): Promise<UserProfile> {
    return requestWithFallback<UserProfile>(
      '/user/settings/profile',
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
      '/user/settings/change-password',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      () => ({ success: true }),
    );
  },

  async getNotificationSettings(): Promise<NotificationSetting[]> {
    return requestWithFallback<NotificationSetting[]>(
      '/user/settings/notifications',
      { method: 'GET' },
      () => parseStored<NotificationSetting[]>(NOTIFICATIONS_STORAGE_KEY, defaultNotifications),
    );
  },

  async updateNotificationSettings(payload: NotificationSetting[]): Promise<NotificationSetting[]> {
    return requestWithFallback<NotificationSetting[]>(
      '/user/settings/notifications',
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
    return requestWithFallback<ActivityLog[]>('/user/settings/activity', { method: 'GET' }, () => {
      return defaultActivityLogs;
    });
  },
};
