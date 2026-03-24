import type { NotificationService, AppNotificationInput } from "../notificationService";

import type { NotificationDriver } from "../../providers/index";
import type { ReminderService } from "../reminderService";

export class DefaultNotificationService implements NotificationService {
  private lastReminderSignature: string | null = null;

  constructor(
    private readonly notificationDriver: NotificationDriver,
    private readonly reminderService: ReminderService,
  ) {}

  async notify(input: AppNotificationInput): Promise<void> {
    return this.notificationDriver.notify(input);
  }

  async cancelNotification(id: string): Promise<void> {
    return this.notificationDriver.cancel(id);
  }

  async scheduleReminderNotifications(): Promise<void> {
    const reminder = await this.reminderService.getReminderSummary(new Date().toISOString());

    if (!reminder) {
      this.lastReminderSignature = null;
      return;
    }

    const signature = `${reminder.kind}:${reminder.recordIds.join(",")}`;

    if (signature === this.lastReminderSignature) {
      return;
    }

    this.lastReminderSignature = signature;

    await this.notificationDriver.notify({
      id: `reminder:${reminder.kind}:${reminder.recordIds[0] ?? "none"}`,
      title: reminder.title,
      body: reminder.description,
      extra: {
        type: "reminder",
        page: "workspace",
        recordId: reminder.recordIds[0] ?? null,
        recordIds: reminder.recordIds,
        reminderKind: reminder.kind,
      },
    });
  }
}
