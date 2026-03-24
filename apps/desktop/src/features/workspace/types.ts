import type { RecordPriority, RecordStatus } from "@timeaura-core";

export type WorkspaceSystemView = "today" | "plan" | "all" | "done";
export type WorkspaceStatusFilter = "all" | "todo" | "done";
export type WorkspaceSort = "smart" | "due" | "priority" | "updated";
export type ContentMode = "edit" | "preview";
export type ReminderPreset =
  | "plus_1_hour"
  | "today_18"
  | "tomorrow_09"
  | "friday_18"
  | "next_monday_09";

export interface WorkspaceFocusTarget {
  recordId: string;
  nonce: number;
}

export interface WorkspaceQuickAddTarget {
  nonce: number;
}

export interface WorkspaceRuntimeNotice {
  text: string;
  tone: "info" | "warning";
  nonce: number;
}

export interface NotificationDebugEntry {
  id: string;
  at: string;
  source: "driver" | "action";
  level: "info" | "warning" | "error";
  title: string;
  detail: string;
}

export interface NotificationDebugEventDetail {
  level?: "info" | "warning" | "error";
  title?: string;
  detail?: string;
}

export interface NotificationActionEventPayload {
  actionId?: string;
  extra?: Record<string, unknown>;
}

export interface WorkspaceShortcutItem {
  id: string;
  keys: string;
  description: string;
}

export interface RecordDraft {
  title: string;
  status: RecordStatus;
  priority: RecordPriority;
  dueAt: string;
  plannedAt: string;
  contentMarkdown: string;
  tags: string[];
  isPinned: boolean;
}

export interface TagEditorDraft {
  id: string | null;
  name: string;
  color: string;
}
