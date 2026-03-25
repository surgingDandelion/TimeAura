import { fireEvent, render, screen } from "@testing-library/react";
import type { MutableRefObject, RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceListPanel } from "../WorkspaceListPanel";
import {
  createWorkspaceRecordEntity,
  createWorkspaceReminderSummary,
  createWorkspaceTagEntity,
} from "../../testing/workspaceServiceTestDoubles";

function createProps() {
  const tag = createWorkspaceTagEntity({
    id: "tag_work",
    name: "工作",
  });
  const record = createWorkspaceRecordEntity({
    id: "record-1",
    title: "整理周报",
    tags: [tag.id],
  });

  return {
    activeTagId: "all",
    activeView: "all" as const,
    currentTagName: "全部标签",
    quickAdd: "补充内容",
    keyword: "",
    status: "todo" as const,
    sortBy: "smart" as const,
    tags: [tag],
    records: [record],
    selectedId: record.id,
    selectedIds: [record.id],
    selectedCount: 1,
    visibleSelectedCount: 1,
    highlightedRecordId: record.id,
    loading: false,
    quickAddActive: true,
    message: "已新增记录",
    runtimeNoticeTone: "info" as const,
    reminder: createWorkspaceReminderSummary({
      recordIds: [record.id],
    }),
    activeReminderHits: [],
    activeReminderTargetIds: [],
    reminderExpanded: false,
    reminderSelectedIds: [],
    reminderSelectedOnly: false,
    visibleReminderSelectedCount: 0,
    notificationDebugFeed: [],
    notificationDebugOpen: false,
    quickAddRef: { current: null } as RefObject<HTMLInputElement>,
    searchRef: { current: null } as RefObject<HTMLInputElement>,
    rowRefs: { current: {} } as MutableRefObject<Record<string, HTMLButtonElement | null>>,
    onRefresh: vi.fn(),
    onQuickAddChange: vi.fn(),
    onQuickAddSubmit: vi.fn(),
    onKeywordChange: vi.fn(),
    onStatusChange: vi.fn(),
    onTagFilterChange: vi.fn(),
    onSortByChange: vi.fn(),
    onOpenShortcutHelp: vi.fn(),
    onToggleSelectAllVisible: vi.fn(),
    onClearSelection: vi.fn(),
    onBatchReschedule: vi.fn(),
    onToggleNotificationDebug: vi.fn(),
    onExportNotificationDebug: vi.fn(),
    onClearNotificationDebug: vi.fn(),
    onToggleReminderExpanded: vi.fn(),
    onToggleReminderSelectedOnly: vi.fn(),
    onSnoozeReminder: vi.fn(),
    onReminderReschedule: vi.fn(),
    onOpenCustomReminderReschedule: vi.fn(),
    onToggleSelectAllReminderHits: vi.fn(),
    onFocusRecordFromReminder: vi.fn(),
    onToggleReminderSelection: vi.fn(),
    onSelectRecord: vi.fn(),
    onToggleSelection: vi.fn(),
    onCompleteRecord: vi.fn(),
  };
}

describe("WorkspaceListPanel", () => {
  it("handles quick add, filters, row selection, and complete action", () => {
    const props = createProps();
    render(<WorkspaceListPanel {...props} />);

    fireEvent.change(screen.getByPlaceholderText("单行快速新增到「全部标签」"), {
      target: { value: "新的记录" },
    });
    expect(props.onQuickAddChange).toHaveBeenCalledWith("新的记录");

    fireEvent.keyDown(screen.getByPlaceholderText("单行快速新增到「全部标签」"), {
      key: "Enter",
    });
    expect(props.onQuickAddSubmit).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByPlaceholderText("模糊检索标题或内容"), {
      target: { value: "周报" },
    });
    expect(props.onKeywordChange).toHaveBeenCalledWith("周报");

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0]!, { target: { value: "all" } });
    fireEvent.change(selects[1]!, { target: { value: "tag_work" } });
    fireEvent.change(selects[2]!, { target: { value: "priority" } });

    expect(props.onStatusChange).toHaveBeenCalledWith("all");
    expect(props.onTagFilterChange).toHaveBeenCalledWith("tag_work");
    expect(props.onSortByChange).toHaveBeenCalledWith("priority");

    fireEvent.click(screen.getByText("刷新"));
    fireEvent.click(screen.getByText("快捷键"));
    fireEvent.click(screen.getByText("清空全选"));
    fireEvent.click(screen.getByText("清空选择"));

    expect(props.onRefresh).toHaveBeenCalledTimes(1);
    expect(props.onOpenShortcutHelp).toHaveBeenCalledTimes(1);
    expect(props.onToggleSelectAllVisible).toHaveBeenCalledTimes(1);
    expect(props.onClearSelection).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("整理周报"));
    expect(props.onSelectRecord).toHaveBeenCalledWith("record-1");

    fireEvent.click(screen.getByRole("checkbox", { checked: true }));
    expect(props.onToggleSelection).toHaveBeenCalledWith("record-1");

    fireEvent.click(screen.getByText("完成"));
    expect(props.onCompleteRecord).toHaveBeenCalledWith("record-1");
  });

  it("exposes batch reschedule actions when there is selection", () => {
    const props = {
      ...createProps(),
      reminder: null,
    };
    render(<WorkspaceListPanel {...props} />);

    fireEvent.click(screen.getByText("顺延 1 小时"));
    fireEvent.click(screen.getByText("今晚 18:00"));
    fireEvent.click(screen.getByText("明早 09:00"));

    expect(props.onBatchReschedule).toHaveBeenNthCalledWith(1, "plus_1_hour");
    expect(props.onBatchReschedule).toHaveBeenNthCalledWith(2, "today_18");
    expect(props.onBatchReschedule).toHaveBeenNthCalledWith(3, "tomorrow_09");
  });

  it("renders loading and empty states, and disables status filter in system views", () => {
    const props = {
      ...createProps(),
      activeView: "done" as const,
      records: [],
      selectedId: null,
      selectedIds: [],
      selectedCount: 0,
      visibleSelectedCount: 0,
      highlightedRecordId: null,
      loading: true,
      reminder: null,
      message: null,
    };

    const { rerender } = render(<WorkspaceListPanel {...props} />);

    expect(screen.getByText("正在加载记录…")).toBeTruthy();

    const statusSelect = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    expect(statusSelect.disabled).toBe(true);
    expect(statusSelect.value).toBe("done");

    rerender(
      <WorkspaceListPanel
        {...props}
        loading={false}
      />,
    );

    expect(screen.getByText("当前没有符合筛选条件的记录。")).toBeTruthy();
  });

  it("wires notification panel actions and renders completed rows without complete action", () => {
    const props = {
      ...createProps(),
      records: [
        createWorkspaceRecordEntity({
          id: "record-1",
          title: "整理周报",
          status: "已完成",
        }),
      ],
      selectedId: "record-1",
      selectedIds: [],
      selectedCount: 0,
      visibleSelectedCount: 0,
      notificationDebugOpen: true,
      notificationDebugFeed: [
        {
          id: "debug-1",
          at: "2026-01-01T09:20:00.000Z",
          source: "action" as const,
          level: "info" as const,
          title: "提醒已触发",
          detail: "任务已被桌面通知命中",
        },
      ],
      message: "提醒已刷新",
      runtimeNoticeTone: "warning" as const,
      reminder: null,
    };

    render(<WorkspaceListPanel {...props} />);

    expect(screen.getByText("提醒已刷新").className).toContain("inline-message-warning");
    expect(screen.getAllByText("已完成")).toHaveLength(3);
    expect(screen.queryByText("完成")).toBeNull();

    fireEvent.click(screen.getByText("导出"));
    fireEvent.click(screen.getByText("清空"));
    fireEvent.click(screen.getByText("收起调试"));

    expect(props.onExportNotificationDebug).toHaveBeenCalledTimes(1);
    expect(props.onClearNotificationDebug).toHaveBeenCalledTimes(1);
    expect(props.onToggleNotificationDebug).toHaveBeenCalledTimes(1);
  });
});
