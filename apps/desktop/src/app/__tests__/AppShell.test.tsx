import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "../AppShell";

const useAppServicesSpy = vi.fn();
const workspacePageSpy = vi.fn();
const reportPageSpy = vi.fn();
const channelPageSpy = vi.fn();

vi.mock("../providers/AppServicesProvider", () => ({
  useAppServices: () => useAppServicesSpy(),
  AppServicesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../../features/workspace/WorkspacePage", () => ({
  WorkspacePage: (props: Record<string, unknown>) => {
    workspacePageSpy(props);
    return (
      <div data-testid="workspace-page">
        <div data-testid="workspace-view">{String(props.activeView)}</div>
        <div data-testid="workspace-tag">{String(props.activeTagId)}</div>
        <div data-testid="workspace-debug-count">{Array.isArray(props.notificationDebugEntries) ? props.notificationDebugEntries.length : 0}</div>
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

function createContainer() {
  return {
    services: {
      channelService: {},
      notificationService: {
        scheduleReminderNotifications: vi.fn(async () => undefined),
      },
      recordService: {
        listRecords: vi.fn(async ({ view, status }: { view: string; status: string }) => {
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
        completeRecord: vi.fn(async () => undefined),
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
    },
    runtime: {
      notifications: [],
    },
  };
}

describe("AppShell", () => {
  beforeEach(() => {
    useAppServicesSpy.mockReset();
    workspacePageSpy.mockReset();
    reportPageSpy.mockReset();
    channelPageSpy.mockReset();
  });

  afterEach(() => {
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
    expect(screen.getByText("Mock Runtime")).toBeTruthy();
    expect(screen.getByText("已就绪")).toBeTruthy();
    expect(container.services.notificationService.scheduleReminderNotifications).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("今天"));
    expect(screen.getByTestId("workspace-view").textContent).toBe("today");

    fireEvent.click(screen.getByText("工作"));
    expect(screen.getByTestId("workspace-tag").textContent).toBe("tag_work");

    fireEvent.click(screen.getByLabelText("AI 报告"));
    expect(screen.getByTestId("report-page")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("通道配置"));
    expect(screen.getByTestId("channel-page")).toBeTruthy();

    fireEvent.click(screen.getAllByText("快速新增")[0] as HTMLElement);

    expect(screen.getByTestId("workspace-page")).toBeTruthy();
    expect(screen.getByTestId("workspace-view").textContent).toBe("all");
    expect(screen.getByTestId("workspace-tag").textContent).toBe("all");
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
});
