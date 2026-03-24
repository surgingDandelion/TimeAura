import { useCallback, useMemo, useState } from "react";

import type { NotificationDebugEntry } from "../types";

interface RuntimeNotificationEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  cancelledAt?: string | null;
}

interface UseWorkspaceNotificationDebugActionsOptions {
  notificationDebugEntries: NotificationDebugEntry[];
  runtimeNotifications?: RuntimeNotificationEntry[];
  onClearNotificationDebug?(): void | Promise<void>;
  onMessage(message: string): void;
}

export function useWorkspaceNotificationDebugActions({
  notificationDebugEntries,
  runtimeNotifications,
  onClearNotificationDebug,
  onMessage,
}: UseWorkspaceNotificationDebugActionsOptions) {
  const [notificationDebugOpen, setNotificationDebugOpen] = useState(false);

  const notificationDebugFeed = useMemo(() => {
    const runtimeEntries =
      runtimeNotifications?.map((item) => ({
        id: `runtime-${item.id}-${item.createdAt}`,
        at: item.createdAt,
        source: "driver" as const,
        level: item.cancelledAt ? ("warning" as const) : ("info" as const),
        title: item.title,
        detail: `${item.body}${item.cancelledAt ? "（已取消）" : ""}`,
      })) ?? [];

    return [...notificationDebugEntries, ...runtimeEntries]
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
      .slice(0, 24);
  }, [notificationDebugEntries, runtimeNotifications]);

  const handleExportNotificationDebug = useCallback(() => {
    if (notificationDebugFeed.length === 0) {
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      entries: notificationDebugFeed,
    };
    const fileName = `timeaura-notification-debug-${createExportTimestamp()}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    onMessage("通知调试记录已导出");
  }, [notificationDebugFeed, onMessage]);

  const handleClearNotificationDebugPanel = useCallback(async (): Promise<void> => {
    if (notificationDebugFeed.length === 0) {
      return;
    }

    const confirmed = globalThis.confirm?.("确认清空当前通知调试记录吗？") ?? true;

    if (!confirmed) {
      return;
    }

    await onClearNotificationDebug?.();
    onMessage("通知调试记录已清空");
  }, [notificationDebugFeed.length, onClearNotificationDebug, onMessage]);

  return {
    notificationDebugOpen,
    setNotificationDebugOpen,
    notificationDebugFeed,
    handleExportNotificationDebug,
    handleClearNotificationDebugPanel,
  };
}

function createExportTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
