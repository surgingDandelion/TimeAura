import { useCallback, useEffect, useMemo, useState } from "react";

import type { AIChannelEntity, ReportDraftResult, ReportHistoryEntity, ReportTemplateEntity, TagEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

export function ReportStudioPage(): JSX.Element {
  const { services } = useAppServices();
  const [templates, setTemplates] = useState<ReportTemplateEntity[]>([]);
  const [channels, setChannels] = useState<AIChannelEntity[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [histories, setHistories] = useState<ReportHistoryEntity[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "done">("all");
  const [timeRangeStart, setTimeRangeStart] = useState(defaultRangeStart());
  const [timeRangeEnd, setTimeRangeEnd] = useState(defaultRangeEnd());
  const [draft, setDraft] = useState<ReportDraftResult | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) ?? null,
    [templateId, templates],
  );
  const selectedHistory = useMemo(
    () => histories.find((item) => item.id === selectedHistoryId) ?? null,
    [histories, selectedHistoryId],
  );

  const loadReportMeta = useCallback(async () => {
    const [templateResult, channelResult, tagResult, historyResult] = await Promise.all([
      services.templateService.listTemplates(),
      services.channelService.listChannels(),
      services.tagService.listTags(),
      services.reportService.listReportHistories(),
    ]);

    setTemplates(templateResult);
    setChannels(channelResult);
    setTags(tagResult);
    setHistories(historyResult);

    if (!templateId && templateResult[0]) {
      setTemplateId(templateResult[0].id);
    }

    if (!selectedHistoryId && historyResult[0]) {
      setSelectedHistoryId(historyResult[0].id);
    }
  }, [selectedHistoryId, services.channelService, services.reportService, services.tagService, services.templateService, templateId]);

  useEffect(() => {
    void loadReportMeta();
  }, [loadReportMeta]);

  async function handleGenerate(): Promise<void> {
    if (!selectedTemplate) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const result = await services.reportService.generateReport({
        reportType: selectedTemplate.templateType,
        templateId: selectedTemplate.id,
        timeRangeStart: new Date(timeRangeStart).toISOString(),
        timeRangeEnd: new Date(timeRangeEnd).toISOString(),
        tagFilter: tagFilter === "all" ? null : tagFilter,
        statusFilter,
      });

      setDraft(result);
      setMessage("报告草稿已生成");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDraft(): Promise<void> {
    if (!selectedTemplate || !draft) {
      return;
    }

    setBusy(true);

    try {
      const history = await services.reportService.saveReportHistory({
        title: draft.title,
        reportType: selectedTemplate.templateType,
        templateId: selectedTemplate.id,
        channelId: draft.channelId,
        timeRangeStart: new Date(timeRangeStart).toISOString(),
        timeRangeEnd: new Date(timeRangeEnd).toISOString(),
        tagFilter: tagFilter === "all" ? null : tagFilter,
        statusFilter,
        sourceRecordIds: draft.sourceRecordIds,
        contentMarkdown: draft.contentMarkdown,
      });

      setSelectedHistoryId(history.id);
      setMessage("报告历史已保存");
      await loadReportMeta();
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAsRecord(): Promise<void> {
    if (!selectedHistoryId) {
      return;
    }

    setBusy(true);

    try {
      await services.reportService.saveReportAsRecord(selectedHistoryId);
      setMessage("报告已保存为记录");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-layout">
      <section className="panel panel-report-config">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">AI 报告</div>
            <h1 className="panel-title">周报 / 月报工作台</h1>
          </div>
        </div>

        <div className="detail-grid">
          <label className="field">
            <span className="field-label">报告模板</span>
            <select className="select" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field-inline-group">
            <label className="field">
              <span className="field-label">开始时间</span>
              <input className="input" type="date" value={timeRangeStart} onChange={(event) => setTimeRangeStart(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">结束时间</span>
              <input className="input" type="date" value={timeRangeEnd} onChange={(event) => setTimeRangeEnd(event.target.value)} />
            </label>
          </div>

          <div className="field-inline-group">
            <label className="field">
              <span className="field-label">标签范围</span>
              <select className="select" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="all">全部标签</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">状态范围</span>
              <select
                className="select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "todo" | "done")}
              >
                <option value="all">全部状态</option>
                <option value="todo">未完成</option>
                <option value="done">已完成</option>
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">当前 AI 通道</span>
            <div className="summary-box">
              {channels.length > 0
                ? channels
                    .filter((item) => item.enabled)
                    .map((item) => `${item.name} · ${item.providerType}`)
                    .join(" / ")
                : "当前还没有启用的 AI 通道。"}
            </div>
          </div>

          <div className="report-toolbar">
            <button className="button-primary" disabled={busy || !selectedTemplate} onClick={() => void handleGenerate()}>
              {busy ? "生成中…" : "生成草稿"}
            </button>
            <button className="button-ghost" disabled={busy || !draft} onClick={() => void handleSaveDraft()}>
              保存历史
            </button>
            <button className="button-ghost" disabled={busy || !selectedHistoryId} onClick={() => void handleSaveAsRecord()}>
              存为记录
            </button>
          </div>

          {message ? <div className="inline-message">{message}</div> : null}
        </div>
      </section>

      <section className="panel panel-report-preview">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">草稿预览</div>
            <h2 className="panel-title panel-title-small">{draft?.title ?? "尚未生成报告"}</h2>
          </div>
        </div>

        <div className="markdown-preview">
          {draft ? draft.contentMarkdown : "点击“生成草稿”后，在这里预览 AI 生成的报告内容。"}
        </div>
      </section>

      <section className="panel panel-report-history">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">历史记录</div>
            <h2 className="panel-title panel-title-small">已生成报告</h2>
          </div>
        </div>

        <div className="history-list">
          {histories.length === 0 ? <div className="empty-state">还没有保存过报告历史。</div> : null}
          {histories.map((history) => (
            <button
              key={history.id}
              className={`history-row${history.id === selectedHistoryId ? " history-row-active" : ""}`}
              onClick={() => setSelectedHistoryId(history.id)}
            >
              <div className="history-title">{history.title}</div>
              <div className="history-meta">
                {history.reportType} · {history.createdAt.slice(0, 10)}
              </div>
            </button>
          ))}
        </div>

        <div className="history-preview">
          {selectedHistory ? selectedHistory.contentMarkdown : "选择左侧历史记录后，在这里查看内容。"}
        </div>
      </section>
    </div>
  );
}

function defaultRangeStart(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return start.toISOString().slice(0, 10);
}

function defaultRangeEnd(): string {
  return new Date().toISOString().slice(0, 10);
}
