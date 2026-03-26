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
  }, [open, quickAddRef]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="quick-add-layer" onClick={onClose}>
      <div
        className={`quick-add-modal${quickAddSpotlight ? " quick-add-modal-spotlight" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
            return;
          }

          event.stopPropagation();
        }}
      >
        <div className="quick-add-modal-header">
          <div className="quick-add-prefix">快速录入</div>
          <div className="quick-add-tip">支持 `#标签`、`!P1`、`@明天 18:00`，回车立即创建并保留焦点。</div>
          <button className="quick-add-close" onClick={onClose} aria-label="关闭快速新增">
            ×
          </button>
        </div>

        <div className="quick-add-modal-row">
          <input
            ref={quickAddRef}
            className="quick-add-input"
            value={quickAdd}
            onChange={(event) => onQuickAddChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onQuickAddSubmit();
              }
            }}
            placeholder="例如：明天下午 3 点 #工作 !P1 和设计评审"
          />
          <button className="button-primary quick-add-submit-btn" onClick={onQuickAddSubmit}>
            新增
          </button>
        </div>

        <div className="quick-add-meta">
          <span>默认写入「{currentTagName}」，适合连续补记。</span>
          <span>回车立即创建，创建后保留输入焦点。</span>
        </div>
      </div>
    </div>
  );
}
