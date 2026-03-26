import type { ReminderBannerContract } from "../contracts";
import { formatDateLabel, formatReminderKind } from "../utils";

export type ReminderBannerProps = ReminderBannerContract;

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
    <div className={`reminder-shell${reminderExpanded ? " reminder-shell-expanded" : ""}`}>
      <div className="reminder-banner">
        <div className="reminder-bar-main">
          <div className="warning-badge">时间提醒</div>
          <div className="reminder-bar-copy">
            <div className="reminder-title">{reminder.title}</div>
            <div className="reminder-text">{reminder.description}</div>
          </div>
        </div>

        <div className="reminder-bar-actions">
          <button className="button-mini reminder-btn-muted" onClick={() => onReschedule("plus_1_hour")}>
            顺延 1 小时
          </button>
          <button className="button-mini reminder-btn-strong" onClick={() => onReschedule("tomorrow_09")}>
            改到明早
          </button>
          <button className="button-mini reminder-btn-quiet" onClick={onToggleExpanded}>
            {reminderExpanded ? "收起" : `展开 ${activeReminderHits.length}`}
          </button>
        </div>
      </div>

      {reminderExpanded ? (
        <div className="reminder-flyout">
          <div className="reminder-flyout-head">
            <div className="reminder-flyout-meta">
              <strong>已选 {visibleReminderSelectedCount} / 命中 {activeReminderHits.length}</strong>
              <span>{reminderSelectedOnly ? "当前快捷操作仅作用于已勾选命中项" : "当前快捷操作默认作用于全部命中项"}</span>
            </div>
            <div className="reminder-flyout-actions">
              <button className="text-btn" onClick={onToggleSelectAll}>
                {visibleReminderSelectedCount === activeReminderTargetIds.length && activeReminderTargetIds.length > 0
                  ? "清空"
                  : "全选"}
              </button>
              <button className="text-btn" onClick={() => onSnoozeReminder(30)}>
                稍后提醒
              </button>
              <button className="text-btn" onClick={onToggleExpanded}>
                关闭
              </button>
            </div>
          </div>

          <div className="reminder-hit-list reminder-hit-list-flyout">
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

          <div className="reminder-flyout-foot">
            <button
              className={`button-mini reminder-btn-strong${reminderSelectedOnly ? " button-mini-active" : ""}`}
              disabled={visibleReminderSelectedCount === 0}
              onClick={onToggleSelectedOnly}
            >
              仅改选中
            </button>
            <button className="button-mini reminder-btn-muted" onClick={() => onReschedule("today_18")}>
              改到今晚 18:00
            </button>
            <button className="button-mini reminder-btn-quiet" onClick={() => onReschedule("plus_1_hour")}>
              全部顺延
            </button>
            <button className="button-mini reminder-btn-quiet" onClick={onOpenCustom}>
              自定义时间
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
