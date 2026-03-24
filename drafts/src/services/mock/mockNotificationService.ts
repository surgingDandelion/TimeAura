import type { NotificationService, AppNotificationInput } from "../notificationService";

import type { MockRuntime } from "../../mock/index";

export class MockNotificationService implements NotificationService {
  constructor(private readonly runtime: MockRuntime) {}

  async notify(input: AppNotificationInput): Promise<void> {
    this.runtime.notifications.unshift({
      ...input,
      createdAt: this.runtime.now(),
    });
  }

  async cancelNotification(id: string): Promise<void> {
    this.runtime.notifications = this.runtime.notifications.map((item) =>
      item.id === id
        ? {
            ...item,
            cancelledAt: this.runtime.now(),
          }
        : item,
    );
  }

  async scheduleReminderNotifications(): Promise<void> {
    return Promise.resolve();
  }
}
