import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockRuntime } from "@timeaura-core";

import { AppShell } from "../AppShell";
import { createWorkspaceAppContainerDouble } from "../../features/workspace/testing/workspaceServiceTestDoubles";

const useAppServicesSpy = vi.fn();
const ensureDesktopExperienceDataSpy = vi.fn();
const workspacePageSpy = vi.fn();
const reportPageSpy = vi.fn();
const channelPageSpy = vi.fn();
const trashPageSpy = vi.fn();
const tauriBridge = vi.hoisted(() => ({
  notificationCallback: null as null | ((payload: { extra?: Record<string, unknown> }) => void),
  desktopCallback: null as null | ((payload: { payload: { actionId?: string; extra?: Record<string, unknown> } }) => void),
  unregister: vi.fn(async () => undefined),
  unlisten: vi.fn(),
}));

vi.mock("../providers/AppServicesProvider", () => ({
  useAppServices: () => useAppServicesSpy(),
  AppServicesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../bootstrap/ensureDesktopExperienceData", () => ({
  ensureDesktopExperienceData: (...args: unknown[]) => ensureDesktopExperienceDataSpy(...args),
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
  onAction: vi.fn(async (callback: (payload: { extra?: Record<string, unknown> }) => void) => {
    tauriBridge.notificationCallback = callback;
    return {
      unregister: tauriBridge.unregister,
    };
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    async (
      _eventName: string,
      callback: (payload: { payload: { actionId?: string; extra?: Record<string, unknown> } }) => void,
    ) => {
      tauriBridge.desktopCallback = callback;
      return tauriBridge.unlisten;
    },
  ),
}));

vi.mock("../../features/workspace/WorkspacePage", () => ({
  WorkspacePage: (props: Record<string, unknown>) => {
    workspacePageSpy(props);
    return (
      <div data-testid="workspace-page">
        <div data-testid="workspace-view">{String(props.activeView)}</div>
        <div data-testid="workspace-tag">{String(props.activeTagId)}</div>
        <div data-testid="workspace-debug-count">{Array.isArray(props.notificationDebugEntries) ? props.notificationDebugEntries.length : 0}</div>
        <div data-testid="workspace-focus-record">{String((props.focusTarget as { recordId?: string } | null)?.recordId ?? "")}</div>
        <div data-testid="workspace-runtime-notice">{String((props.runtimeNotice as { text?: string } | null)?.text ?? "")}</div>
        <div data-testid="workspace-quick-add-target">{String(Boolean(props.quickAddTarget))}</div>
        <button onClick={() => (props.onWorkspaceChanged as (() => void) | undefined)?.()}>simulate-workspace-change</button>
      </div>
    );
  },
}));

vi.mock("../../features/reports/ReportStudioPage", () => ({
  ReportStudioPage: () => {
    reportPageSpy();
    return <div data-testid="report-page">report-page</div>;
  },
}));

vi.mock("../../features/channels/ChannelStudioPage", () => ({
  ChannelStudioPage: () => {
    channelPageSpy();
    return <div data-testid="channel-page">channel-page</div>;
  },
}));

vi.mock("../../features/trash/TrashPage", () => ({
  TrashPage: (props: Record<string, unknown>) => {
    trashPageSpy(props);
    return <div data-testid="trash-page">trash-page</div>;
  },
}));

function createContainer() {
  const container = createWorkspaceAppContainerDouble({
    recordService: {
      listRecords: vi.fn(async ({ view, status }) => {
        if (view === "today" && status === "todo") {
          return { items: [], total: 2 };
        }

        if (view === "plan" && status === "todo") {
          return { items: [], total: 3 };
        }

        if (view === "all" && status === "todo") {
          return { items: [], total: 5 };
        }

        if (view === "done" && status === "done") {
          return { items: [], total: 1 };
        }

        return { items: [], total: 0 };
      }),
      completeRecord: vi.fn(async (id: string) => ({
        id,
        recordKind: "task" as const,
        title: "已完成任务",
        contentMarkdown: "",
        contentPlain: "",
        status: "已完成" as const,
        priority: "P3" as const,
        tags: [],
        dueAt: null,
        plannedAt: null,
        completedAt: "2026-01-01T10:00:00.000Z",
        createdAt: "2026-01-01T09:00:00.000Z",
        updatedAt: "2026-01-01T10:00:00.000Z",
        archivedAt: null,
        deletedAt: null,
        sourceReportHistoryId: null,
        aiSummary: null,
        isPinned: false,
      })),
    },
    reminderService: {
      snoozeReminder: vi.fn(async () => undefined),
    },
    tagService: {
      listTagsWithCounts: vi.fn(async () => [
        {
          id: "tag_work",
          name: "工作",
          color: "#5f89ff",
          count: 4,
          isSystem: false,
          sortOrder: 0,
          createdAt: "2026-01-01T09:00:00.000Z",
          updatedAt: "2026-01-01T09:00:00.000Z",
        },
      ]),
    },
    runtime: createMockRuntime(),
  });

  container.services.notificationService = {
    notify: vi.fn(async () => undefined),
    cancelNotification: vi.fn(async () => undefined),
    scheduleReminderNotifications: vi.fn(async () => undefined),
  };

  return container;
}

describe("AppShell", () => {
  beforeEach(() => {
    useAppServicesSpy.mockReset();
    ensureDesktopExperienceDataSpy.mockReset();
    ensureDesktopExperienceDataSpy.mockResolvedValue({
      seeded: false,
      recordIds: [],
      channelId: null,
    });
    workspacePageSpy.mockReset();
    reportPageSpy.mockReset();
    channelPageSpy.mockReset();
    trashPageSpy.mockReset();
    tauriBridge.notificationCallback = null;
    tauriBridge.desktopCallback = null;
    tauriBridge.unregister.mockClear();
    tauriBridge.unlisten.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads sidebar counts, switches pages, and routes quick add back into workspace", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByText("今天")).toBeTruthy();
      expect(screen.getByText("2")).toBeTruthy();
      expect(screen.getByTestId("workspace-page")).toBeTruthy();
    });

    expect(screen.getByTestId("workspace-view").textContent).toBe("all");
    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(1);
    expect(ensureDesktopExperienceDataSpy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("今天"));
    expect(screen.getByTestId("workspace-view").textContent).toBe("today");

    fireEvent.click(screen.getByText("工作"));
    expect(screen.getByTestId("workspace-tag").textContent).toBe("tag_work");

    fireEvent.click(screen.getByLabelText("AI 报告"));
    expect(screen.getByTestId("report-page")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("通道配置"));
    expect(screen.getByTestId("channel-page")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("回收站"));
    expect(screen.getByTestId("trash-page")).toBeTruthy();

    fireEvent.click(screen.getAllByText("快速新增")[0] as HTMLElement);

    expect(screen.getByTestId("workspace-page")).toBeTruthy();
    expect(screen.getByTestId("workspace-view").textContent).toBe("all");
    expect(screen.getByTestId("workspace-tag").textContent).toBe("all");
    expect(screen.getByTestId("workspace-quick-add-target").textContent).toBe("true");
  });

  it("prepares sqlite first-run flow even when optional runtime services are absent", async () => {
    const container = createContainer();
    container.runtime = undefined;
    container.services.channelService = null as unknown as typeof container.services.channelService;
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-page")).toBeTruthy();
    });

    expect(ensureDesktopExperienceDataSpy).toHaveBeenCalledTimes(1);
  });

  it("prepares demo data for sqlite first-run experience and announces readiness", async () => {
    const container = createContainer();
    container.runtime = undefined;
    useAppServicesSpy.mockReturnValue(container);
    ensureDesktopExperienceDataSpy.mockResolvedValue({
      seeded: true,
      recordIds: ["record-seed-1"],
      channelId: "channel-seed-1",
    });

    render(<AppShell />);

    await waitFor(() => {
    expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("已自动准备演示数据，现在可以直接体验新增与提醒链路");
  });

  expect(ensureDesktopExperienceDataSpy).toHaveBeenCalledTimes(1);
  expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(1);
});

  it("refreshes sidebar state on workspace change and forwards notification debug events", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-page")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("simulate-workspace-change"));

    await waitFor(() => {
      expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(2);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timeaura:notification-debug", {
          detail: {
            level: "warning",
            title: "通知已回退",
            detail: "测试事件",
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-debug-count").textContent).toBe("1");
    });
  });

  it("shows runtime warning when sidebar refresh fails", async () => {
    const container = createContainer();
    container.services.tagService.listTagsWithCounts = vi.fn(async () => {
      throw new Error("sidebar failed");
    });
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("侧栏信息刷新失败，请稍后重试");
      expect(screen.getByTestId("workspace-debug-count").textContent).toBe("1");
    });
  });

  it("shows runtime warning when reminder scheduling fails", async () => {
    const container = createContainer();
    container.services.notificationService.scheduleReminderNotifications = vi.fn(async () => {
      throw new Error("schedule failed");
    });
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("提醒通知调度失败，请稍后重试");
      expect(screen.getByTestId("workspace-debug-count").textContent).toBe("1");
    });
  });

  it("re-schedules reminder notifications on interval", async () => {
    vi.useFakeTimers();
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("skips reminder polling while document is hidden and resumes when visible again", async () => {
    vi.useFakeTimers();
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    render(<AppShell />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(0);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(0);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("handles desktop notification actions for complete and click-to-open flows", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);
    vi.stubGlobal("__TAURI_INTERNALS__", {});

    render(<AppShell />);

    await waitFor(() => {
      expect(tauriBridge.desktopCallback).toBeTruthy();
      expect(tauriBridge.notificationCallback).toBeTruthy();
    });

    await act(async () => {
      tauriBridge.desktopCallback?.({
        payload: {
          actionId: "complete",
          extra: {
            recordId: "record-1",
          },
        },
      });
    });

    await waitFor(() => {
      expect(container.services.recordService.completeRecord).toHaveBeenCalledWith("record-1");
      expect(screen.getByTestId("workspace-focus-record").textContent).toBe("record-1");
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("已通过桌面通知完成任务");
      expect(screen.getByTestId("workspace-debug-count").textContent).toBe("1");
    });

    await act(async () => {
      tauriBridge.notificationCallback?.({
        extra: {
          recordId: "record-2",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-focus-record").textContent).toBe("record-2");
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("已从桌面通知回到对应记录");
      expect(screen.getByTestId("workspace-debug-count").textContent).toBe("2");
    });
  });

  it("handles snooze and open-detail desktop notification actions", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);
    vi.stubGlobal("__TAURI_INTERNALS__", {});

    render(<AppShell />);

    await waitFor(() => {
      expect(tauriBridge.desktopCallback).toBeTruthy();
    });

    await act(async () => {
      tauriBridge.desktopCallback?.({
        payload: {
          actionId: "snooze_30",
          extra: {
            recordIds: ["record-1", "record-2"],
            recordId: "record-1",
          },
        },
      });
    });

    await waitFor(() => {
      expect(container.services.reminderService.snoozeReminder).toHaveBeenCalledWith(["record-1", "record-2"], 30);
      expect(screen.getByTestId("workspace-focus-record").textContent).toBe("record-1");
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("已通过桌面通知延后 30 分钟提醒");
    });

    await act(async () => {
      tauriBridge.desktopCallback?.({
        payload: {
          actionId: "open_detail",
          extra: {
            recordId: "record-9",
          },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-focus-record").textContent).toBe("record-9");
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("已从桌面通知回到对应记录");
    });
  });

  it("falls back to workspace warning notice when notification action handling fails", async () => {
    const container = createContainer();
    container.services.recordService.completeRecord = vi.fn(async () => {
      throw new Error("complete failed");
    });
    useAppServicesSpy.mockReturnValue(container);
    vi.stubGlobal("__TAURI_INTERNALS__", {});

    render(<AppShell />);

    await waitFor(() => {
      expect(tauriBridge.desktopCallback).toBeTruthy();
    });

    await act(async () => {
      tauriBridge.desktopCallback?.({
        payload: {
          actionId: "complete",
          extra: {
            recordId: "record-3",
          },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-view").textContent).toBe("all");
      expect(screen.getByTestId("workspace-focus-record").textContent).toBe("record-3");
      expect(screen.getByTestId("workspace-runtime-notice").textContent).toBe("通知动作处理失败，请在工作台中手动继续操作");
      expect(screen.getByTestId("workspace-debug-count").textContent).toBe("2");
    });
  });

  it("cleans up tauri notification listeners on unmount", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);
    vi.stubGlobal("__TAURI_INTERNALS__", {});

    const { unmount } = render(<AppShell />);

    await waitFor(() => {
      expect(tauriBridge.desktopCallback).toBeTruthy();
      expect(tauriBridge.notificationCallback).toBeTruthy();
    });

    unmount();

    expect(tauriBridge.unlisten).toHaveBeenCalledTimes(1);
    expect(tauriBridge.unregister).toHaveBeenCalledTimes(1);
  });

  it("prevents browser-level select all outside text editing targets", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-page")).toBeTruthy();
    });

    const event = new KeyboardEvent("keydown", {
      key: "a",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });

    document.body.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("keeps select all available inside inputs", async () => {
    const container = createContainer();
    useAppServicesSpy.mockReturnValue(container);

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-page")).toBeTruthy();
    });

    const input = document.createElement("input");
    document.body.appendChild(input);

    const event = new KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);

    input.remove();
  });
});
