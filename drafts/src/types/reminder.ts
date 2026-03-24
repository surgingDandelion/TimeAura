import type { RecordEntity } from "./record";

export type ReminderKind = "due_24h" | "due_2h" | "overdue" | "overloaded";

export interface ReminderSummary {
  kind: ReminderKind;
  title: string;
  description: string;
  hitCount: number;
  p1Count: number;
  recordIds: string[];
}

export interface ReminderHit extends RecordEntity {
  reminderKind: ReminderKind;
}
