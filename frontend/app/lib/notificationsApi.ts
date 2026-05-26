export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3351';

const requestJson = async <T,>(endpoint: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Notification request failed with ${response.status}`);
  }

  return (await response.json()) as T;
};

export const notificationsApi = {
  async list(limit = 10): Promise<AppNotification[]> {
    const data = await requestJson<{ notifications?: AppNotification[] }>(`/notifications?limit=${limit}`);
    return data.notifications ?? [];
  },

  async unreadCount(): Promise<number> {
    const data = await requestJson<{ unreadCount?: number }>('/notifications/unread-count');
    return Number(data.unreadCount ?? 0);
  },

  async markRead(id: string): Promise<void> {
    await requestJson<{ success: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  },

  async markAllRead(): Promise<void> {
    await requestJson<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
  },
};
