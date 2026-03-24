import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TagEntity } from "@timeaura-core";

import { useAppServices } from "../../../app/providers/AppServicesProvider";
import { useWorkspaceNotificationDebugActions } from "./useWorkspaceNotificationDebugActions";
import { WORKSPACE_SHORTCUT_ITEMS, useWorkspaceKeyboardShortcuts } from "./useWorkspaceKeyboardShortcuts";
import { useWorkspaceData } from "./useWorkspaceData";
import { useWorkspaceQuickAddActions } from "./useWorkspaceQuickAddActions";
import { useWorkspaceRecordDraft } from "./useWorkspaceRecordDraft";
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
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  const openShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false);
  }, []);

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
