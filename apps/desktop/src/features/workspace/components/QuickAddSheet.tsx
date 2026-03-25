import { useEffect } from "react";

import type { QuickAddSheetContract } from "../contracts";

export type QuickAddSheetProps = QuickAddSheetContract;

export function QuickAddSheet({
  open,
  currentTagName,
  quickAdd,
  quickAddSpotlight,
  quickAddRef,
  onClose,
  onQuickAddChange,
  onQuickAddSubmit,
}: QuickAddSheetProps): JSX.Element | null {
  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      quickAddRef.current?.focus();
      quickAddRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, quickAddRef, quickAddSpotlight]);

  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel sheet-panel-compact quick-add-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-header">
          <div>
            <div className="panel-kicker">快速新增</div>
            <h3 className="panel-title panel-title-small">单行记录输入</h3>
            <div className="channel-panel-subtitle">
              默认写入到「{currentTagName}」。支持 `#标签`、`!P1`、`@明早 09:00` 这样的轻量记法。
            </div>
          </div>
          <button className="button-ghost" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="sheet-section">
          <div className={`quick-add-sheet-input-wrap${quickAddSpotlight ? " quick-add-sheet-input-wrap-active" : ""}`}>
            <input
              ref={quickAddRef}
              className={`input quick-add-sheet-input${quickAddSpotlight ? " input-spotlight" : ""}`}
              value={quickAdd}
              onChange={(event) => onQuickAddChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onQuickAddSubmit();
                }
              }}
              placeholder={`例如：明天 18:00 #工作 和设计评审`}
            />
            <button className="button-primary quick-add-sheet-submit" onClick={onQuickAddSubmit}>
              新增
            </button>
          </div>

          <div className="quick-add-sheet-meta">
            <div className="quick-add-hints">
              <span className="tag-chip">#标签</span>
              <span className="tag-chip">!P1</span>
              <span className="tag-chip">@明早 09:00</span>
            </div>
            <span>回车立即创建，支持连续录入。</span>
          </div>
        </div>
      </div>
    </div>
  );
}
