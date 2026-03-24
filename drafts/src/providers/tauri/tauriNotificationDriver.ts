import type { NotificationDriver } from "../notificationDriver";

import type { AppNotificationInput } from "../../services/index";

export class TauriNotificationDriver implements NotificationDriver {
  async notify(input: AppNotificationInput): Promise<void> {
    if (isMacOS() && input.actions && input.actions.length > 0) {
      const core = await import("@tauri-apps/api/core");
      await core.invoke("show_actionable_notification", {
        input: {
          id: input.id,
          title: input.title,
          body: input.body,
          actions: input.actions.map((action) => ({
            id: action.key,
            label: action.label,
          })),
          extra: input.extra ?? {},
        },
      });
      return;
    }

    const notification = await import("@tauri-apps/plugin-notification");
    let permissionGranted = await notification.isPermissionGranted();

    if (!permissionGranted) {
      const permission = await notification.requestPermission();
      permissionGranted = permission === "granted";
    }

    if (!permissionGranted) {
      return;
    }

    notification.sendNotification({
      id: createNotificationId(input.id),
      title: input.title,
      body: input.body,
      largeBody: input.body,
      autoCancel: true,
      extra: input.extra,
    });
  }

  async cancel(id: string): Promise<void> {
    const notification = await import("@tauri-apps/plugin-notification");
    await notification.cancel([createNotificationId(id)]);
  }
}

function createNotificationId(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash | 0);
}

function isMacOS(): boolean {
  return typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
}
