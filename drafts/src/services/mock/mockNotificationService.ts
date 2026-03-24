import type { NotificationService, AppNotificationInput } from "../notificationService";

import type { MockRuntime } from "../../mock/index";
import type { ReminderService } from "../reminderService";

export class MockNotificationService implements NotificationService {
  private lastReminderSignature: string | null = null;

  constructor(
    private readonly runtime: MockRuntime,
    private readonly reminderService: ReminderService,
  ) {}

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
    const reminder = await this.reminderService.getReminderSummary(this.runtime.now());

    if (!reminder) {
      this.lastReminderSignature = null;
      return;
    }

    const signature = `${reminder.kind}:${reminder.recordIds.join(",")}`;

    if (signature === this.lastReminderSignature) {
      return;
    }

    this.lastReminderSignature = signature;

    const actions =
      reminder.recordIds.length === 1
        ? [
            { key: "complete", label: "完成" },
            { key: "snooze_30", label: "30 分钟后提醒" },
            { key: "open_detail", label: "打开详情" },
          ]
        : [
            { key: "snooze_30", label: "30 分钟后提醒" },
            { key: "open_detail", label: "打开详情" },
          ];

    await this.notify({
      id: `reminder:${reminder.kind}:${reminder.recordIds[0] ?? "none"}`,
      title: reminder.title,
      body: reminder.description,
      actions,
      extra: {
        type: "reminder",
        page: "workspace",
        recordId: reminder.recordIds[0] ?? null,
        recordIds: reminder.recordIds,
      },
    });
  }
}
