import { useCallback, useEffect, useMemo, useState } from "react";

import type { RecordEntity, RecordPriority, RecordStatus, ReminderSummary, TagEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

type WorkspaceStatusFilter = "all" | "todo" | "done";
type WorkspaceSort = "smart" | "due" | "priority" | "updated";

interface RecordDraft {
  title: string;
  status: RecordStatus;
  priority: RecordPriority;
  dueAt: string;
  plannedAt: string;
  contentMarkdown: string;
  tags: string[];
}

export function WorkspacePage(): JSX.Element {
  const { services } = useAppServices();
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [quickAdd, setQuickAdd] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<WorkspaceStatusFilter>("todo");
  const [tagId, setTagId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<WorkspaceSort>("smart");
  const [reminder, setReminder] = useState<ReminderSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedId) ?? null,
    [records, selectedId],
  );

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      const [recordResult, tagResult, reminderResult] = await Promise.all([
        services.recordService.listRecords({
          keyword: keyword.trim() || undefined,
          status,
          tagId,
          sortBy,
          view: status === "done" ? "done" : "all",
        }),
        services.tagService.listTags(),
        services.reminderService.getReminderSummary(new Date().toISOString()),
      ]);

      setRecords(recordResult.items);
      setTags(tagResult);
      setReminder(reminderResult);

      if (recordResult.items.length === 0) {
        setSelectedId(null);
        return;
      }

      if (!selectedId || !recordResult.items.some((item) => item.id === selectedId)) {
        setSelectedId(recordResult.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedId, services.recordService, services.reminderService, services.tagService, sortBy, status, tagId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedRecord) {
      setDraft(null);
      return;
    }

    setDraft({
      title: selectedRecord.title,
      status: selectedRecord.status,
      priority: selectedRecord.priority,
      dueAt: toInputValue(selectedRecord.dueAt),
      plannedAt: toInputValue(selectedRecord.plannedAt),
      contentMarkdown: selectedRecord.contentMarkdown,
      tags: selectedRecord.tags,
    });
  }, [selectedRecord]);

  async function handleQuickAdd(): Promise<void> {
    const title = quickAdd.trim();

    if (!title) {
      return;
    }

    await services.recordService.createRecord({
      title,
      tags: tagId !== "all" ? [tagId] : undefined,
      priority: "P3",
      status: "未开始",
    });

    setQuickAdd("");
    setMessage("已新增记录");
    await loadWorkspace();
  }

  async function handleSave(): Promise<void> {
    if (!selectedRecord || !draft) {
      return;
    }

    setSaving(true);

    try {
      await services.recordService.updateRecord(selectedRecord.id, {
        title: draft.title.trim(),
        status: draft.status,
        priority: draft.priority,
        dueAt: fromInputValue(draft.dueAt),
        plannedAt: fromInputValue(draft.plannedAt),
        contentMarkdown: draft.contentMarkdown,
        tags: draft.tags,
      });

      setMessage("记录已保存");
      await loadWorkspace();
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(recordId: string): Promise<void> {
    await services.recordService.completeRecord(recordId);
    setMessage("已完成该任务");
    await loadWorkspace();
  }

  async function handleGenerateSummary(): Promise<void> {
    if (!selectedRecord) {
      return;
    }

    setSaving(true);

    try {
      const result = await services.aiService.generateSummary({ recordId: selectedRecord.id });
      await services.recordService.updateRecord(selectedRecord.id, {
        aiSummary: result.content,
      });
      setMessage("AI 摘要已写入");
      await loadWorkspace();
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule(preset: "plus_1_hour" | "tomorrow_09"): Promise<void> {
    if (!reminder?.recordIds.length) {
      return;
    }

    await services.recordService.batchReschedule(reminder.recordIds, { preset });
    setMessage("已完成一键改期");
    await loadWorkspace();
  }

  function toggleTag(tagValue: string): void {
    if (!draft) {
      return;
    }

    const hasTag = draft.tags.includes(tagValue);
    const nextTags = hasTag
      ? draft.tags.filter((item) => item !== tagValue)
      : [...draft.tags.filter((item) => item !== "tag_uncategorized"), tagValue];

    setDraft({
      ...draft,
      tags: nextTags.length > 0 ? nextTags : ["tag_uncategorized"],
    });
  }

  return (
    <div className="workspace-layout">
      <section className="panel panel-list">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">备忘录</div>
            <h1 className="panel-title">统一记录列表</h1>
          </div>
          <button className="button-secondary" onClick={() => void loadWorkspace()}>
            刷新
          </button>
        </div>

        {reminder ? (
          <div className="reminder-banner">
            <div>
              <div className="reminder-title">{reminder.title}</div>
              <div className="reminder-text">{reminder.description}</div>
            </div>
            <div className="reminder-actions">
              <button className="button-ghost" onClick={() => void handleReschedule("plus_1_hour")}>
                顺延 1 小时
              </button>
              <button className="button-primary" onClick={() => void handleReschedule("tomorrow_09")}>
                改到明早 09:00
              </button>
            </div>
          </div>
        ) : null}

        <div className="quick-add-row">
          <input
            className="input"
            value={quickAdd}
            onChange={(event) => setQuickAdd(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleQuickAdd();
              }
            }}
            placeholder="单行快速新增，例如：下周例会纪要"
          />
          <button className="button-primary" onClick={() => void handleQuickAdd()}>
            新增
          </button>
        </div>

        <div className="filters-row">
          <input
            className="input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="模糊检索标题或内容"
          />
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value as WorkspaceStatusFilter)}>
            <option value="todo">待处理</option>
            <option value="all">全部</option>
            <option value="done">已完成</option>
          </select>
          <select className="select" value={tagId} onChange={(event) => setTagId(event.target.value)}>
            <option value="all">全部标签</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
          <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value as WorkspaceSort)}>
            <option value="smart">智能排序</option>
            <option value="due">按截止时间</option>
            <option value="priority">按优先级</option>
            <option value="updated">按更新时间</option>
          </select>
        </div>

        {message ? <div className="inline-message">{message}</div> : null}

        <div className="record-list">
          {loading ? <div className="empty-state">正在加载记录…</div> : null}

          {!loading && records.length === 0 ? <div className="empty-state">当前没有符合筛选条件的记录。</div> : null}

          {records.map((record) => (
            <button
              key={record.id}
              className={`record-row${record.id === selectedId ? " record-row-active" : ""}`}
              onClick={() => setSelectedId(record.id)}
            >
              <div className={`priority-pill priority-${record.priority.toLowerCase()}`}>{record.priority}</div>
              <div className="record-main">
                <div className="record-topline">
                  <div className="record-title-text">{record.title}</div>
                  <div className="record-meta">{record.status}</div>
                </div>
                <div className="record-bottomline">
                  <div className="record-tags">
                    {record.tags.map((tagRef) => {
                      const tag = tags.find((item) => item.id === tagRef);
                      return (
                        <span key={tagRef} className="tag-chip">
                          {tag?.name ?? tagRef}
                        </span>
                      );
                    })}
                  </div>
                  <div className="record-due">{formatDateLabel(record.dueAt)}</div>
                </div>
              </div>
              <div className="record-actions">
                {record.status !== "已完成" ? (
                  <span
                    className="button-mini"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleComplete(record.id);
                    }}
                  >
                    完成
                  </span>
                ) : (
                  <span className="record-done">已完成</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel panel-detail">
        {!selectedRecord || !draft ? (
          <div className="empty-state detail-empty">点击左侧记录后，在这里查看和编辑详情。</div>
        ) : (
          <>
            <div className="panel-header">
              <div>
                <div className="panel-kicker">详情</div>
                <h2 className="panel-title panel-title-small">Inspector</h2>
              </div>
              <div className="detail-header-actions">
                <button className="button-ghost" onClick={() => void handleGenerateSummary()}>
                  AI 摘要
                </button>
                <button className="button-primary" disabled={saving} onClick={() => void handleSave()}>
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </div>

            <div className="detail-grid">
              <label className="field">
                <span className="field-label">标题</span>
                <input
                  className="input"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </label>

              <div className="field-inline-group">
                <label className="field">
                  <span className="field-label">状态</span>
                  <select
                    className="select"
                    value={draft.status}
                    onChange={(event) => setDraft({ ...draft, status: event.target.value as RecordStatus })}
                  >
                    <option value="未开始">未开始</option>
                    <option value="进行中">进行中</option>
                    <option value="已完成">已完成</option>
                    <option value="已归档">已归档</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">优先级</span>
                  <select
                    className="select"
                    value={draft.priority}
                    onChange={(event) => setDraft({ ...draft, priority: event.target.value as RecordPriority })}
                  >
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                    <option value="P4">P4</option>
                  </select>
                </label>
              </div>

              <div className="field-inline-group">
                <label className="field">
                  <span className="field-label">截止时间</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={draft.dueAt}
                    onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span className="field-label">计划时间</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={draft.plannedAt}
                    onChange={(event) => setDraft({ ...draft, plannedAt: event.target.value })}
                  />
                </label>
              </div>

              <div className="field">
                <span className="field-label">标签</span>
                <div className="tag-selector">
                  {tags.map((tag) => (
                    <label key={tag.id} className={`tag-toggle${draft.tags.includes(tag.id) ? " tag-toggle-active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={draft.tags.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                      />
                      <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="field">
                <span className="field-label">内容（Markdown）</span>
                <textarea
                  className="textarea"
                  value={draft.contentMarkdown}
                  onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })}
                />
              </label>

              <div className="field">
                <span className="field-label">AI 摘要</span>
                <div className="summary-box">{selectedRecord.aiSummary ?? "尚未生成 AI 摘要。"}</div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function toInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromInputValue(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return "未设置时间";
  }

  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}
