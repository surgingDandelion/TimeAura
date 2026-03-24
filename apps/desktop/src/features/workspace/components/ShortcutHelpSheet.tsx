import type { WorkspaceShortcutItem } from "../types";

export interface ShortcutHelpSheetProps {
  open: boolean;
  shortcuts: WorkspaceShortcutItem[];
  onClose(): void;
}

export function ShortcutHelpSheet({
  open,
  shortcuts,
  onClose,
}: ShortcutHelpSheetProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel sheet-panel-shortcuts"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-header">
          <div>
            <div className="panel-kicker">快捷键帮助</div>
            <h3 className="panel-title panel-title-small">工作台键盘操作</h3>
            <div className="channel-panel-subtitle">
              面向桌面应用的高频操作入口。支持在列表导航、快速新增、保存和调试之间快速切换。
            </div>
          </div>
          <button className="button-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="shortcut-sheet-list">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.id} className="shortcut-sheet-row">
              <div className="shortcut-sheet-keys">{shortcut.keys}</div>
              <div className="shortcut-sheet-copy">{shortcut.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
