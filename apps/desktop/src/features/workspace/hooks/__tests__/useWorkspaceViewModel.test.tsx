import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppServicesProvider } from "../../../../app/providers/AppServicesProvider";
import * as createDesktopAppServicesModule from "../../../../app/bootstrap/createDesktopAppServices";
import {
  createWorkspaceAppContainerDouble,
  createWorkspaceRecordEntity,
  createWorkspaceReminderHit,
  createWorkspaceReminderSummary,
  createWorkspaceTagEntity,
} from "../../testing/workspaceServiceTestDoubles";
import { useWorkspaceViewModel } from "../useWorkspaceViewModel";

function Wrapper({ children }: { children: ReactNode }) {
  return <AppServicesProvider>{children}</AppServicesProvider>;
}

describe("useWorkspaceViewModel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("assembles list, inspector, reminder, tag manager, and notification state from workspace hooks", async () => {
    const record = createWorkspaceRecordEntity({
      id: "record-1",
      title: "整理周报",
      tags: ["tag_work"],
      contentMarkdown: "# 周报\n- 完成架构梳理",
    });
    const tag = createWorkspaceTagEntity({
      id: "tag_work",
      name: "工作",
    });
    const container = createWorkspaceAppContainerDouble({
      recordService: {
        listRecords: vi.fn(async () => ({
          items: [record],
          total: 1,
        })),
      },
      tagService: {
        listTags: vi.fn(async () => [tag]),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () =>
          createWorkspaceReminderSummary({
            kind: "due_24h",
            title: "有任务即将到期",
            recordIds: ["record-1"],
          }),
        ),
        listReminderHits: vi.fn(async () => [
          createWorkspaceReminderHit({
            id: "record-1",
            title: "整理周报",
            reminderKind: "due_24h",
            dueAt: "2026-01-02T09:00:00.000Z",
          }),
        ]),
      },
      runtime: {
        notifications: [
          {
            id: "runtime-1",
            title: "任务即将到期",
            body: "整理周报将在 24 小时内到期",
            createdAt: "2026-01-01T09:30:00.000Z",
          },
        ],
      } as NonNullable<ReturnType<typeof createWorkspaceAppContainerDouble>["runtime"]>,
    });

    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockResolvedValue(container);

    const { result } = renderHook(
      () =>
        useWorkspaceViewModel({
          activeTagId: "all",
          activeView: "today",
          focusTarget: null,
          quickAddTarget: null,
          runtimeNotice: {
            text: "提醒已刷新",
            tone: "info",
            nonce: 1,
          },
          notificationDebugEntries: [
            {
              id: "debug-1",
              at: "2026-01-01T09:20:00.000Z",
              source: "action",
              level: "info",
              title: "提醒扫描完成",
              detail: "已同步最新提醒命中",
            },
          ],
          onClearNotificationDebug: vi.fn(async () => undefined),
          onTagFilterChange: vi.fn(),
          onWorkspaceChanged: vi.fn(),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.listPanelProps.loading).toBe(false);
      expect(result.current.listPanelProps.records).toHaveLength(1);
    });

    expect(result.current.listPanelProps.currentTagName).toBe("全部标签");
    expect(result.current.listPanelProps.tags).toEqual([tag]);
    expect(result.current.listPanelProps.message).toBe("提醒已刷新");
    expect(result.current.listPanelProps.reminder?.title).toBe("有任务即将到期");
    expect(result.current.listPanelProps.activeReminderHits).toHaveLength(1);
    expect(result.current.listPanelProps.notificationDebugFeed.map((item) => item.title)).toEqual([
      "任务即将到期",
      "提醒扫描完成",
    ]);

    act(() => {
      result.current.listPanelProps.onSelectRecord("record-1");
    });

    await waitFor(() => {
      expect(result.current.detailInspectorProps.selectedRecord?.id).toBe("record-1");
      expect(result.current.detailInspectorProps.draft?.title).toBe("整理周报");
    });

    act(() => {
      result.current.listPanelProps.onToggleNotificationDebug();
      result.current.detailInspectorProps.onOpenTagManager();
    });

    expect(result.current.listPanelProps.notificationDebugOpen).toBe(true);
    expect(result.current.tagManagerSheetProps.open).toBe(true);
    expect(result.current.customReminderSheetProps.open).toBe(false);
    expect(result.current.shortcutHelpProps.shortcuts.length).toBeGreaterThan(0);
  });

  it("executes reminder-focused workspace actions through the integrated view model", async () => {
    const listRecords = vi.fn(async () => ({
      items: [
        createWorkspaceRecordEntity({
          id: "record-1",
          title: "整理周报",
          dueAt: "2026-01-02T09:00:00.000Z",
        }),
      ],
      total: 1,
    }));
    const batchReschedule = vi.fn(async () => []);
    const snoozeReminder = vi.fn(async () => undefined);
    const onWorkspaceChanged = vi.fn();
    const container = createWorkspaceAppContainerDouble({
      recordService: {
        listRecords,
        batchReschedule,
      },
      tagService: {
        listTags: vi.fn(async () => []),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () =>
          createWorkspaceReminderSummary({
            kind: "overdue",
            title: "有任务已逾期",
            recordIds: ["record-1"],
          }),
        ),
        listReminderHits: vi.fn(async () => [
          createWorkspaceReminderHit({
            id: "record-1",
            title: "整理周报",
            reminderKind: "overdue",
            dueAt: "2026-01-02T09:00:00.000Z",
          }),
        ]),
        snoozeReminder,
      },
    });

    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockResolvedValue(container);

    const { result } = renderHook(
      () =>
        useWorkspaceViewModel({
          activeTagId: "all",
          activeView: "today",
          focusTarget: null,
          quickAddTarget: null,
          runtimeNotice: null,
          notificationDebugEntries: [],
          onClearNotificationDebug: vi.fn(async () => undefined),
          onTagFilterChange: vi.fn(),
          onWorkspaceChanged,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.listPanelProps.activeReminderHits).toHaveLength(1);
    });

    act(() => {
      result.current.listPanelProps.onToggleReminderSelection("record-1");
      result.current.listPanelProps.onToggleReminderSelectedOnly();
    });

    await waitFor(() => {
      expect(result.current.listPanelProps.reminderSelectedIds).toEqual(["record-1"]);
      expect(result.current.listPanelProps.reminderSelectedOnly).toBe(true);
    });

    act(() => {
      result.current.listPanelProps.onReminderReschedule("today_18");
    });

    await waitFor(() => {
      expect(batchReschedule).toHaveBeenCalledWith(["record-1"], {
        preset: "today_18",
      });
      expect(result.current.listPanelProps.message).toBe("已完成仅改选中改期");
    });

    expect(onWorkspaceChanged).toHaveBeenCalled();
    expect(listRecords).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.listPanelProps.onToggleReminderSelection("record-1");
      result.current.listPanelProps.onToggleReminderSelectedOnly();
    });

    await waitFor(() => {
      expect(result.current.listPanelProps.reminderSelectedIds).toEqual(["record-1"]);
      expect(result.current.listPanelProps.reminderSelectedOnly).toBe(true);
    });

    act(() => {
      result.current.listPanelProps.onSnoozeReminder(30);
    });

    await waitFor(() => {
      expect(snoozeReminder).toHaveBeenCalledWith(["record-1"], 30);
      expect(result.current.listPanelProps.message).toBe("已延后提醒 30 分钟");
    });

    expect(result.current.listPanelProps.reminder).toBeNull();
    expect(result.current.listPanelProps.activeReminderHits).toEqual([]);
    expect(result.current.listPanelProps.reminderSelectedIds).toEqual([]);
    expect(result.current.listPanelProps.reminderSelectedOnly).toBe(false);

    await waitFor(() => {
      expect(result.current.listPanelProps.message).toBeNull();
    }, { timeout: 4000 });
  });

  it("completes custom reminder reschedule flow with validation and selected-only targeting", async () => {
    const listRecords = vi.fn(async () => ({
      items: [
        createWorkspaceRecordEntity({
          id: "record-1",
          title: "整理周报",
          dueAt: "2026-01-02T09:00:00.000Z",
        }),
      ],
      total: 1,
    }));
    const batchReschedule = vi.fn(async () => []);
    const container = createWorkspaceAppContainerDouble({
      recordService: {
        listRecords,
        batchReschedule,
      },
      tagService: {
        listTags: vi.fn(async () => []),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () =>
          createWorkspaceReminderSummary({
            kind: "overdue",
            title: "有任务已逾期",
            recordIds: ["record-1"],
          }),
        ),
        listReminderHits: vi.fn(async () => [
          createWorkspaceReminderHit({
            id: "record-1",
            title: "整理周报",
            reminderKind: "overdue",
            dueAt: "2026-01-02T09:00:00.000Z",
          }),
        ]),
      },
    });

    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockResolvedValue(container);

    const { result } = renderHook(
      () =>
        useWorkspaceViewModel({
          activeTagId: "all",
          activeView: "today",
          focusTarget: null,
          quickAddTarget: null,
          runtimeNotice: null,
          notificationDebugEntries: [],
          onClearNotificationDebug: vi.fn(async () => undefined),
          onTagFilterChange: vi.fn(),
          onWorkspaceChanged: vi.fn(),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.listPanelProps.activeReminderHits).toHaveLength(1);
    });

    act(() => {
      result.current.listPanelProps.onToggleReminderSelection("record-1");
      result.current.listPanelProps.onToggleReminderSelectedOnly();
      result.current.listPanelProps.onOpenCustomReminderReschedule();
    });

    await waitFor(() => {
      expect(result.current.customReminderSheetProps.open).toBe(true);
      expect(result.current.customReminderSheetProps.reminderSelectedOnly).toBe(true);
    });

    act(() => {
      result.current.customReminderSheetProps.onChangeDueAt("2000-01-01T08:30");
    });

    await waitFor(() => {
      expect(result.current.customReminderSheetProps.customReminderDueAt).toBe("2000-01-01T08:30");
    });

    act(() => {
      result.current.customReminderSheetProps.onSubmit();
    });

    await waitFor(() => {
      expect(result.current.listPanelProps.message).toBe("新的截止时间需晚于当前时间。");
    });

    expect(batchReschedule).not.toHaveBeenCalled();

    act(() => {
      result.current.customReminderSheetProps.onChangeDueAt("2099-01-02T09:00");
    });

    await waitFor(() => {
      expect(result.current.customReminderSheetProps.customReminderDueAt).toBe("2099-01-02T09:00");
    });

    act(() => {
      result.current.customReminderSheetProps.onSubmit();
    });

    await waitFor(() => {
      expect(batchReschedule).toHaveBeenCalledWith(["record-1"], {
        preset: "custom",
        customAt: new Date("2099-01-02T09:00").toISOString(),
      });
      expect(result.current.listPanelProps.message).toBe("已完成自定义改期");
    });

    expect(result.current.customReminderSheetProps.open).toBe(false);
    expect(result.current.listPanelProps.reminderSelectedIds).toEqual([]);
    expect(result.current.listPanelProps.reminderSelectedOnly).toBe(false);
  });

  it("clears notification debug entries through the integrated notification actions", async () => {
    const onClearNotificationDebug = vi.fn(async () => undefined);
    const container = createWorkspaceAppContainerDouble({
      recordService: {
        listRecords: vi.fn(async () => ({
          items: [],
          total: 0,
        })),
      },
      tagService: {
        listTags: vi.fn(async () => []),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () => null),
        listReminderHits: vi.fn(async () => []),
      },
    });

    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockResolvedValue(container);

    const { result } = renderHook(
      () =>
        useWorkspaceViewModel({
          activeTagId: "all",
          activeView: "today",
          focusTarget: null,
          quickAddTarget: null,
          runtimeNotice: null,
          notificationDebugEntries: [
            {
              id: "debug-1",
              at: "2026-01-01T09:20:00.000Z",
              source: "action",
              level: "info",
              title: "提醒已扫描",
              detail: "存在 1 条待清理通知日志",
            },
          ],
          onClearNotificationDebug,
          onTagFilterChange: vi.fn(),
          onWorkspaceChanged: vi.fn(),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.listPanelProps.loading).toBe(false);
    });

    act(() => {
      result.current.listPanelProps.onClearNotificationDebug();
    });

    await waitFor(() => {
      expect(onClearNotificationDebug).toHaveBeenCalledTimes(1);
      expect(result.current.listPanelProps.message).toBe("通知调试记录已清空");
    });
  });
});
