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
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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
    onToggleSelectAllVisible: toggleSelectAllVisible,
    onClearSelection: clearSelection,
    onBatchReschedule: (preset) => {
      void handleReschedule(preset);
    },
    onToggleNotificationDebug: () => setNotificationDebugOpen((current) => !current),
    onExportNotificationDebug: handleExportNotificationDebug,
    onClearNotificationDebug: () => {
      void handleClearNotificationDebugPanel();
    },
    onToggleReminderExpanded: () => setReminderExpanded((current) => !current),
    onToggleReminderSelectedOnly: () => setReminderSelectedOnly((current) => !current),
    onSnoozeReminder: (minutes) => {
      void handleSnoozeReminder(minutes);
    },
    onReminderReschedule: (preset) => {
      void handleReminderReschedule(preset);
    },
    onOpenCustomReminderReschedule: openCustomReminderReschedule,
    onToggleSelectAllReminderHits: toggleSelectAllReminderHits,
    onFocusRecordFromReminder: focusRecord,
    onToggleReminderSelection: toggleReminderSelection,
    onSelectRecord: setSelectedId,
    onToggleSelection: toggleSelection,
    onCompleteRecord: (recordId) => {
      void handleComplete(recordId);
    },
    onGenerateSummary: () => {
      void generateSummary();
    },
    onPolishMarkdown: () => {
      void polishMarkdown();
    },
    onOpenTagManager: openTagManager,
    onArchive: (recordId) => {
      void handleArchive(recordId);
    },
    onDelete: (recordId) => {
      void handleDelete(recordId);
    },
    onCloseInspector: closeInspector,
    onSave: () => {
      void saveDraft();
    },
    onDraftChange: setDraft,
    onToggleTag: toggleTag,
    onContentModeChange: setContentMode,
    onCloseTagManager: () => setTagManagerOpen(false),
    onResetTagEditor: resetTagEditor,
    onSelectTag: startEditTag,
    onTagEditorChange: setTagEditor,
    onSubmitTagEditor: () => {
      void handleCreateOrUpdateTag();
    },
    onDeleteTag: (tag: TagEntity) => {
      void handleDeleteTag(tag);
    },
    onCloseCustomReminder: () => setCustomReminderTimeOpen(false),
    onChangeCustomReminderDueAt: setCustomReminderDueAt,
    onApplyCustomReminderPreset: applyCustomReminderPreset,
    onSubmitCustomReminder: () => {
      void submitCustomReminderReschedule();
    },
    onFocusQuickAdd: triggerQuickAddSpotlight,
  });
}
