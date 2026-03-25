import type {
  RecordEntity,
  RecordListQuery,
  RecordPriority,
  ReportTemplateType,
  RescheduleStrategy,
} from "../types/index";

const priorityRank: Record<RecordPriority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

let idSeed = 1000;

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function nowWithOffset(date = new Date()): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return `${local.toISOString().slice(0, 19)}${sign}${hours}:${minutes}`;
}

export function createMockId(prefix: string): string {
  const cryptoObject = globalThis.crypto;

  if (cryptoObject?.randomUUID) {
    return `${prefix}_${cryptoObject.randomUUID().replace(/-/g, "")}`;
  }

  idSeed += 1;
  return `${prefix}_${Date.now().toString(36)}_${String(idSeed).padStart(4, "0")}`;
}

export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ensureUnique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function comparePriority(left: RecordPriority, right: RecordPriority): number {
  return priorityRank[left] - priorityRank[right];
}

export function compareNullableDateAsc(left: string | null, right: string | null): number {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return new Date(left).getTime() - new Date(right).getTime();
}

export function resolveRescheduleAt(strategy: RescheduleStrategy, baseIso: string): string {
  const base = new Date(baseIso);

  switch (strategy.preset) {
    case "plus_1_hour":
      return nowWithOffset(new Date(base.getTime() + 60 * 60 * 1000));

    case "today_18":
      return setClock(base, 18, 0, 0);

    case "tomorrow_09": {
      const target = new Date(base);
      target.setDate(target.getDate() + 1);
      return setClock(target, 9, 0, 0);
    }

    case "friday_18": {
      const target = new Date(base);
      const day = target.getDay();
      const distance = ((5 - day) % 7 + 7) % 7;
      target.setDate(target.getDate() + distance);
      return setClock(target, 18, 0, 0);
    }

    case "custom":
      if (!strategy.customAt) {
        throw new Error("customAt is required when preset is custom");
      }
      return strategy.customAt;

    default:
      return baseIso;
  }
}

function setClock(date: Date, hour: number, minute: number, second: number): string {
  const target = new Date(date);
  target.setHours(hour, minute, second, 0);
  return nowWithOffset(target);
}

export function isDoneRecord(record: RecordEntity): boolean {
  return record.status === "已完成" || record.status === "已归档";
}

export function isSameDay(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false;
  }

  return left.slice(0, 10) === right.slice(0, 10);
}

export function matchesSystemView(
  record: RecordEntity,
  view: RecordListQuery["view"],
  nowIso: string,
): boolean {
  switch (view) {
    case "today":
      return matchesTodayView(record, nowIso);

    case "plan":
      return matchesPlanView(record, nowIso);

    case "done":
      return isDoneRecord(record);

    case "all":
    default:
      return true;
  }
}

export function matchesTodayView(record: RecordEntity, nowIso: string): boolean {
  if (isDoneRecord(record)) {
    return false;
  }

  if (isOverdue(record, nowIso)) {
    return true;
  }

  return isSameDay(record.dueAt, nowIso) || isSameDay(record.plannedAt, nowIso);
}

export function matchesPlanView(record: RecordEntity, nowIso: string): boolean {
  if (isDoneRecord(record)) {
    return false;
  }

  const today = nowIso.slice(0, 10);
  const dueDay = record.dueAt?.slice(0, 10) ?? null;
  const plannedDay = record.plannedAt?.slice(0, 10) ?? null;

  return (dueDay !== null && dueDay > today) || (plannedDay !== null && plannedDay > today);
}

export function sortRecords(
  records: RecordEntity[],
  query: RecordListQuery,
  nowIso: string,
): RecordEntity[] {
  const items = [...records];

  items.sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    switch (query.sortBy) {
      case "due":
        return compareNullableDateAsc(left.dueAt, right.dueAt) || comparePriority(left.priority, right.priority);

      case "priority":
        return comparePriority(left.priority, right.priority) || compareNullableDateAsc(left.dueAt, right.dueAt);

      case "completed":
        return compareNullableDateAsc(right.completedAt, left.completedAt);

      case "updated":
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();

      case "smart":
      default:
        return compareSmart(left, right, nowIso);
    }
  });

  return items;
}

function compareSmart(left: RecordEntity, right: RecordEntity, nowIso: string): number {
  const leftOverdue = isOverdue(left, nowIso);
  const rightOverdue = isOverdue(right, nowIso);

  if (leftOverdue !== rightOverdue) {
    return leftOverdue ? -1 : 1;
  }

  const leftDone = isDoneRecord(left);
  const rightDone = isDoneRecord(right);

  if (leftDone !== rightDone) {
    return leftDone ? 1 : -1;
  }

  return (
    comparePriority(left.priority, right.priority) ||
    compareNullableDateAsc(left.dueAt, right.dueAt) ||
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

export function isOverdue(record: RecordEntity, nowIso: string): boolean {
  if (!record.dueAt || isDoneRecord(record)) {
    return false;
  }

  return new Date(record.dueAt).getTime() < new Date(nowIso).getTime();
}

export function isDueWithinHours(record: RecordEntity, nowIso: string, hours: number): boolean {
  if (!record.dueAt || isDoneRecord(record)) {
    return false;
  }

  const dueTime = new Date(record.dueAt).getTime();
  const nowTime = new Date(nowIso).getTime();
  const delta = dueTime - nowTime;

  return delta >= 0 && delta <= hours * 60 * 60 * 1000;
}

export function reportTitleFromRange(type: ReportTemplateType, startIso: string, endIso: string): string {
  const label = type === "monthly" ? "月报" : type === "weekly" ? "周报" : "报告";
  return `${label}（${startIso.slice(0, 10)} - ${endIso.slice(0, 10)}）`;
}
