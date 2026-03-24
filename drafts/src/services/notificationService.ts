export interface AppNotificationInput {
  id: string;
  title: string;
  body: string;
  actions?: Array<{ key: string; label: string }>;
}

export interface NotificationService {
  notify(input: AppNotificationInput): Promise<void>;
  cancelNotification(id: string): Promise<void>;
  scheduleReminderNotifications(): Promise<void>;
}
