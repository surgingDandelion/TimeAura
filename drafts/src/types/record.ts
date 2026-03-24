export const RECORD_KINDS = ["task", "note", "report"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export const RECORD_STATUSES = ["未开始", "进行中", "已完成", "已归档"] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export const RECORD_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type RecordPriority = (typeof RECORD_PRIORITIES)[number];

export interface RecordEntity {
  id: string;
  recordKind: RecordKind;
  title: string;
  contentMarkdown: string;
  contentPlain: string;
  status: RecordStatus;
  priority: RecordPriority;
  tags: string[];
  dueAt: string | null;
  plannedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  sourceReportHistoryId: string | null;
  aiSummary: string | null;
  isPinned: boolean;
}

export interface CreateRecordInput {
  title: string;
  recordKind?: RecordKind;
  contentMarkdown?: string;
  status?: RecordStatus;
  priority?: RecordPriority;
  tags?: string[];
  dueAt?: string | null;
  plannedAt?: string | null;
}

export interface UpdateRecordPatch {
  title?: string;
  contentMarkdown?: string;
  status?: RecordStatus;
  priority?: RecordPriority;
  tags?: string[];
  dueAt?: string | null;
  plannedAt?: string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  aiSummary?: string | null;
  isPinned?: boolean;
}

export interface RecordListQuery {
  view?: "today" | "plan" | "all" | "done";
  keyword?: string;
  status?: "all" | "todo" | "done";
  priority?: "all" | RecordPriority;
  tagId?: "all" | string;
  sortBy?: "smart" | "due" | "priority" | "updated" | "completed";
  includeDeleted?: boolean;
}

export type ReschedulePreset =
  | "plus_1_hour"
  | "today_18"
  | "tomorrow_09"
  | "friday_18"
  | "custom";

export interface RescheduleStrategy {
  preset: ReschedulePreset;
  customAt?: string;
}
