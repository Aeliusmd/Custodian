import type {
  ActivityLog,
  NotificationSetting,
  PasswordPayload,
  UserProfile,
} from '@/app/org-admin/settings/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';
const BASE = `${API_BASE_URL}/protected/org-admin/settings`;

const apiFetch = async <T>(
  endpoint: string,
  init: RequestInit = {},
): Promise<T> => {
  const res = await fetch(`${BASE}${endpoint}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
};

export const settingsApi = {
  async getProfile(): Promise<UserProfile> {
    return apiFetch<UserProfile>('/profile', { method: 'GET' });
  },

  async updateProfile(payload: UserProfile): Promise<UserProfile> {
    return apiFetch<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: PasswordPayload): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>('/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getNotificationSettings(): Promise<NotificationSetting[]> {
    return apiFetch<NotificationSetting[]>('/notifications', { method: 'GET' });
  },

  async updateNotificationSettings(payload: NotificationSetting[]): Promise<NotificationSetting[]> {
    return apiFetch<NotificationSetting[]>('/notifications', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE_URL}/protected/org-admin/activity-logs`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch activity logs (${res.status})`);
    const data = (await res.json()) as { logs?: ActivityLog[] };
    return data.logs ?? [];
  },
};
