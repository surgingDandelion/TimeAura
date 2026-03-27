import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TagEntity } from "@timeaura-core";

import { useAppServices } from "../../../app/providers/AppServicesProvider";
import { useWorkspaceNotificationDebugActions } from "./useWorkspaceNotificationDebugActions";
import { useWorkspaceCommands } from "./useWorkspaceCommands";
import { useWorkspaceData } from "./useWorkspaceData";
import { useWorkspaceQuickAddActions } from "./useWorkspaceQuickAddActions";
import { useWorkspaceRecordDraft } from "./useWorkspaceRecordDraft";
import { useWorkspaceRecordActions } from "./useWorkspaceRecordActions";
import { useWorkspaceReminderActions } from "./useWorkspaceReminderActions";
import { useWorkspaceSelection } from "./useWorkspaceSelection";
import { useWorkspaceTagManagerActions } from "./useWorkspaceTagManagerActions";
import type { WorkspacePageProps } from "../types";

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
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  const [message, setMessage] = useState<string | null>(null);

  const {
    records,
    tags,
    keyword,
    setKeyword,
    status,
    setStatus,
    priority,
    setPriority,
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
  const handleResetListContext = useCallback(() => {
    setKeyword("");
    setStatus("todo");
    setPriority("all");
  }, [setKeyword, setPriority, setStatus]);
  const handleQuickAddRequested = useCallback(() => {
    quickAddRef.current?.focus();
    quickAddRef.current?.select();
  }, []);

  const {
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    selectedCount,
    highlightedRecordId,
    quickAddOpen,
    quickAddSpotlight,
    visibleSelectedCount,
    openQuickAdd,
    closeQuickAdd,
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
    onResetListContext: handleResetListContext,
    onQuickAddRequested: handleQuickAddRequested,
  });

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedId) ?? null,
    [records, selectedId],
  );

  const syncWorkspace = useCallback(async (afterMessage?: string): Promise<void> => {
    await loadWorkspace();
    await onWorkspaceChanged?.();

    if (afterMessage) {
      setMessage(afterMessage);
    }
  }, [loadWorkspace, onWorkspaceChanged]);

  const runCommandSafely = useCallback(async (command: () => Promise<unknown>, fallback: string): Promise<void> => {
    try {
      await command();
    } catch (error) {
      setMessage(toErrorMessage(error, fallback));
    }
  }, []);

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
    quickAdd,
    setQuickAdd,
    handleQuickAdd,
  } = useWorkspaceQuickAddActions({
    activeTagId,
    quickAddRef,
    services,
    onSelectCreatedRecord: setSelectedId,
    syncWorkspace,
  });

  const {
    visibleReminder,
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
  const batchTargetIds = selectedIds.length > 0 ? selectedIds : visibleReminder?.recordIds ?? [];

  const {
    tagManagerOpen,
    setTagManagerOpen,
    tagEditor,
    setTagEditor,
    editingTag,
    resetTagEditor,
    openTagManager,
    startEditTag,
    handleCreateOrUpdateTag,
    handleDeleteTag,
  } = useWorkspaceTagManagerActions({
    activeTagId,
    draft,
    services,
    tags,
    onDraftChange: setDraft,
    onMessage: setMessage,
    onTagFilterChange,
    syncWorkspace,
  });

  const {
    notificationDebugOpen,
    setNotificationDebugOpen,
    notificationDebugFeed,
    handleExportNotificationDebug,
    handleClearNotificationDebugPanel,
  } = useWorkspaceNotificationDebugActions({
    notificationDebugEntries,
    runtimeNotifications: runtime?.notifications,
    onClearNotificationDebug,
    onMessage: setMessage,
  });

  useEffect(() => {
    if (runtimeNotice) {
      setMessage(runtimeNotice.text);
    }
  }, [runtimeNotice]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage((current) => (current === message ? null : current));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [message]);

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

  const {
    handleComplete,
    handleDelete,
    handleArchive,
    handleReschedule,
  } = useWorkspaceRecordActions({
    batchTargetIds,
    selectedId,
    selectedIds,
    services,
    clearSelection,
    setSelectedId,
    setSelectedIds,
    syncWorkspace,
  });

  return useWorkspaceCommands({
    activeTagId,
    activeView,
    currentTagName,
    quickAdd,
    keyword,
    status,
    priority,
    sortBy,
    tags,
    records,
    selectedId,
    selectedIds,
    selectedCount,
    visibleSelectedCount,
    highlightedRecordId,
    loading,
    message,
    runtimeNoticeTone: runtimeNotice?.tone,
    reminder: visibleReminder,
    activeReminderHits,
    activeReminderTargetIds,
    reminderExpanded,
    reminderSelectedIds,
    reminderSelectedOnly,
    visibleReminderSelectedCount,
    notificationDebugFeed,
    notificationDebugOpen,
    customReminderTimeOpen,
    tagManagerOpen,
    draftDirty,
    saving,
    selectedRecord,
    draft,
    contentMode,
    customReminderDueAt,
    customReminderValidation,
    editingTag,
    tagEditor,
    quickAddRef,
    searchRef,
    rowRefs,
    onRefresh: () => {
      void runCommandSafely(loadWorkspace, "刷新工作台失败");
    },
    quickAddOpen,
    quickAddSpotlight,
    onCloseQuickAdd: closeQuickAdd,
    onQuickAddChange: setQuickAdd,
    onQuickAddSubmit: () => {
      void runCommandSafely(handleQuickAdd, "新增记录失败");
    },
    onKeywordChange: setKeyword,
    onStatusChange: setStatus,
    onPriorityChange: setPriority,
    onTagFilterChange,
    onSortByChange: setSortBy,
    onToggleSelectAllVisible: toggleSelectAllVisible,
    onClearSelection: clearSelection,
    onBatchReschedule: (preset) => {
      void runCommandSafely(() => handleReschedule(preset), "批量改期失败");
    },
    onToggleNotificationDebug: () => setNotificationDebugOpen((current) => !current),
    onExportNotificationDebug: handleExportNotificationDebug,
    onClearNotificationDebug: () => {
      void runCommandSafely(handleClearNotificationDebugPanel, "清空通知调试日志失败");
    },
    onToggleReminderExpanded: () => setReminderExpanded((current) => !current),
    onToggleReminderSelectedOnly: () => setReminderSelectedOnly((current) => !current),
    onSnoozeReminder: (minutes) => {
      void runCommandSafely(() => handleSnoozeReminder(minutes), "延后提醒失败");
    },
    onReminderReschedule: (preset) => {
      void runCommandSafely(() => handleReminderReschedule(preset), "提醒命中改期失败");
    },
    onOpenCustomReminderReschedule: openCustomReminderReschedule,
    onToggleSelectAllReminderHits: toggleSelectAllReminderHits,
    onFocusRecordFromReminder: focusRecord,
    onToggleReminderSelection: toggleReminderSelection,
    onSelectRecord: setSelectedId,
    onToggleSelection: toggleSelection,
    onCompleteRecord: (recordId) => {
      void runCommandSafely(() => handleComplete(recordId), "完成任务失败");
    },
    onGenerateSummary: () => {
      void runCommandSafely(generateSummary, "生成 AI 摘要失败");
    },
    onPolishMarkdown: () => {
      void runCommandSafely(polishMarkdown, "AI 润色失败");
    },
    onOpenTagManager: openTagManager,
    onArchive: (recordId) => {
      void runCommandSafely(() => handleArchive(recordId), "归档记录失败");
    },
    onDelete: (recordId) => {
      void runCommandSafely(() => handleDelete(recordId), "删除记录失败");
    },
    onCloseInspector: closeInspector,
    onSave: () => {
      void runCommandSafely(saveDraft, "保存记录失败");
    },
    onDraftChange: setDraft,
    onToggleTag: toggleTag,
    onContentModeChange: setContentMode,
    onCloseTagManager: () => setTagManagerOpen(false),
    onResetTagEditor: resetTagEditor,
    onSelectTag: startEditTag,
    onTagEditorChange: setTagEditor,
    onSubmitTagEditor: () => {
      void runCommandSafely(handleCreateOrUpdateTag, "保存标签失败");
    },
    onDeleteTag: (tag: TagEntity) => {
      void runCommandSafely(() => handleDeleteTag(tag), "删除标签失败");
    },
    onCloseCustomReminder: () => setCustomReminderTimeOpen(false),
    onChangeCustomReminderDueAt: setCustomReminderDueAt,
    onApplyCustomReminderPreset: applyCustomReminderPreset,
    onSubmitCustomReminder: () => {
      void runCommandSafely(submitCustomReminderReschedule, "自定义改期失败");
    },
    onFocusQuickAdd: openQuickAdd,
  });
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return `${fallback}：${error.message}`;
  }

  return fallback;
}
