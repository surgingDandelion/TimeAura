import type { ReminderService } from "../reminderService";

import type { RecordRepository } from "../../repositories/index";
import type { ReminderHit, ReminderKind, ReminderSummary } from "../../types/index";

import { isDueWithinHours, isOverdue, nowWithOffset } from "../../mock/index";

export class DefaultReminderService implements ReminderService {
  constructor(private readonly recordRepository: RecordRepository, private readonly now: () => string) {}

  async getReminderSummary(now = this.now()): Promise<ReminderSummary | null> {
    const hits = await this.listReminderHits(now);

    if (hits.length === 0) {
      return null;
    }

    const prioritizedKinds: ReminderKind[] = ["overdue", "due_2h", "due_24h", "overloaded"];
    const kind = prioritizedKinds.find((item) => hits.some((hit) => hit.reminderKind === item)) ?? "due_24h";
    const targetHits = hits.filter((hit) => hit.reminderKind === kind);

    return {
      kind,
      title: this.getTitle(kind, targetHits.length),
      description: this.getDescription(kind),
      hitCount: targetHits.length,
      p1Count: targetHits.filter((hit) => hit.priority === "P1").length,
      recordIds: targetHits.map((hit) => hit.id),
    };
  }

  async listReminderHits(now = this.now()): Promise<ReminderHit[]> {
    const records = await this.recordRepository.list({ status: "todo" });
    const items: ReminderHit[] = [];
    const backlog = records.items.filter((record) => !record.deletedAt && record.dueAt);

    for (const record of backlog) {
      if (isOverdue(record, now)) {
        items.push({ ...record, reminderKind: "overdue" });
        continue;
      }

      if (isDueWithinHours(record, now, 2)) {
        items.push({ ...record, reminderKind: "due_2h" });
        continue;
      }

      if (isDueWithinHours(record, now, 24)) {
        items.push({ ...record, reminderKind: "due_24h" });
      }
    }

    const sameDayBacklog = backlog.filter((record) => record.dueAt?.slice(0, 10) === now.slice(0, 10));
    if (sameDayBacklog.length >= 5) {
      items.push(
        ...sameDayBacklog.map((record) => ({
          ...record,
          reminderKind: "overloaded" as const,
        })),
      );
    }

    return items;
  }

  async snoozeReminder(recordIds: string[], minutes: number): Promise<void> {
    const nextDueAt = nowWithOffset(new Date(new Date(this.now()).getTime() + minutes * 60 * 1000));
    const records = await this.recordRepository.listByIds(recordIds);

    for (const record of records) {
      await this.recordRepository.update(record.id, { dueAt: nextDueAt });
    }
  }

  private getTitle(kind: ReminderKind, count: number): string {
    const labels: Record<ReminderKind, string> = {
      overdue: "已有任务逾期",
      due_2h: "有任务即将到点",
      due_24h: "今天内有任务即将截止",
      overloaded: "任务有些堆积了",
    };

    return `${labels[kind]}（${count}）`;
  }

  private getDescription(kind: ReminderKind): string {
    const descriptions: Record<ReminderKind, string> = {
      overdue: "建议优先处理逾期任务，或集中批量改期。",
      due_2h: "建议快速确认优先级，避免关键事项临近截止。",
      due_24h: "建议提前清理今天内的任务，减少晚间堆积。",
      overloaded: "同一天内任务较多，适合使用一键改期重新分配时间。",
    };

    return descriptions[kind];
  }
}
