import type { TagEntity } from "@timeaura-core";

import type { TagManagerSheetContract } from "../contracts";

export type TagManagerSheetProps = TagManagerSheetContract;

export function TagManagerSheet({
  open,
  selectedRecord,
  records,
  tags,
  draft,
  tagEditor,
  editingTag,
  onClose,
  onResetEditor,
  onToggleTag,
  onSelectTag,
  onTagEditorChange,
  onSubmit,
  onDelete,
}: TagManagerSheetProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const currentTags = draft?.tags
    .map((tagId) => tags.find((tag) => tag.id === tagId) ?? null)
    .filter((tag): tag is TagEntity => tag !== null) ?? [];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel tag-manager-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="tag-manager-header">
          <div>
            <h3 className="panel-title panel-title-small">标签管理</h3>
            <div className="tag-manager-copy">在这里清理标签库，并维护当前记录的标签归属。</div>
          </div>
          <button type="button" className="icon-btn" aria-label="关闭标签管理" title="关闭标签管理" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="tag-manager-body">
          <div className="tag-manager-section">
            <div className="tag-panel">
              <div className="tag-panel-header">
                <div className="tag-panel-title">
                  <strong>当前记录标签</strong>
                </div>
                <div className="tag-panel-caption">
                  {selectedRecord ? "点击添加或移除当前记录标签。" : "当前未选中记录，仅可查看标签库。"}
                </div>
              </div>

              <div className="tag-context-card">
                <strong>{selectedRecord?.title ?? "当前记录"}</strong>
                <span>{selectedRecord ? `${currentTags.length} 个已绑定标签` : "未选择记录时仅可浏览标签库"}</span>
              </div>

              <div className={`tag-selected-strip${currentTags.length === 0 ? " empty" : ""}`}>
                {currentTags.length > 0
                  ? currentTags.map((tag) => (
                      <span key={tag.id} className="tag-token">
                        <i style={{ backgroundColor: tag.color }} />
                        <span>{tag.name}</span>
                      </span>
                    ))
                  : "这条记录还没有标签，建议至少挂一个主题标签，方便之后检索与 AI 汇总。"}
              </div>

              <div className="tag-bind-list">
                {tags.map((tag) => {
                  const active = Boolean(draft?.tags.includes(tag.id));

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`tag-bind-row${active ? " active" : ""}`}
                      disabled={!selectedRecord}
                      onClick={() => onToggleTag(tag.id)}
                    >
                      <span className="tag-bind-left">
                        <i style={{ backgroundColor: tag.color }} />
                        <span>{tag.name}</span>
                      </span>
                      <span className="tag-bind-state">{active ? "已添加" : "添加"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="tag-manager-section">
            <div className="tag-panel">
              <div className="tag-panel-header">
                <div className="tag-panel-title">
                  <strong>标签库</strong>
                </div>
                <div className="tag-panel-caption">维护标签名称、颜色与清理无用标签。</div>
              </div>

              <div className="tag-form-stack">
                <div className="tag-form-row">
                  <input
                    className="input"
                    value={tagEditor.name}
                    onChange={(event) => onTagEditorChange({ ...tagEditor, name: event.target.value })}
                    placeholder="输入标签名称"
                  />
                  <input
                    className="color-input"
                    type="color"
                    value={tagEditor.color}
                    onChange={(event) => onTagEditorChange({ ...tagEditor, color: event.target.value })}
                    aria-label="标签颜色"
                  />
                </div>
                <div className="tag-form-actions">
                  <button type="button" className="text-btn" onClick={onResetEditor}>
                    清空
                  </button>
                  <button type="button" className="button-ghost" onClick={onSubmit}>
                    {editingTag ? "保存修改" : "新增标签"}
                  </button>
                </div>
              </div>

              <div className="tag-library-list">
                {tags.length > 0 ? tags.map((tag) => {
                  const usageCount = records.filter((record) => record.tags.includes(tag.id)).length;

                  return (
                    <div key={tag.id} className="tag-library-item">
                      <div className="tag-library-left">
                        <div className="tag-library-copy">
                          <div className="tag-library-name">
                            <i style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                          </div>
                          <span className="tag-library-meta">{usageCount} 条记录</span>
                        </div>
                      </div>
                      <div className="tag-library-actions">
                        <button
                          type="button"
                          className="tag-action-btn"
                          aria-label={`编辑标签 ${tag.name}`}
                          title="编辑标签"
                          onClick={() => onSelectTag(tag)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="tag-action-btn delete"
                          aria-label={`删除标签 ${tag.name}`}
                          title={tag.isSystem ? "默认标签不可删除" : "删除标签"}
                          disabled={tag.isSystem}
                          onClick={() => onDelete(tag)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </div>
                  );
                }) : <div className="tag-library-empty">当前还没有标签，先新增一个标签开始整理。</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="tag-manager-footer">
          <button type="button" className="button-ghost" onClick={onClose}>
            完成
          </button>
        </div>
      </div>
    </div>
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

function EditIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function DeleteIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}
