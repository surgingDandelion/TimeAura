import type { TagEntity } from "@timeaura-core";

import type { RecordDraft, TagEditorDraft } from "../types";

interface TagManagerSheetProps {
  open: boolean;
  tags: TagEntity[];
  draft: RecordDraft | null;
  tagEditor: TagEditorDraft;
  editingTag: TagEntity | null;
  onClose(): void;
  onResetEditor(): void;
  onToggleTag(tagId: string): void;
  onSelectTag(tag: TagEntity): void;
  onTagEditorChange(nextEditor: TagEditorDraft): void;
  onSubmit(): void;
  onDelete(tag: TagEntity): void;
}

export function TagManagerSheet({
  open,
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

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="sheet-header">
          <div>
            <div className="panel-kicker">标签管理</div>
            <h3 className="panel-title panel-title-small">当前记录标签</h3>
            <div className="channel-panel-subtitle">先处理当前记录标签，再在标签库里新增、编辑或清理标签。</div>
          </div>
          <div className="sheet-header-actions">
            <button className="button-mini" onClick={onResetEditor}>
              新建标签
            </button>
            <button className="button-ghost" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="sheet-section">
          <div className="sheet-section-title">当前记录标签</div>
          <div className="tag-selector">
            {tags.map((tag) => (
              <label key={tag.id} className={`tag-toggle${draft?.tags.includes(tag.id) ? " tag-toggle-active" : ""}`}>
                <input
                  type="checkbox"
                  checked={Boolean(draft?.tags.includes(tag.id))}
                  onChange={() => onToggleTag(tag.id)}
                />
                <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sheet-section sheet-section-grid">
          <div>
            <div className="sheet-section-title">标签库</div>
            <div className="sheet-tag-library">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`sheet-tag-row${tagEditor.id === tag.id ? " sheet-tag-row-active" : ""}`}
                  onClick={() => onSelectTag(tag)}
                >
                  <span className="sidebar-tag-label">
                    <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                    <span>{tag.name}</span>
                  </span>
                  {tag.isSystem ? <span className="sheet-tag-meta">系统</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="sheet-section-title">{editingTag ? "编辑标签" : "新建标签"}</div>
            <div className="sheet-form">
              <label className="field">
                <span className="field-label">名称</span>
                <input
                  className="input"
                  value={tagEditor.name}
                  onChange={(event) => onTagEditorChange({ ...tagEditor, name: event.target.value })}
                  placeholder="例如：项目A"
                />
              </label>
              <label className="field">
                <span className="field-label">颜色</span>
                <div className="color-field">
                  <input
                    className="input color-input"
                    type="color"
                    value={tagEditor.color}
                    onChange={(event) => onTagEditorChange({ ...tagEditor, color: event.target.value })}
                  />
                  <span className="color-field-value">{tagEditor.color.toUpperCase()}</span>
                </div>
              </label>
              <div className="sheet-actions">
                <button className="button-primary" onClick={onSubmit}>
                  {editingTag ? "保存标签" : "新建标签"}
                </button>
                {editingTag ? (
                  <>
                    <button className="button-ghost" onClick={onResetEditor}>
                      取消编辑
                    </button>
                    <button
                      className="button-ghost button-danger-soft"
                      disabled={editingTag.isSystem}
                      onClick={() => onDelete(editingTag)}
                    >
                      删除标签
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
