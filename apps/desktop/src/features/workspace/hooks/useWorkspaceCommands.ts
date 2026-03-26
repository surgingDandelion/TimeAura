import { useCallback, useState } from "react";
import type { MutableRefObject, RefObject } from "react";

import type { RecordEntity, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import type {
  ContentMode,
  NotificationDebugEntry,
  RecordDraft,
  TagEditorDraft,
  WorkspacePriorityFilter,
  WorkspaceSort,
  WorkspaceStatusFilter,
} from "../types";
import type {
  CustomReminderSheetContract,
  QuickAddSheetContract,
  ShortcutHelpSheetContract,
  TagManagerSheetContract,
  WorkspaceDetailInspectorContract,
  WorkspaceListPanelContract,
} from "../contracts";
import { WORKSPACE_SHORTCUT_ITEMS, useWorkspaceKeyboardShortcuts } from "./useWorkspaceKeyboardShortcuts";

interface UseWorkspaceCommandsOptions {
  activeTagId: string;
  activeView: "today" | "plan" | "all" | "done";
  currentTagName: string;
  quickAdd: string;
  keyword: string;
  status: WorkspaceStatusFilter;
  priority: WorkspacePriorityFilter;
  sortBy: WorkspaceSort;
  tags: TagEntity[];
  records: RecordEntity[];
  selectedId: string | null;
  selectedIds: string[];
  selectedCount: number;
  visibleSelectedCount: number;
  highlightedRecordId: string | null;
  loading: boolean;
  quickAddOpen: boolean;
  quickAddSpotlight: boolean;
  message: string | null;
  runtimeNoticeTone?: "info" | "warning";
  reminder: ReminderSummary | null;
  activeReminderHits: ReminderHit[];
  activeReminderTargetIds: string[];
  reminderExpanded: boolean;
  reminderSelectedIds: string[];
  reminderSelectedOnly: boolean;
  visibleReminderSelectedCount: number;
  notificationDebugFeed: NotificationDebugEntry[];
  notificationDebugOpen: boolean;
  customReminderTimeOpen: boolean;
  tagManagerOpen: boolean;
  draftDirty: boolean;
  saving: boolean;
  selectedRecord: RecordEntity | null;
  draft: RecordDraft | null;
  contentMode: ContentMode;
  customReminderDueAt: string;
  customReminderValidation: string[];
  editingTag: TagEntity | null;
  tagEditor: TagEditorDraft;
  quickAddRef: RefObject<HTMLInputElement>;
  searchRef: RefObject<HTMLInputElement>;
  rowRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onRefresh(): void;
  onCloseQuickAdd(): void;
  onQuickAddChange(value: string): void;
  onQuickAddSubmit(): void;
  onKeywordChange(value: string): void;
  onStatusChange(value: WorkspaceStatusFilter): void;
  onPriorityChange(value: WorkspacePriorityFilter): void;
  onTagFilterChange(tagId: string): void;
  onSortByChange(value: WorkspaceSort): void;
  onToggleSelectAllVisible(): void;
  onClearSelection(): void;
  onBatchReschedule(preset: "plus_1_hour" | "today_18" | "tomorrow_09"): void;
  onToggleNotificationDebug(): void;
  onExportNotificationDebug(): void;
  onClearNotificationDebug(): void;
  onToggleReminderExpanded(): void;
  onToggleReminderSelectedOnly(): void;
  onSnoozeReminder(minutes: number): void;
  onReminderReschedule(preset: "plus_1_hour" | "today_18" | "tomorrow_09"): void;
  onOpenCustomReminderReschedule(): void;
  onToggleSelectAllReminderHits(): void;
  onFocusRecordFromReminder(recordId: string): void;
  onToggleReminderSelection(recordId: string): void;
  onSelectRecord(recordId: string | null): void;
  onToggleSelection(recordId: string): void;
  onCompleteRecord(recordId: string): void;
  onGenerateSummary(): void;
  onPolishMarkdown(): void;
  onOpenTagManager(): void;
  onArchive(recordId: string): void;
  onDelete(recordId: string): void;
  onCloseInspector(): void;
  onSave(): void;
  onDraftChange(nextDraft: RecordDraft): void;
  onToggleTag(tagId: string): void;
  onContentModeChange(mode: ContentMode): void;
  onCloseTagManager(): void;
  onResetTagEditor(): void;
  onSelectTag(tag: TagEntity): void;
  onTagEditorChange(nextEditor: TagEditorDraft): void;
  onSubmitTagEditor(): void;
  onDeleteTag(tag: TagEntity): void;
  onCloseCustomReminder(): void;
  onChangeCustomReminderDueAt(value: string): void;
  onApplyCustomReminderPreset(preset: "plus_1_hour" | "today_18" | "tomorrow_09" | "friday_18" | "next_monday_09"): void;
  onSubmitCustomReminder(): void;
  onFocusQuickAdd(): void;
}

export function useWorkspaceCommands(options: UseWorkspaceCommandsOptions) {
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const focusSearchInput = useCallback(() => {
    options.searchRef.current?.focus();
    options.searchRef.current?.select();
  }, [options.searchRef]);

  const openShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(true);
  }, []);

  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false);
  }, []);

  useWorkspaceKeyboardShortcuts({
    records: options.records,
    selectedId: options.selectedId,
    selectedRecord: options.selectedRecord,
    draftDirty: options.draftDirty,
    saving: options.saving,
    customReminderTimeOpen: options.customReminderTimeOpen,
    tagManagerOpen: options.tagManagerOpen,
    shortcutHelpOpen,
    onFocusQuickAdd: options.onFocusQuickAdd,
    onFocusSearch: focusSearchInput,
    onSave: options.onSave,
    onCloseCustomReminder: options.onCloseCustomReminder,
    onCloseTagManager: options.onCloseTagManager,
    onCloseShortcutHelp: closeShortcutHelp,
    onCloseInspector: options.onCloseInspector,
    onSelectRecord: options.onSelectRecord,
    onToggleSelection: options.onToggleSelection,
    onOpenShortcutHelp: openShortcutHelp,
  });

  const listPanelProps: WorkspaceListPanelContract = {
      activeTagId: options.activeTagId,
      activeView: options.activeView,
      currentTagName: options.currentTagName,
      keyword: options.keyword,
      status: options.status,
      priority: options.priority,
      sortBy: options.sortBy,
      tags: options.tags,
      records: options.records,
      selectedId: options.selectedId,
      selectedIds: options.selectedIds,
      selectedCount: options.selectedCount,
      visibleSelectedCount: options.visibleSelectedCount,
      highlightedRecordId: options.highlightedRecordId,
      loading: options.loading,
      message: options.message,
      runtimeNoticeTone: options.runtimeNoticeTone,
      reminder: options.reminder,
      activeReminderHits: options.activeReminderHits,
      activeReminderTargetIds: options.activeReminderTargetIds,
      reminderExpanded: options.reminderExpanded,
      reminderSelectedIds: options.reminderSelectedIds,
      reminderSelectedOnly: options.reminderSelectedOnly,
      visibleReminderSelectedCount: options.visibleReminderSelectedCount,
      notificationDebugFeed: options.notificationDebugFeed,
      notificationDebugOpen: options.notificationDebugOpen,
      searchRef: options.searchRef,
      rowRefs: options.rowRefs,
      onRefresh: options.onRefresh,
      onKeywordChange: options.onKeywordChange,
      onStatusChange: options.onStatusChange,
      onPriorityChange: options.onPriorityChange,
      onTagFilterChange: options.onTagFilterChange,
      onSortByChange: options.onSortByChange,
      onOpenShortcutHelp: openShortcutHelp,
      onToggleSelectAllVisible: options.onToggleSelectAllVisible,
      onClearSelection: options.onClearSelection,
      onBatchReschedule: options.onBatchReschedule,
      onToggleNotificationDebug: options.onToggleNotificationDebug,
      onExportNotificationDebug: options.onExportNotificationDebug,
      onClearNotificationDebug: options.onClearNotificationDebug,
      onToggleReminderExpanded: options.onToggleReminderExpanded,
      onToggleReminderSelectedOnly: options.onToggleReminderSelectedOnly,
      onSnoozeReminder: options.onSnoozeReminder,
      onReminderReschedule: options.onReminderReschedule,
      onOpenCustomReminderReschedule: options.onOpenCustomReminderReschedule,
      onToggleSelectAllReminderHits: options.onToggleSelectAllReminderHits,
      onFocusRecordFromReminder: options.onFocusRecordFromReminder,
      onToggleReminderSelection: options.onToggleReminderSelection,
      onSelectRecord: (recordId: string) => options.onSelectRecord(recordId),
      onToggleSelection: options.onToggleSelection,
      onCompleteRecord: options.onCompleteRecord,
    };

  const quickAddSheetProps: QuickAddSheetContract = {
      open: options.quickAddOpen,
      currentTagName: options.currentTagName,
      quickAdd: options.quickAdd,
      quickAddSpotlight: options.quickAddSpotlight,
      quickAddRef: options.quickAddRef,
      onClose: options.onCloseQuickAdd,
      onQuickAddChange: options.onQuickAddChange,
      onQuickAddSubmit: options.onQuickAddSubmit,
    };

  const detailInspectorProps: WorkspaceDetailInspectorContract = {
      selectedRecord: options.selectedRecord,
      draft: options.draft,
      tags: options.tags,
      contentMode: options.contentMode,
      saving: options.saving,
      draftDirty: options.draftDirty,
      onGenerateSummary: options.onGenerateSummary,
      onPolishMarkdown: options.onPolishMarkdown,
      onOpenTagManager: options.onOpenTagManager,
      onArchive: options.onArchive,
      onDelete: options.onDelete,
      onClose: options.onCloseInspector,
      onSave: options.onSave,
      onDraftChange: options.onDraftChange,
      onToggleTag: options.onToggleTag,
      onContentModeChange: options.onContentModeChange,
    };

  const tagManagerSheetProps: TagManagerSheetContract = {
      open: options.tagManagerOpen,
      selectedRecord: options.selectedRecord,
      records: options.records,
      tags: options.tags,
      draft: options.draft,
      tagEditor: options.tagEditor,
      editingTag: options.editingTag,
      onClose: options.onCloseTagManager,
      onResetEditor: options.onResetTagEditor,
      onToggleTag: options.onToggleTag,
      onSelectTag: options.onSelectTag,
      onTagEditorChange: options.onTagEditorChange,
      onSubmit: options.onSubmitTagEditor,
      onDelete: options.onDeleteTag,
    };

  const customReminderSheetProps: CustomReminderSheetContract = {
      open: options.customReminderTimeOpen,
      reminderSelectedOnly: options.reminderSelectedOnly,
      reminderSelectedIds: options.reminderSelectedIds,
      activeReminderTargetIds: options.activeReminderTargetIds,
      customReminderDueAt: options.customReminderDueAt,
      customReminderValidation: options.customReminderValidation,
      onClose: options.onCloseCustomReminder,
      onChangeDueAt: options.onChangeCustomReminderDueAt,
      onApplyPreset: options.onApplyCustomReminderPreset,
      onSubmit: options.onSubmitCustomReminder,
    };

  const shortcutHelpProps: ShortcutHelpSheetContract = {
      open: shortcutHelpOpen,
      shortcuts: WORKSPACE_SHORTCUT_ITEMS,
      onClose: closeShortcutHelp,
  };

  return {
    listPanelProps,
    quickAddSheetProps,
    detailInspectorProps,
    tagManagerSheetProps,
    customReminderSheetProps,
    shortcutHelpProps,
  };
}
