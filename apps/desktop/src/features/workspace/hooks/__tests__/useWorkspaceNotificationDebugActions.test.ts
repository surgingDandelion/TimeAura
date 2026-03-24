import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createWorkspaceTestFixtureBundle } from "../../testing/workspaceTestFixtures";
import { useWorkspaceNotificationDebugActions } from "../useWorkspaceNotificationDebugActions";

describe("useWorkspaceNotificationDebugActions", () => {
  it("returns noop when there is no notification debug entry to export", () => {
    const { seams, state } = createWorkspaceTestFixtureBundle();
    const onMessage = vi.fn();

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [],
        onMessage,
        seams,
      }),
    );

    const commandResult = result.current.handleExportNotificationDebug();

    expect(commandResult.status).toBe("noop");
    expect(state.downloadEvents).toHaveLength(0);
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("exports notification debug payload through seams", () => {
    const { seams, state } = createWorkspaceTestFixtureBundle();
    const onMessage = vi.fn();

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [
          {
            id: "debug-1",
            at: "2026-01-01T09:30:00.000Z",
            source: "action",
            level: "info",
            title: "提醒已触发",
            detail: "任务 A 已进入提醒窗口",
          },
        ],
        onMessage,
        seams,
      }),
    );

    const commandResult = result.current.handleExportNotificationDebug();

    expect(commandResult.status).toBe("success");
    expect(commandResult.message).toBe("通知调试记录已导出");
    expect(commandResult.data?.count).toBe(1);
    expect(state.downloadEvents).toHaveLength(1);
    expect(state.downloadEvents[0]?.fileName).toBe("timeaura-notification-debug-20260101-093000.json");
    expect(state.downloadEvents[0]?.payload).toEqual({
      exportedAt: "2026-01-01T09:30:00.000Z",
      entries: [
        {
          id: "debug-1",
          at: "2026-01-01T09:30:00.000Z",
          source: "action",
          level: "info",
          title: "提醒已触发",
          detail: "任务 A 已进入提醒窗口",
        },
      ],
    });
    expect(onMessage).toHaveBeenCalledWith("通知调试记录已导出");
  });

  it("returns cancelled when clear action is rejected by confirm seam", async () => {
    const { seams, state } = createWorkspaceTestFixtureBundle({ confirmResult: false });
    const onMessage = vi.fn();
    const onClearNotificationDebug = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [
          {
            id: "debug-1",
            at: "2026-01-01T09:30:00.000Z",
            source: "action",
            level: "warning",
            title: "提醒推送失败",
            detail: "系统已进入兜底重试",
          },
        ],
        onClearNotificationDebug,
        onMessage,
        seams,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleClearNotificationDebugPanel>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleClearNotificationDebugPanel();
    });

    expect(commandResult?.status).toBe("cancelled");
    expect(state.confirmMessages).toEqual(["确认清空当前通知调试记录吗？"]);
    expect(onClearNotificationDebug).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("clears notification debug entries after confirmation", async () => {
    const { seams, state } = createWorkspaceTestFixtureBundle({ confirmResult: true });
    const onMessage = vi.fn();
    const onClearNotificationDebug = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useWorkspaceNotificationDebugActions({
        notificationDebugEntries: [
          {
            id: "debug-1",
            at: "2026-01-01T09:30:00.000Z",
            source: "action",
            level: "info",
            title: "提醒命中",
            detail: "准备清空调试记录",
          },
        ],
        onClearNotificationDebug,
        onMessage,
        seams,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleClearNotificationDebugPanel>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleClearNotificationDebugPanel();
    });

    expect(commandResult).toEqual({
      status: "success",
      message: "通知调试记录已清空",
    });
    expect(state.confirmMessages).toEqual(["确认清空当前通知调试记录吗？"]);
    expect(onClearNotificationDebug).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith("通知调试记录已清空");
  });
});
