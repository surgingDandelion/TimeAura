import type { NotificationDriver } from "../notificationDriver";

import type { AppNotificationInput } from "../../services/index";

export class TauriNotificationDriver implements NotificationDriver {
  async notify(input: AppNotificationInput): Promise<void> {
    if (isMacOS() && input.actions && input.actions.length > 0) {
      try {
        emitNotificationDebug({
          level: "info",
          title: "原生动作通知发送",
          detail: `正在发送可操作通知：${input.title}`,
        });
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
        emitNotificationDebug({
          level: "info",
          title: "原生动作通知已交给系统",
          detail: `动作数：${input.actions.length}，通知标题：${input.title}`,
        });
        return;
      } catch (error) {
        console.warn("Failed to show actionable desktop notification, falling back to standard notification.", error);
        emitNotificationDebug({
          level: "warning",
          title: "原生动作通知降级",
          detail: `发送可操作通知失败，已回退为普通系统通知：${toErrorMessage(error)}`,
        });
      }
    }

    const notification = await import("@tauri-apps/plugin-notification");
    let permissionGranted = await notification.isPermissionGranted();

    if (!permissionGranted) {
      const permission = await notification.requestPermission();
      permissionGranted = permission === "granted";
    }

    if (!permissionGranted) {
      emitNotificationDebug({
        level: "warning",
        title: "系统通知未发送",
        detail: `通知权限未授予，标题：${input.title}`,
      });
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
    emitNotificationDebug({
      level: "info",
      title: "普通系统通知已发送",
      detail: `通知标题：${input.title}`,
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

function emitNotificationDebug(detail: {
  level: "info" | "warning" | "error";
  title: string;
  detail: string;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("timeaura:notification-debug", {
      detail,
    }),
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
