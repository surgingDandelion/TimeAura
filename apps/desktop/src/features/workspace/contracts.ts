import type { MutableRefObject, RefObject } from "react";

import type { RecordEntity, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import type {
  ContentMode,
  NotificationDebugEntry,
  RecordDraft,
  ReminderPreset,
  TagEditorDraft,
  WorkspacePriorityFilter,
  WorkspaceShortcutItem,
  WorkspaceSort,
  WorkspaceStatusFilter,
  WorkspaceSystemView,
} from "./types";

export type WorkspacePrimaryReschedulePreset = Extract<
  ReminderPreset,
  "plus_1_hour" | "today_18" | "tomorrow_09"
>;
export type WorkspaceCommandStatus = "success" | "cancelled" | "noop";

export type StringHandler = (value: string) => void;
export type RecordIdHandler = (recordId: string) => void;
export type NullableRecordIdHandler = (recordId: string | null) => void;
export type TagIdHandler = (tagId: string) => void;
export type TagEntityHandler = (tag: TagEntity) => void;
export type MinutesHandler = (minutes: number) => void;
export type WorkspacePrimaryPresetHandler = (preset: WorkspacePrimaryReschedulePreset) => void;
export type WorkspaceReminderPresetHandler = (preset: ReminderPreset) => void;
export type RecordDraftHandler = (nextDraft: RecordDraft) => void;
export type TagEditorDraftHandler = (nextEditor: TagEditorDraft) => void;
export type ContentModeHandler = (mode: ContentMode) => void;

export interface WorkspaceCommandResult<TData = void> {
  status: WorkspaceCommandStatus;
  message?: string;
  data?: TData;
}

export interface NotificationDebugPanelContract {
  entries: NotificationDebugEntry[];
  open: boolean;
  onToggleOpen(): void;
  onExport(): void;
  onClear(): void;
}

export interface ShortcutHelpSheetContract {
  open: boolean;
  shortcuts: WorkspaceShortcutItem[];
  onClose(): void;
}

export interface QuickAddSheetContract {
  open: boolean;
  currentTagName: string;
  quickAdd: string;
  quickAddSpotlight: boolean;
  quickAddRef: RefObject<HTMLInputElement>;
  onClose(): void;
  onQuickAddChange: StringHandler;
  onQuickAddSubmit(): void;
}

export interface ReminderBannerContract {
  reminder: ReminderSummary | null;
  activeReminderHits: ReminderHit[];
  activeReminderTargetIds: string[];
  reminderExpanded: boolean;
  reminderSelectedIds: string[];
  reminderSelectedOnly: boolean;
  selectedId: string | null;
  visibleReminderSelectedCount: number;
  onToggleExpanded(): void;
  onToggleSelectedOnly(): void;
  onSnoozeReminder: MinutesHandler;
  onReschedule: WorkspacePrimaryPresetHandler;
  onOpenCustom(): void;
  onToggleSelectAll(): void;
  onFocusRecord: RecordIdHandler;
  onToggleReminderSelection: RecordIdHandler;
}

export interface WorkspaceListPanelContract {
  activeTagId: string;
  activeView: WorkspaceSystemView;
  currentTagName: string;
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
  searchRef: RefObject<HTMLInputElement>;
  rowRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onRefresh(): void;
  onKeywordChange: StringHandler;
  onStatusChange(value: WorkspaceStatusFilter): void;
  onPriorityChange(value: WorkspacePriorityFilter): void;
  onTagFilterChange: TagIdHandler;
  onSortByChange(value: WorkspaceSort): void;
  onOpenShortcutHelp(): void;
  onToggleSelectAllVisible(): void;
  onClearSelection(): void;
  onBatchReschedule: WorkspacePrimaryPresetHandler;
  onToggleNotificationDebug(): void;
  onExportNotificationDebug(): void;
  onClearNotificationDebug(): void;
  onToggleReminderExpanded(): void;
  onToggleReminderSelectedOnly(): void;
  onSnoozeReminder: MinutesHandler;
  onReminderReschedule: WorkspacePrimaryPresetHandler;
  onOpenCustomReminderReschedule(): void;
  onToggleSelectAllReminderHits(): void;
  onFocusRecordFromReminder: RecordIdHandler;
  onToggleReminderSelection: RecordIdHandler;
  onSelectRecord: RecordIdHandler;
  onToggleSelection: RecordIdHandler;
  onCompleteRecord: RecordIdHandler;
  onDeleteRecord: RecordIdHandler;
}

export interface WorkspaceDetailInspectorContract {
  selectedRecord: RecordEntity | null;
  draft: RecordDraft | null;
  tags: TagEntity[];
  contentMode: ContentMode;
  saving: boolean;
  draftDirty: boolean;
  onGenerateSummary(): void;
  onPolishMarkdown(): void;
  onOpenTagManager(): void;
  onArchive: RecordIdHandler;
  onClose(): void;
  onSave(): void;
  onDraftChange: RecordDraftHandler;
  onToggleTag: TagIdHandler;
  onContentModeChange: ContentModeHandler;
}

export interface TagManagerSheetContract {
  open: boolean;
  selectedRecord: RecordEntity | null;
  records: RecordEntity[];
  tags: TagEntity[];
  draft: RecordDraft | null;
  tagEditor: TagEditorDraft;
  editingTag: TagEntity | null;
  onClose(): void;
  onResetEditor(): void;
  onToggleTag: TagIdHandler;
  onSelectTag: TagEntityHandler;
  onTagEditorChange: TagEditorDraftHandler;
  onSubmit(): void;
  onDelete: TagEntityHandler;
}

export interface CustomReminderSheetContract {
  open: boolean;
  reminderSelectedOnly: boolean;
  reminderSelectedIds: string[];
  activeReminderTargetIds: string[];
  customReminderDueAt: string;
  customReminderValidation: string[];
  onClose(): void;
  onChangeDueAt: StringHandler;
  onApplyPreset: WorkspaceReminderPresetHandler;
  onSubmit(): void;
}
