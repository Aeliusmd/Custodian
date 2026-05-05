export type ToastType = 'success' | 'error';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
  role: string;
  bio: string;
}

export interface PasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  category: string;
}

export interface ActivityLog {
  id: string;
  dateTime: string;
  action: string;
  module: string;
  description: string;
}
