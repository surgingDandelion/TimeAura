import type { NotificationService, AppNotificationInput } from "../notificationService";

import type { NotificationDriver } from "../../providers/index";

export class DefaultNotificationService implements NotificationService {
  constructor(private readonly notificationDriver: NotificationDriver) {}

  async notify(input: AppNotificationInput): Promise<void> {
    return this.notificationDriver.notify(input);
  }

  async cancelNotification(id: string): Promise<void> {
    return this.notificationDriver.cancel(id);
  }

  async scheduleReminderNotifications(): Promise<void> {
    return Promise.resolve();
  }
}
