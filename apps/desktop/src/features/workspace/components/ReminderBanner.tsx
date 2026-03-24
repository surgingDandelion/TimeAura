import type { ReminderHit, ReminderSummary } from "@timeaura-core";

import type { ReminderPreset } from "../types";
import { formatDateLabel, formatReminderKind } from "../utils";

export interface ReminderBannerProps {
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
  onSnoozeReminder(minutes: number): void;
  onReschedule(preset: Extract<ReminderPreset, "plus_1_hour" | "today_18" | "tomorrow_09">): void;
  onOpenCustom(): void;
  onToggleSelectAll(): void;
  onFocusRecord(recordId: string): void;
  onToggleReminderSelection(recordId: string): void;
}

export function ReminderBanner({
  reminder,
  activeReminderHits,
  activeReminderTargetIds,
  reminderExpanded,
  reminderSelectedIds,
  reminderSelectedOnly,
  selectedId,
  visibleReminderSelectedCount,
  onToggleExpanded,
  onToggleSelectedOnly,
  onSnoozeReminder,
  onReschedule,
  onOpenCustom,
  onToggleSelectAll,
  onFocusRecord,
  onToggleReminderSelection,
}: ReminderBannerProps): JSX.Element | null {
  if (!reminder) {
    return null;
  }

  return (
    <>
      <div className="reminder-banner">
        <div className="reminder-main">
          <div className="reminder-title">{reminder.title}</div>
          <div className="reminder-text">{reminder.description}</div>
          <div className="reminder-meta">桌面提醒会持续扫描；点击系统通知会直接回到对应记录。</div>
          <div className="reminder-expand-row">
            <button className="button-mini" onClick={onToggleExpanded}>
              {reminderExpanded ? "收起命中任务" : `展开命中任务（${activeReminderHits.length}）`}
            </button>
            <span className="reminder-selection-meta">
              已选 {visibleReminderSelectedCount} / 命中 {activeReminderHits.length}
            </span>
            <button
              className={`button-mini${reminderSelectedOnly ? " button-mini-active" : ""}`}
              disabled={visibleReminderSelectedCount === 0}
              onClick={onToggleSelectedOnly}
            >
              仅改选中
            </button>
          </div>
        </div>
        <div className="reminder-actions">
          <button className="button-ghost" onClick={() => onSnoozeReminder(30)}>
            30 分钟后提醒
          </button>
          <button className="button-ghost" onClick={() => onReschedule("plus_1_hour")}>
            顺延 1 小时
          </button>
          <button className="button-ghost" onClick={() => onReschedule("today_18")}>
            改到今晚 18:00
          </button>
          <button className="button-ghost" onClick={onOpenCustom}>
            自定义时间
          </button>
          <button className="button-primary" onClick={() => onReschedule("tomorrow_09")}>
            改到明早 09:00
          </button>
        </div>
      </div>

      {reminderExpanded ? (
        <div className="reminder-hit-panel">
          <div className="list-toolbar reminder-hit-toolbar">
            <div className="list-toolbar-meta">
              <span>当前提醒类型：{formatReminderKind(reminder.kind)}</span>
              <span>{reminderSelectedOnly ? "当前快捷操作仅作用于已勾选命中项" : "当前快捷操作默认作用于全部命中项"}</span>
            </div>
            <div className="list-toolbar-actions">
              <button className="button-mini" onClick={onToggleSelectAll}>
                {visibleReminderSelectedCount === activeReminderTargetIds.length && activeReminderTargetIds.length > 0
                  ? "清空命中选择"
                  : "全选命中任务"}
              </button>
            </div>
          </div>

          <div className="reminder-hit-list">
            {activeReminderHits.map((hit) => (
              <button
                key={hit.id}
                className={`reminder-hit-row${selectedId === hit.id ? " reminder-hit-row-active" : ""}${reminderSelectedIds.includes(hit.id) ? " reminder-hit-row-selected" : ""}`}
                onClick={() => onFocusRecord(hit.id)}
              >
                <label
                  className="record-check"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reminderSelectedIds.includes(hit.id)}
                    onChange={() => onToggleReminderSelection(hit.id)}
                  />
                </label>
                <div className={`priority-pill priority-${hit.priority.toLowerCase()}`}>{hit.priority}</div>
                <div className="record-main">
                  <div className="record-topline">
                    <div className="record-title-wrap">
                      <div className="record-title-text">{hit.title}</div>
                    </div>
                    <div className="record-meta">{hit.status}</div>
                  </div>
                  <div className="record-bottomline">
                    <div className="record-tags">
                      <span className="tag-chip tag-chip-accent">{formatReminderKind(hit.reminderKind)}</span>
                    </div>
                    <div className="record-due">{formatDateLabel(hit.dueAt)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
