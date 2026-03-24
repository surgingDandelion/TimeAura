import { useCallback, useMemo, useState } from "react";

import type { WorkspaceCommandResult } from "../contracts";
import type { NotificationDebugEntry } from "../types";
import { createDefaultWorkspaceTestSeams, type WorkspaceTestSeams } from "../testSeams";

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
  seams?: WorkspaceTestSeams;
}

export function useWorkspaceNotificationDebugActions({
  notificationDebugEntries,
  runtimeNotifications,
  onClearNotificationDebug,
  onMessage,
  seams = createDefaultWorkspaceTestSeams(),
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

  const handleExportNotificationDebug = useCallback((): WorkspaceCommandResult<{ count: number }> => {
    if (notificationDebugFeed.length === 0) {
      return {
        status: "noop",
      };
    }

    const payload = {
      exportedAt: seams.clock.nowIso(),
      entries: notificationDebugFeed,
    };
    const fileName = `timeaura-notification-debug-${seams.clock.fileTimestamp()}.json`;

    seams.download.downloadJson(fileName, payload);
    onMessage("通知调试记录已导出");
    return {
      status: "success",
      message: "通知调试记录已导出",
      data: {
        count: notificationDebugFeed.length,
      },
    };
  }, [notificationDebugFeed, onMessage, seams.clock, seams.download]);

  const handleClearNotificationDebugPanel = useCallback(async (): Promise<WorkspaceCommandResult> => {
    if (notificationDebugFeed.length === 0) {
      return {
        status: "noop",
      };
    }

    const confirmed = await seams.confirm.confirm("确认清空当前通知调试记录吗？");

    if (!confirmed) {
      return {
        status: "cancelled",
      };
    }

    await onClearNotificationDebug?.();
    onMessage("通知调试记录已清空");
    return {
      status: "success",
      message: "通知调试记录已清空",
    };
  }, [notificationDebugFeed.length, onClearNotificationDebug, onMessage, seams.confirm]);

  return {
    notificationDebugOpen,
    setNotificationDebugOpen,
    notificationDebugFeed,
    handleExportNotificationDebug,
    handleClearNotificationDebugPanel,
  };
}
