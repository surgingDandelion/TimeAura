import { useEffect } from "react";

import type { QuickAddSheetContract } from "../contracts";

export type QuickAddSheetProps = QuickAddSheetContract;

export function QuickAddSheet({
  open,
  currentTagName,
  quickAdd,
  quickAddTagId,
  tags,
  quickAddSpotlight,
  quickAddRef,
  onClose,
  onQuickAddChange,
  onQuickAddTagChange,
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
          <div className="quick-add-tip">输入标题并直接选择列表，回车立即创建。</div>
          <button className="quick-add-close" onClick={onClose} aria-label="关闭快速新增">
            ×
          </button>
        </div>

        <div className="quick-add-modal-row">
          <select
            className="select quick-add-select"
            value={quickAddTagId}
            onChange={(event) => onQuickAddTagChange(event.target.value)}
            aria-label="选择列表"
          >
            {tags.length > 0 ? tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            )) : <option value="">暂未创建列表</option>}
          </select>
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
            placeholder="例如：明天下午 3 点和设计评审"
          />
          <button className="button-primary quick-add-submit-btn" onClick={onQuickAddSubmit}>
            新增
          </button>
        </div>

        <div className="quick-add-meta">
          <span>当前写入「{tags.find((tag) => tag.id === quickAddTagId)?.name ?? currentTagName}」，回车后继续保持输入焦点。</span>
          <span>输入标题即可，列表改为直接选择，不再依赖额外管理步骤。</span>
        </div>
      </div>
    </div>
  );
}
