import type { RecordEntity, RecordPriority, RecordStatus, TagEntity } from "@timeaura-core";

import type { ContentMode, RecordDraft } from "../types";
import { formatDateTime, renderMarkdownPreview, resolvePresetDate, toInputValue } from "../utils";

interface WorkspaceDetailInspectorProps {
  selectedRecord: RecordEntity | null;
  draft: RecordDraft | null;
  tags: TagEntity[];
  contentMode: ContentMode;
  saving: boolean;
  draftDirty: boolean;
  onGenerateSummary(): void;
  onPolishMarkdown(): void;
  onOpenTagManager(): void;
  onArchive(recordId: string): void;
  onDelete(recordId: string): void;
  onClose(): void;
  onSave(): void;
  onDraftChange(nextDraft: RecordDraft): void;
  onToggleTag(tagId: string): void;
  onContentModeChange(mode: ContentMode): void;
}

export function WorkspaceDetailInspector({
  selectedRecord,
  draft,
  tags,
  contentMode,
  saving,
  draftDirty,
  onGenerateSummary,
  onPolishMarkdown,
  onOpenTagManager,
  onArchive,
  onDelete,
  onClose,
  onSave,
  onDraftChange,
  onToggleTag,
  onContentModeChange,
}: WorkspaceDetailInspectorProps): JSX.Element {
  return (
    <section className="panel panel-detail">
      {!selectedRecord || !draft ? (
        <div className="empty-state detail-empty">点击左侧记录后，在这里查看和编辑详情。</div>
      ) : (
        <>
          <div className="panel-header">
            <div>
              <div className="panel-kicker">详情</div>
              <h2 className="panel-title panel-title-small">Inspector</h2>
              <div className="channel-panel-subtitle">
                {selectedRecord.recordKind === "report" ? "报告记录" : selectedRecord.recordKind === "note" ? "备忘记录" : "待办记录"}
              </div>
            </div>
            <div className="detail-header-actions">
              <button className="button-ghost" disabled={saving} onClick={onGenerateSummary}>
                AI 摘要
              </button>
              <button className="button-ghost" disabled={saving} onClick={onPolishMarkdown}>
                AI 润色
              </button>
              <button className="button-ghost" onClick={onOpenTagManager}>
                管理标签
              </button>
              <button className="button-ghost" onClick={() => onArchive(selectedRecord.id)}>
                归档
              </button>
              <button className="button-ghost button-danger-soft" onClick={() => onDelete(selectedRecord.id)}>
                删除
              </button>
              <button className="button-ghost" onClick={onClose}>
                收起
              </button>
              <button className="button-primary" disabled={saving || !draftDirty} onClick={onSave}>
                {saving ? "保存中…" : draftDirty ? "保存" : "已保存"}
              </button>
            </div>
          </div>

          <div className="channel-inspector">
            <section className="inspector-section">
              <div className="inspector-section-header">
                <div className="inspector-section-title">基础信息</div>
                <div className="inspector-section-note">快速管理标题、状态、优先级与置顶状态。</div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">标题</div>
                <div className="inspector-row-content">
                  <input
                    className="input"
                    value={draft.title}
                    onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                  />
                </div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">状态</div>
                <div className="inspector-row-content">
                  <div className="segmented-group segmented-group-wrap">
                    {(["未开始", "进行中", "已完成", "已归档"] as RecordStatus[]).map((option) => (
                      <button
                        key={option}
                        className={`segmented-item${draft.status === option ? " segmented-item-active" : ""}`}
                        onClick={() => onDraftChange({ ...draft, status: option })}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">优先级</div>
                <div className="inspector-row-content">
                  <div className="segmented-group">
                    {(["P1", "P2", "P3", "P4"] as RecordPriority[]).map((option) => (
                      <button
                        key={option}
                        className={`segmented-item${draft.priority === option ? " segmented-item-active" : ""}`}
                        onClick={() => onDraftChange({ ...draft, priority: option })}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">置顶</div>
                <div className="inspector-row-content">
                  <div className="toggle-pair">
                    <label className="toggle-chip">
                      <input
                        type="checkbox"
                        checked={draft.isPinned}
                        onChange={(event) => onDraftChange({ ...draft, isPinned: event.target.checked })}
                      />
                      <span>{draft.isPinned ? "已置顶" : "普通排序"}</span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="inspector-section">
              <div className="inspector-section-header">
                <div className="inspector-section-title">时间与节奏</div>
                <div className="inspector-section-note">可直接编辑时间，也可以快速改到今晚或明早。</div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">截止时间</div>
                <div className="inspector-row-content">
                  <input
                    className="input"
                    type="datetime-local"
                    value={draft.dueAt}
                    onChange={(event) => onDraftChange({ ...draft, dueAt: event.target.value })}
                  />
                  <div className="quick-chip-row">
                    <button className="button-mini" onClick={() => onDraftChange({ ...draft, dueAt: toInputValue(resolvePresetDate("today_18")) })}>
                      今晚 18:00
                    </button>
                    <button className="button-mini" onClick={() => onDraftChange({ ...draft, dueAt: toInputValue(resolvePresetDate("tomorrow_09")) })}>
                      明早 09:00
                    </button>
                    <button className="button-mini" onClick={() => onDraftChange({ ...draft, dueAt: "" })}>
                      清空时间
                    </button>
                  </div>
                </div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">计划时间</div>
                <div className="inspector-row-content">
                  <input
                    className="input"
                    type="datetime-local"
                    value={draft.plannedAt}
                    onChange={(event) => onDraftChange({ ...draft, plannedAt: event.target.value })}
                  />
                </div>
              </div>

              <div className="inspector-row">
                <div className="inspector-row-label">记录信息</div>
                <div className="inspector-row-content">
                  <div className="metadata-grid">
                    <span>创建于 {formatDateTime(selectedRecord.createdAt)}</span>
                    <span>更新于 {formatDateTime(selectedRecord.updatedAt)}</span>
                    <span>{selectedRecord.completedAt ? `完成于 ${formatDateTime(selectedRecord.completedAt)}` : "尚未完成"}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="inspector-section">
              <div className="inspector-section-header">
                <div className="inspector-section-title">标签与内容</div>
                <div className="inspector-section-note">支持 Markdown 编辑与预览，标签保持轻量切换。</div>
              </div>

              <div className="inspector-row inspector-row-stack">
                <div className="inspector-row-label">标签</div>
                <div className="inspector-row-content">
                  <div className="tag-selector">
                    {tags.map((tag) => (
                      <label key={tag.id} className={`tag-toggle${draft.tags.includes(tag.id) ? " tag-toggle-active" : ""}`}>
                        <input
                          type="checkbox"
                          checked={draft.tags.includes(tag.id)}
                          onChange={() => onToggleTag(tag.id)}
                        />
                        <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                        <span>{tag.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="inspector-row inspector-row-stack">
                <div className="inspector-row-label">内容</div>
                <div className="inspector-row-content">
                  <div className="segmented-group workspace-segment">
                    <button
                      className={`segmented-item${contentMode === "edit" ? " segmented-item-active" : ""}`}
                      onClick={() => onContentModeChange("edit")}
                      type="button"
                    >
                      编辑
                    </button>
                    <button
                      className={`segmented-item${contentMode === "preview" ? " segmented-item-active" : ""}`}
                      onClick={() => onContentModeChange("preview")}
                      type="button"
                    >
                      预览
                    </button>
                  </div>

                  {contentMode === "edit" ? (
                    <textarea
                      className="textarea"
                      value={draft.contentMarkdown}
                      onChange={(event) => onDraftChange({ ...draft, contentMarkdown: event.target.value })}
                    />
                  ) : (
                    <div className="markdown-preview workspace-markdown-preview">
                      {renderMarkdownPreview(draft.contentMarkdown)}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="inspector-section">
              <div className="inspector-section-header">
                <div className="inspector-section-title">AI 摘要</div>
                <div className="inspector-section-note">用于列表快速浏览与后续报告汇总的辅助摘要。</div>
              </div>

              <div className="inspector-row inspector-row-stack">
                <div className="inspector-row-label">摘要内容</div>
                <div className="inspector-row-content">
                  <div className="summary-box">{selectedRecord.aiSummary ?? "尚未生成 AI 摘要。"}</div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
