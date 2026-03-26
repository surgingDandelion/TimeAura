import { act, renderHook } from "@testing-library/react";
import type { MutableRefObject, RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { WorkspaceSort, WorkspaceStatusFilter } from "../../types";
import {
  createWorkspaceRecordEntity,
  createWorkspaceReminderHit,
  createWorkspaceReminderSummary,
  createWorkspaceTagEntity,
} from "../../testing/workspaceServiceTestDoubles";
import { useWorkspaceCommands } from "../useWorkspaceCommands";

const { keyboardShortcutsSpy } = vi.hoisted(() => ({
  keyboardShortcutsSpy: vi.fn(),
}));

vi.mock("../useWorkspaceKeyboardShortcuts", async () => {
  const actual = await vi.importActual<typeof import("../useWorkspaceKeyboardShortcuts")>(
    "../useWorkspaceKeyboardShortcuts",
  );

  return {
    ...actual,
    useWorkspaceKeyboardShortcuts(options: unknown) {
      keyboardShortcutsSpy(options);
    },
  };
});

function createCommandsOptions() {
  const tag = createWorkspaceTagEntity();
  const record = createWorkspaceRecordEntity({
    id: "record-1",
    title: "整理周报",
    tags: [tag.id],
  });
  const reminder = createWorkspaceReminderSummary({
    recordIds: [record.id],
  });
  const reminderHit = createWorkspaceReminderHit({
    id: record.id,
    title: record.title,
    reminderKind: reminder.kind,
  });
  const quickAddRef = {
    current: {
      focus: vi.fn(),
      select: vi.fn(),
    },
  } as unknown as RefObject<HTMLInputElement>;
  const searchRef = {
    current: {
      focus: vi.fn(),
      select: vi.fn(),
    },
  } as unknown as RefObject<HTMLInputElement>;
  const rowRefs = {
    current: {},
  } as MutableRefObject<Record<string, HTMLButtonElement | null>>;

  return {
    activeTagId: "all",
    activeView: "today" as const,
    currentTagName: "全部标签",
    quickAdd: "补充周报",
    keyword: "周报",
    status: "todo" as WorkspaceStatusFilter,
    priority: "all" as const,
    sortBy: "smart" as WorkspaceSort,
    tags: [tag],
    records: [record],
    selectedId: record.id,
    selectedIds: [record.id],
    selectedCount: 1,
    visibleSelectedCount: 1,
    highlightedRecordId: record.id,
    loading: false,
    quickAddOpen: true,
    quickAddSpotlight: true,
    message: "已完成提醒命中改期",
    runtimeNoticeTone: "warning" as const,
    reminder,
    activeReminderHits: [reminderHit],
    activeReminderTargetIds: [record.id],
    reminderExpanded: true,
    reminderSelectedIds: [record.id],
    reminderSelectedOnly: true,
    visibleReminderSelectedCount: 1,
    notificationDebugFeed: [],
    notificationDebugOpen: false,
    customReminderTimeOpen: false,
    tagManagerOpen: true,
    draftDirty: true,
    saving: false,
    selectedRecord: record,
    draft: {
      title: record.title,
      status: record.status,
      priority: record.priority,
      dueAt: "",
      plannedAt: "",
      completedAt: "",
      contentMarkdown: record.contentMarkdown,
      tags: record.tags,
      isPinned: record.isPinned,
    },
    contentMode: "edit" as const,
    customReminderDueAt: "2026-01-02T09:00",
    customReminderValidation: [],
    editingTag: tag,
    tagEditor: {
      id: tag.id,
      name: tag.name,
      color: tag.color,
    },
    quickAddRef,
    searchRef,
    rowRefs,
    onRefresh: vi.fn(),
    onCloseQuickAdd: vi.fn(),
    onQuickAddChange: vi.fn(),
    onQuickAddSubmit: vi.fn(),
    onKeywordChange: vi.fn(),
    onStatusChange: vi.fn(),
    onPriorityChange: vi.fn(),
    onTagFilterChange: vi.fn(),
    onSortByChange: vi.fn(),
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
    onGenerateSummary: vi.fn(),
    onPolishMarkdown: vi.fn(),
    onOpenTagManager: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onCloseInspector: vi.fn(),
    onSave: vi.fn(),
    onDraftChange: vi.fn(),
    onToggleTag: vi.fn(),
    onContentModeChange: vi.fn(),
    onCloseTagManager: vi.fn(),
    onResetTagEditor: vi.fn(),
    onSelectTag: vi.fn(),
    onTagEditorChange: vi.fn(),
    onSubmitTagEditor: vi.fn(),
    onDeleteTag: vi.fn(),
    onCloseCustomReminder: vi.fn(),
    onChangeCustomReminderDueAt: vi.fn(),
    onApplyCustomReminderPreset: vi.fn(),
    onSubmitCustomReminder: vi.fn(),
    onFocusQuickAdd: vi.fn(),
  };
}

describe("useWorkspaceCommands", () => {
  beforeEach(() => {
    keyboardShortcutsSpy.mockClear();
  });

  it("assembles contract props for list, inspector, tag manager, and custom reminder panels", () => {
    const options = createCommandsOptions();

    const { result } = renderHook(() => useWorkspaceCommands(options));

    expect(result.current.listPanelProps.activeView).toBe("today");
    expect(result.current.listPanelProps.priority).toBe("all");
    expect(result.current.listPanelProps.onBatchReschedule).toBe(options.onBatchReschedule);
    expect(result.current.quickAddSheetProps.open).toBe(true);
    expect(result.current.quickAddSheetProps.quickAddRef).toBe(options.quickAddRef);
    expect(result.current.detailInspectorProps.selectedRecord?.id).toBe("record-1");
    expect(result.current.detailInspectorProps.onSave).toBe(options.onSave);
    expect(result.current.tagManagerSheetProps.open).toBe(true);
    expect(result.current.tagManagerSheetProps.onDelete).toBe(options.onDeleteTag);
    expect(result.current.customReminderSheetProps.customReminderDueAt).toBe("2026-01-02T09:00");
    expect(result.current.customReminderSheetProps.onApplyPreset).toBe(options.onApplyCustomReminderPreset);
    expect(result.current.shortcutHelpProps.shortcuts.length).toBeGreaterThan(0);
    expect(keyboardShortcutsSpy).toHaveBeenCalledTimes(1);
  });

  it("bridges keyboard shortcut callbacks to search focus and shortcut help state", () => {
    const options = createCommandsOptions();
    const { result } = renderHook(() => useWorkspaceCommands(options));
    const keyboardOptions = keyboardShortcutsSpy.mock.calls.at(-1)?.[0] as {
      onFocusSearch(): void;
      onOpenShortcutHelp(): void;
      onCloseShortcutHelp(): void;
    };

    act(() => {
      keyboardOptions.onFocusSearch();
    });

    expect(options.searchRef.current?.focus).toHaveBeenCalledTimes(1);
    expect(options.searchRef.current?.select).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.listPanelProps.onOpenShortcutHelp();
    });

    expect(result.current.shortcutHelpProps.open).toBe(true);

    act(() => {
      keyboardOptions.onCloseShortcutHelp();
    });

    expect(result.current.shortcutHelpProps.open).toBe(false);
  });

  it("keeps shortcut callbacks stable when focus refs are unavailable", () => {
    const options = {
      ...createCommandsOptions(),
      quickAddRef: { current: null } as RefObject<HTMLInputElement>,
      searchRef: { current: null } as RefObject<HTMLInputElement>,
    };

    renderHook(() => useWorkspaceCommands(options));
    const keyboardOptions = keyboardShortcutsSpy.mock.calls.at(-1)?.[0] as {
      onFocusSearch(): void;
      onOpenShortcutHelp(): void;
      onCloseShortcutHelp(): void;
    };

    expect(() => {
      act(() => {
        keyboardOptions.onFocusSearch();
        keyboardOptions.onOpenShortcutHelp();
        keyboardOptions.onCloseShortcutHelp();
      });
    }).not.toThrow();
  });

  it("assembles stable empty-state contracts when no record is selected", () => {
    const options = {
      ...createCommandsOptions(),
      tags: [],
      records: [],
      selectedId: null,
      selectedIds: [],
      selectedCount: 0,
      visibleSelectedCount: 0,
      highlightedRecordId: null,
      message: null,
      reminder: null,
      activeReminderHits: [],
      activeReminderTargetIds: [],
      reminderExpanded: false,
      reminderSelectedIds: [],
      reminderSelectedOnly: false,
      visibleReminderSelectedCount: 0,
      selectedRecord: null,
      draft: null,
      editingTag: null,
      tagManagerOpen: false,
      customReminderTimeOpen: false,
    };

    const { result } = renderHook(() => useWorkspaceCommands(options));

    expect(result.current.listPanelProps.records).toEqual([]);
    expect(result.current.listPanelProps.selectedId).toBeNull();
    expect(result.current.detailInspectorProps.selectedRecord).toBeNull();
    expect(result.current.detailInspectorProps.draft).toBeNull();
    expect(result.current.tagManagerSheetProps.open).toBe(false);
    expect(result.current.customReminderSheetProps.open).toBe(false);
    expect(result.current.shortcutHelpProps.open).toBe(false);
  });
});
