import type {
  ActivityLog,
  PasswordPayload,
  UserProfile,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

const PROFILE_STORAGE_KEY = 'user-settings-profile';

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  language: 'English',
  role: 'User',
  bio: '',
};

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

  async getActivityLogs(): Promise<ActivityLog[]> {
    return requestWithFallback<ActivityLog[]>('/user/settings/activity', { method: 'GET' }, () => {
      return defaultActivityLogs;
    });
  },
};
