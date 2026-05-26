export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface CreateNotificationInput {
  recipientUserId: string;
  type: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
}
