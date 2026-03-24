import type { ReminderHit, ReminderSummary } from "../types/index";

export interface ReminderService {
  getReminderSummary(now: string): Promise<ReminderSummary | null>;
  listReminderHits(now: string): Promise<ReminderHit[]>;
  snoozeReminder(recordIds: string[], minutes: number): Promise<void>;
}
