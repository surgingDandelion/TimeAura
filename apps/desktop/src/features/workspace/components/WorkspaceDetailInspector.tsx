import type { RecordPriority, RecordStatus } from "@timeaura-core";

import type { WorkspaceDetailInspectorContract } from "../contracts";
import { formatDateLabel, formatDateTime, renderMarkdownPreview, resolvePresetDate, toInputValue } from "../utils";

export type WorkspaceDetailInspectorProps = WorkspaceDetailInspectorContract;

export function WorkspaceDetailInspector({
  selectedRecord,
  draft,
  tags,
  contentMode,
  saving,
  onGenerateSummary,
  onPolishMarkdown,
  onOpenTagManager,
  onArchive,
  onClose,
  onDraftChange,
  onToggleTag,
  onContentModeChange,
}: WorkspaceDetailInspectorProps): JSX.Element {
  if (!selectedRecord || !draft) {
    return (
      <section className="panel panel-detail workspace-detail-panel">
        <div className="empty-state detail-empty">点击左侧记录后，在这里查看和编辑详情。</div>
      </section>
    );
  }

  const currentTags = draft.tags
    .map((tagId) => tags.find((tag) => tag.id === tagId) ?? null)
    .filter((tag): tag is NonNullable<typeof tag> => tag !== null);

  return (
    <section className="panel panel-detail workspace-detail-panel">
      <div className="workspace-detail-header">
        <div className="workspace-detail-header-copy">
          <span className="workspace-detail-kicker">Inspector</span>
          <h2 className="workspace-detail-title">{draft.title}</h2>
          <div className="workspace-detail-subtitle">
            {draft.status === "已完成" ? "这条记录已经完成，你仍然可以在这里回看内容、标签与完成时间。" : "通过右侧属性和正文区，持续把这条记录整理成可追踪、可交付的内容。"}
          </div>
        </div>

        <div className="workspace-detail-header-actions">
          <button className="icon-btn workspace-detail-close" aria-label="关闭详情" title="关闭详情" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="workspace-detail-overview">
        <span className="detail-info-chip">状态 · {draft.status}</span>
        <span className="detail-info-chip">优先级 · {draft.priority}</span>
        <span className="detail-info-chip">截止时间 · {draft.dueAt ? formatInputDateLabel(draft.dueAt) : "未设置"}</span>
      </div>

      <div className="workspace-detail-scroll">
        <section className="detail-section">
          <div className="detail-section-head">
            <div className="detail-section-title">
              <strong>属性</strong>
              <span>在这里维护状态、优先级、标签和关键时间信息。</span>
            </div>
          </div>

          <div className="inspector-field-list">
            <div className="inspector-field-row">
              <label>标题</label>
              <div className="inspector-field-control">
                <input
                  className="input field-input"
                  value={draft.title}
                  onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                />
              </div>
            </div>

            <div className="inspector-field-row">
              <label>状态</label>
              <div className="inspector-field-control">
                <select
                  className="select field-select"
                  value={draft.status}
                  onChange={(event) => onDraftChange({ ...draft, status: event.target.value as RecordStatus })}
                >
                  {(["未开始", "进行中", "已完成", "已归档"] as RecordStatus[]).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="inspector-field-row">
              <label>优先级</label>
              <div className="inspector-field-control">
                <select
                  className="select field-select"
                  value={draft.priority}
                  onChange={(event) => onDraftChange({ ...draft, priority: event.target.value as RecordPriority })}
                >
                  <option value="P1">P1 紧急重要</option>
                  <option value="P2">P2 重要</option>
                  <option value="P3">P3 常规</option>
                  <option value="P4">P4 低优先级</option>
                </select>
              </div>
            </div>

            <div className="inspector-field-row stack">
              <label>标签</label>
              <div className="inspector-field-control wrap">
                <div className={`tag-editor${currentTags.length === 0 ? " empty" : ""}`}>
                  {currentTags.length > 0 ? currentTags.map((tag) => (
                    <span key={tag.id} className="tag-inline">
                      <i style={{ backgroundColor: tag.color }} />
                      <span>{tag.name}</span>
                    </span>
                  )) : "当前记录的标签会展示在这里。"}
                </div>

                <button type="button" className="inspector-action-btn inspector-action-btn-quiet" onClick={onOpenTagManager}>
                  <EditIcon />
                  管理标签
                </button>
              </div>
            </div>

            <div className="inspector-field-row">
              <label>截止时间</label>
              <div className="inspector-field-control">
                <input
                  className="input field-date"
                  type="datetime-local"
                  value={draft.dueAt}
                  onChange={(event) => onDraftChange({ ...draft, dueAt: event.target.value })}
                />
                <div className="quick-chip-row">
                  <button type="button" className="button-mini" onClick={() => onDraftChange({ ...draft, dueAt: toInputValue(resolvePresetDate("today_18")) })}>
                    今晚 18:00
                  </button>
                  <button type="button" className="button-mini" onClick={() => onDraftChange({ ...draft, dueAt: toInputValue(resolvePresetDate("tomorrow_09")) })}>
                    明早 09:00
                  </button>
                  <button type="button" className="button-mini" onClick={() => onDraftChange({ ...draft, dueAt: "" })}>
                    清空时间
                  </button>
                </div>
              </div>
            </div>

            <div className="inspector-field-row">
              <label>完成时间</label>
              <div className="inspector-field-control">
                <input
                  className="input field-date"
                  type="datetime-local"
                  value={draft.completedAt}
                  onChange={(event) => onDraftChange({ ...draft, completedAt: event.target.value })}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="detail-section detail-section-flex">
          <div className="detail-section-head">
            <div className="detail-section-title">
              <strong>内容</strong>
              <span>支持 Markdown 编辑、分栏查看和预览切换。</span>
            </div>

            <div className="inspector-action-group">
              <button className="button-ghost inspector-action-btn" disabled={saving} onClick={onGenerateSummary}>
                AI 摘要
              </button>
              <button className="button-ghost inspector-action-btn" disabled={saving} onClick={onPolishMarkdown}>
                润色
              </button>
              <button className="button-ghost inspector-action-btn" onClick={() => onArchive(selectedRecord.id)}>
                归档
              </button>
            </div>
          </div>

          <div className="workspace-editor-toolbar">
            <div className="segmented-group workspace-segmented-control">
              <button
                className={`segmented-item${contentMode === "edit" ? " segmented-item-active" : ""}`}
                onClick={() => onContentModeChange("edit")}
                type="button"
              >
                编辑
              </button>
              <button
                className={`segmented-item${contentMode === "split" ? " segmented-item-active" : ""}`}
                onClick={() => onContentModeChange("split")}
                type="button"
              >
                分栏
              </button>
              <button
                className={`segmented-item${contentMode === "preview" ? " segmented-item-active" : ""}`}
                onClick={() => onContentModeChange("preview")}
                type="button"
              >
                预览
              </button>
            </div>
          </div>

          <div className={`workspace-editor-surface workspace-editor-surface-${contentMode}`}>
            {contentMode !== "preview" ? (
              <textarea
                className="textarea workspace-editor-textarea"
                value={draft.contentMarkdown}
                onChange={(event) => onDraftChange({ ...draft, contentMarkdown: event.target.value })}
              />
            ) : null}

            {contentMode !== "edit" ? (
              <div className="markdown-preview workspace-markdown-preview">
                {renderMarkdownPreview(draft.contentMarkdown)}
              </div>
            ) : null}
          </div>
        </section>

        <section className="detail-section">
          <div className="detail-section-head">
            <div className="detail-section-title">
              <strong>AI 摘要</strong>
              <span>用于列表快速浏览与后续周报/月报汇总。</span>
            </div>
          </div>

          <div className="summary-box">{selectedRecord.aiSummary ?? "尚未生成 AI 摘要。"}</div>
        </section>

        <section className="detail-section">
          <div className="detail-section-head">
            <div className="detail-section-title">
              <strong>记录信息</strong>
              <span>保留创建与更新时间，方便回溯内容演进。</span>
            </div>
          </div>

          <div className="metadata-grid workspace-detail-meta">
            <span>创建于 {formatDateTime(selectedRecord.createdAt)}</span>
            <span>更新于 {formatDateTime(selectedRecord.updatedAt)}</span>
            <span>{selectedRecord.completedAt ? `完成于 ${formatDateTime(selectedRecord.completedAt)}` : "尚未完成"}</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function formatInputDateLabel(value: string): string {
  if (!value) {
    return "未设置";
  }

  return formatDateLabel(new Date(value).toISOString());
}

function EditIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
