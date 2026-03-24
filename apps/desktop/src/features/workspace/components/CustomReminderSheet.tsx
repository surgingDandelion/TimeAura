export interface CustomReminderSheetProps {
  open: boolean;
  reminderSelectedOnly: boolean;
  reminderSelectedIds: string[];
  activeReminderTargetIds: string[];
  customReminderDueAt: string;
  customReminderValidation: string[];
  onClose(): void;
  onChangeDueAt(value: string): void;
  onApplyPreset(preset: "plus_1_hour" | "today_18" | "tomorrow_09" | "friday_18" | "next_monday_09"): void;
  onSubmit(): void;
}

export function CustomReminderSheet({
  open,
  reminderSelectedOnly,
  reminderSelectedIds,
  activeReminderTargetIds,
  customReminderDueAt,
  customReminderValidation,
  onClose,
  onChangeDueAt,
  onApplyPreset,
  onSubmit,
}: CustomReminderSheetProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel sheet-panel-compact"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-header">
          <div>
            <div className="panel-kicker">自定义改期</div>
            <h3 className="panel-title panel-title-small">提醒命中时间调整</h3>
            <div className="channel-panel-subtitle">
              {reminderSelectedOnly && reminderSelectedIds.length > 0
                ? `仅调整已勾选的 ${reminderSelectedIds.length} 条命中任务`
                : `默认调整当前提醒命中的 ${activeReminderTargetIds.length} 条任务`}
            </div>
          </div>
          <button className="button-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="sheet-section">
          <div className="sheet-form">
            <label className="field">
              <span className="field-label">新的截止时间</span>
              <input
                className="input"
                type="datetime-local"
                value={customReminderDueAt}
                onChange={(event) => onChangeDueAt(event.target.value)}
              />
            </label>
            <div className="quick-chip-row">
              <button className="button-mini" onClick={() => onApplyPreset("plus_1_hour")}>
                1 小时后
              </button>
              <button className="button-mini" onClick={() => onApplyPreset("today_18")}>
                今晚 18:00
              </button>
              <button className="button-mini" onClick={() => onApplyPreset("tomorrow_09")}>
                明早 09:00
              </button>
              <button className="button-mini" onClick={() => onApplyPreset("friday_18")}>
                本周五 18:00
              </button>
              <button className="button-mini" onClick={() => onApplyPreset("next_monday_09")}>
                下周一 09:00
              </button>
            </div>
            {customReminderValidation.length > 0 ? (
              <div className="inline-message inline-message-warning">
                <div className="validation-title">保存前请先处理以下问题：</div>
                <ul className="validation-list">
                  {customReminderValidation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="sheet-actions">
              <button className="button-primary" disabled={customReminderValidation.length > 0} onClick={onSubmit}>
                保存改期
              </button>
              <button className="button-ghost" onClick={onClose}>
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
