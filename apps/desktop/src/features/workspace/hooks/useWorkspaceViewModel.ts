import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TagEntity } from "@timeaura-core";

import { useAppServices } from "../../../app/providers/AppServicesProvider";
import { WORKSPACE_SHORTCUT_ITEMS, useWorkspaceKeyboardShortcuts } from "./useWorkspaceKeyboardShortcuts";
import { useWorkspaceData } from "./useWorkspaceData";
import { useWorkspaceRecordDraft } from "./useWorkspaceRecordDraft";
import { useWorkspaceReminderActions } from "./useWorkspaceReminderActions";
import { useWorkspaceSelection } from "./useWorkspaceSelection";
import type { TagEditorDraft, WorkspacePageProps } from "../types";

export function useWorkspaceViewModel({
  activeTagId,
  activeView,
  focusTarget,
  quickAddTarget,
  runtimeNotice,
  notificationDebugEntries,
  onClearNotificationDebug,
  onTagFilterChange,
  onWorkspaceChanged,
}: WorkspacePageProps) {
  const { services, runtime } = useAppServices();
  const quickAddRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [quickAdd, setQuickAdd] = useState("");
  const [notificationDebugOpen, setNotificationDebugOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [tagEditor, setTagEditor] = useState<TagEditorDraft>({
    id: null,
    name: "",
    color: "#5f89ff",
  });

  const {
    records,
    tags,
    keyword,
    setKeyword,
    status,
    setStatus,
    sortBy,
    setSortBy,
    reminder,
    reminderHits,
    loading,
    currentTagName,
    loadWorkspace,
  } = useWorkspaceData({
    activeTagId,
    activeView,
    services,
  });

  const {
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    selectedCount,
    highlightedRecordId,
    quickAddActive,
    visibleSelectedCount,
    triggerQuickAddSpotlight,
    toggleSelection,
    toggleSelectAllVisible,
    focusRecord,
    clearSelection,
    closeInspector,
  } = useWorkspaceSelection({
    records,
    focusTarget,
    quickAddTarget,
    onTagFilterChange,
    onResetListContext: () => {
      setKeyword("");
      setStatus("todo");
    },
    onQuickAddRequested: () => {
      quickAddRef.current?.focus();
      quickAddRef.current?.select();
    },
  });

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedId) ?? null,
    [records, selectedId],
  );
  const batchTargetIds = selectedIds.length > 0 ? selectedIds : reminder?.recordIds ?? [];
  const notificationDebugFeed = useMemo(() => {
    const runtimeEntries =
      runtime?.notifications.map((item) => ({
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
  }, [notificationDebugEntries, runtime?.notifications]);
  const editingTag = useMemo(
    () => (tagEditor.id ? tags.find((tag) => tag.id === tagEditor.id) ?? null : null),
    [tagEditor.id, tags],
  );

  const syncWorkspace = useCallback(async (afterMessage?: string): Promise<void> => {
    await loadWorkspace();
    await onWorkspaceChanged?.();

    if (afterMessage) {
      setMessage(afterMessage);
    }
  }, [loadWorkspace, onWorkspaceChanged]);

  const {
    draft,
    setDraft,
    contentMode,
    setContentMode,
    saving,
    draftDirty,
    saveDraft,
    generateSummary,
    polishMarkdown,
    toggleTag,
  } = useWorkspaceRecordDraft({
    selectedRecord,
    services,
    syncWorkspace,
    onMessage: setMessage,
  });

  const {
    reminderExpanded,
    setReminderExpanded,
    reminderSelectedIds,
    reminderSelectedOnly,
    setReminderSelectedOnly,
    customReminderTimeOpen,
    setCustomReminderTimeOpen,
    customReminderDueAt,
    setCustomReminderDueAt,
    activeReminderHits,
    activeReminderTargetIds,
    visibleReminderSelectedCount,
    customReminderValidation,
    handleReminderReschedule,
    handleSnoozeReminder,
    openCustomReminderReschedule,
    applyCustomReminderPreset,
    submitCustomReminderReschedule,
    toggleReminderSelection,
    toggleSelectAllReminderHits,
  } = useWorkspaceReminderActions({
    reminder,
    reminderHits,
    services,
    syncWorkspace,
    onMessage: setMessage,
  });

  useEffect(() => {
    if (!runtimeNotice) {
      return;
    }

    setMessage(runtimeNotice.text);

    const timer = window.setTimeout(() => {
      setMessage((current) => (current === runtimeNotice.text ? null : current));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [runtimeNotice]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    rowRefs.current[selectedId]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedId]);

  const focusSearchInput = useCallback(() => {
    searchRef.current?.focus();
    searchRef.current?.select();
  }, []);

  const handleQuickAdd = useCallback(async (): Promise<void> => {
    const title = quickAdd.trim();

    if (!title) {
      return;
    }

    const created = await services.recordService.createRecord({
      title,
      tags: activeTagId !== "all" ? [activeTagId] : undefined,
      priority: "P3",
      status: "未开始",
      plannedAt: null,
    });

    setQuickAdd("");
    setSelectedId(created.id);
    await syncWorkspace("已新增记录");
    quickAddRef.current?.focus();
  }, [activeTagId, quickAdd, services.recordService, setSelectedId, syncWorkspace]);

  const handleComplete = useCallback(async (recordId: string): Promise<void> => {
    await services.recordService.completeRecord(recordId);
    await syncWorkspace("已完成该任务");
  }, [services.recordService, syncWorkspace]);

  const handleDelete = useCallback(async (recordId: string): Promise<void> => {
    const confirmed = globalThis.confirm?.("确认删除这条记录吗？") ?? true;

    if (!confirmed) {
      return;
    }

    await services.recordService.deleteRecord(recordId);

    if (selectedId === recordId) {
      setSelectedId(null);
    }

    setSelectedIds((current) => current.filter((id) => id !== recordId));
    await syncWorkspace("记录已删除");
  }, [selectedId, services.recordService, setSelectedId, setSelectedIds, syncWorkspace]);

  const handleArchive = useCallback(async (recordId: string): Promise<void> => {
    await services.recordService.archiveRecord(recordId);
    await syncWorkspace("记录已归档");
  }, [services.recordService, syncWorkspace]);

  const handleReschedule = useCallback(async (preset: "plus_1_hour" | "tomorrow_09" | "today_18"): Promise<void> => {
    if (batchTargetIds.length === 0) {
      return;
    }

    await services.recordService.batchReschedule(batchTargetIds, { preset });
    clearSelection();
    await syncWorkspace(selectedIds.length > 0 ? "已完成批量改期" : "已完成一键改期");
  }, [batchTargetIds, clearSelection, selectedIds.length, services.recordService, syncWorkspace]);

  const openTagManager = useCallback(() => {
    setTagManagerOpen(true);
    setTagEditor({
      id: null,
      name: "",
      color: "#5f89ff",
    });
  }, []);

  const startEditTag = useCallback((tag: TagEntity): void => {
    setTagEditor({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    });
  }, []);

  const resetTagEditor = useCallback(() => {
    setTagEditor({
      id: null,
      name: "",
      color: "#5f89ff",
    });
  }, []);

  const handleCreateOrUpdateTag = useCallback(async (): Promise<void> => {
    const name = tagEditor.name.trim();

    if (!name) {
      setMessage("标签名称不能为空");
      return;
    }

    if (tagEditor.id) {
      await services.tagService.updateTag(tagEditor.id, {
        name,
        color: tagEditor.color,
      });
      await syncWorkspace("标签已更新");
      return;
    }

    const created = await services.tagService.createTag({
      name,
      color: tagEditor.color,
    });

    if (draft) {
      setDraft({
        ...draft,
        tags: [...draft.tags.filter((item) => item !== "tag_uncategorized"), created.id],
      });
    }

    setTagEditor({
      id: created.id,
      name: created.name,
      color: created.color,
    });
    await syncWorkspace("已创建新标签");
  }, [draft, services.tagService, setDraft, syncWorkspace, tagEditor]);

  const handleDeleteTag = useCallback(async (tag: TagEntity): Promise<void> => {
    const confirmed = globalThis.confirm?.(`确认删除标签“${tag.name}”吗？`) ?? true;

    if (!confirmed) {
      return;
    }

    await services.tagService.deleteTag(tag.id);

    if (activeTagId === tag.id) {
      onTagFilterChange("all");
    }

    if (draft?.tags.includes(tag.id)) {
      setDraft({
        ...draft,
        tags: draft.tags.filter((item) => item !== tag.id),
      });
    }

    resetTagEditor();
    await syncWorkspace("标签已删除");
  }, [activeTagId, draft, onTagFilterChange, resetTagEditor, services.tagService, setDraft, syncWorkspace]);

  const openShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false);
  }, []);

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
    setMessage("通知调试记录已导出");
  }, [notificationDebugFeed]);

  const handleClearNotificationDebugPanel = useCallback(async (): Promise<void> => {
    if (notificationDebugFeed.length === 0) {
      return;
    }

    const confirmed = globalThis.confirm?.("确认清空当前通知调试记录吗？") ?? true;

    if (!confirmed) {
      return;
    }

    await onClearNotificationDebug?.();
    setMessage("通知调试记录已清空");
  }, [notificationDebugFeed.length, onClearNotificationDebug]);

  useWorkspaceKeyboardShortcuts({
    records,
    selectedId,
    selectedRecord,
    draftDirty,
    saving,
    customReminderTimeOpen,
    tagManagerOpen,
    shortcutHelpOpen,
    onFocusQuickAdd: triggerQuickAddSpotlight,
    onFocusSearch: focusSearchInput,
    onSave: () => {
      void saveDraft();
    },
    onCloseCustomReminder: () => setCustomReminderTimeOpen(false),
    onCloseTagManager: () => setTagManagerOpen(false),
    onCloseShortcutHelp: closeShortcutHelp,
    onCloseInspector: closeInspector,
    onSelectRecord: setSelectedId,
    onToggleSelection: toggleSelection,
    onOpenShortcutHelp: openShortcutHelp,
  });

  return {
    listPanelProps: {
      activeTagId,
      activeView,
      currentTagName,
      quickAdd,
      keyword,
      status,
      sortBy,
      tags,
      records,
      selectedId,
      selectedIds,
      selectedCount,
      visibleSelectedCount,
      highlightedRecordId,
      loading,
      quickAddActive,
      message,
      runtimeNoticeTone: runtimeNotice?.tone,
      reminder,
      activeReminderHits,
      activeReminderTargetIds,
      reminderExpanded,
      reminderSelectedIds,
      reminderSelectedOnly,
      visibleReminderSelectedCount,
      notificationDebugFeed,
      notificationDebugOpen,
      quickAddRef,
      searchRef,
      rowRefs,
      onRefresh: () => {
        void loadWorkspace();
      },
      onQuickAddChange: setQuickAdd,
      onQuickAddSubmit: () => {
        void handleQuickAdd();
      },
      onKeywordChange: setKeyword,
      onStatusChange: setStatus,
      onTagFilterChange,
      onSortByChange: setSortBy,
      onOpenShortcutHelp: openShortcutHelp,
      onToggleSelectAllVisible: toggleSelectAllVisible,
      onClearSelection: clearSelection,
      onBatchReschedule: (preset: "plus_1_hour" | "today_18" | "tomorrow_09") => {
        void handleReschedule(preset);
      },
      onToggleNotificationDebug: () => setNotificationDebugOpen((current) => !current),
      onExportNotificationDebug: handleExportNotificationDebug,
      onClearNotificationDebug: () => {
        void handleClearNotificationDebugPanel();
      },
      onToggleReminderExpanded: () => setReminderExpanded((current) => !current),
      onToggleReminderSelectedOnly: () => setReminderSelectedOnly((current) => !current),
      onSnoozeReminder: (minutes: number) => {
        void handleSnoozeReminder(minutes);
      },
      onReminderReschedule: (preset: "plus_1_hour" | "today_18" | "tomorrow_09") => {
        void handleReminderReschedule(preset);
      },
      onOpenCustomReminderReschedule: openCustomReminderReschedule,
      onToggleSelectAllReminderHits: toggleSelectAllReminderHits,
      onFocusRecordFromReminder: focusRecord,
      onToggleReminderSelection: toggleReminderSelection,
      onSelectRecord: setSelectedId,
      onToggleSelection: toggleSelection,
      onCompleteRecord: (recordId: string) => {
        void handleComplete(recordId);
      },
    },
    detailInspectorProps: {
      selectedRecord,
      draft,
      tags,
      contentMode,
      saving,
      draftDirty,
      onGenerateSummary: () => {
        void generateSummary();
      },
      onPolishMarkdown: () => {
        void polishMarkdown();
      },
      onOpenTagManager: openTagManager,
      onArchive: (recordId: string) => {
        void handleArchive(recordId);
      },
      onDelete: (recordId: string) => {
        void handleDelete(recordId);
      },
      onClose: closeInspector,
      onSave: () => {
        void saveDraft();
      },
      onDraftChange: setDraft,
      onToggleTag: toggleTag,
      onContentModeChange: setContentMode,
    },
    tagManagerSheetProps: {
      open: tagManagerOpen,
      tags,
      draft,
      tagEditor,
      editingTag,
      onClose: () => setTagManagerOpen(false),
      onResetEditor: resetTagEditor,
      onToggleTag: toggleTag,
      onSelectTag: startEditTag,
      onTagEditorChange: setTagEditor,
      onSubmit: () => {
        void handleCreateOrUpdateTag();
      },
      onDelete: (tag: TagEntity) => {
        void handleDeleteTag(tag);
      },
    },
    customReminderSheetProps: {
      open: customReminderTimeOpen,
      reminderSelectedOnly,
      reminderSelectedIds,
      activeReminderTargetIds,
      customReminderDueAt,
      customReminderValidation,
      onClose: () => setCustomReminderTimeOpen(false),
      onChangeDueAt: setCustomReminderDueAt,
      onApplyPreset: applyCustomReminderPreset,
      onSubmit: () => {
        void submitCustomReminderReschedule();
      },
    },
    shortcutHelpProps: {
      open: shortcutHelpOpen,
      shortcuts: WORKSPACE_SHORTCUT_ITEMS,
      onClose: closeShortcutHelp,
    },
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
