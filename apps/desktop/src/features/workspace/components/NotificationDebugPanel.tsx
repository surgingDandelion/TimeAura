import type { NotificationDebugEntry } from "../types";
import { formatDateTime } from "../utils";

export interface NotificationDebugPanelProps {
  entries: NotificationDebugEntry[];
  open: boolean;
  onToggleOpen(): void;
  onExport(): void;
  onClear(): void;
}

export function NotificationDebugPanel({
  entries,
  open,
  onToggleOpen,
  onExport,
  onClear,
}: NotificationDebugPanelProps): JSX.Element {
  return (
    <div className="debug-panel">
      <div className="list-toolbar debug-panel-toolbar">
        <div className="list-toolbar-meta">
          <span>通知调试面板</span>
          <span>{entries.length} 条最近事件</span>
        </div>
        <div className="list-toolbar-actions">
          <button className="button-mini" disabled={entries.length === 0} onClick={onExport}>
            导出
          </button>
          <button className="button-mini" disabled={entries.length === 0} onClick={onClear}>
            清空
          </button>
          <button className="button-mini" onClick={onToggleOpen}>
            {open ? "收起调试" : "展开调试"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="debug-log-list">
          {entries.length === 0 ? (
            <div className="debug-log-empty">当前还没有通知事件，后续发送、回退、点击动作都会显示在这里。</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className={`debug-log-row debug-log-row-${entry.level}`}>
                <div className="debug-log-head">
                  <span className="debug-log-title">{entry.title}</span>
                  <span className="debug-log-meta">
                    {entry.source === "action" ? "动作" : "驱动"} · {formatDateTime(entry.at)}
                  </span>
                </div>
                <div className="debug-log-detail">{entry.detail}</div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
