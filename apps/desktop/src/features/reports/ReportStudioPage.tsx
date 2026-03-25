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
    try {
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
    } catch (error) {
      setMessage(toErrorMessage(error, "报告工作台初始化失败"));
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
    } catch (error) {
      setMessage(toErrorMessage(error, "生成报告草稿失败"));
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
    } catch (error) {
      setMessage(toErrorMessage(error, "保存报告历史失败"));
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
    } catch (error) {
      setMessage(toErrorMessage(error, "保存为记录失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="report-layout report-page-shell">
      <section className="panel panel-report-config report-panel-side">
        <div className="panel-title report-panel-title">
          <h2>AI 报告</h2>
          <p>根据真实记录生成周报、月报与专题总结，保留模板和通道的组合控制感。</p>
        </div>

        <div className="report-banner">
          <div>
            <strong className="report-banner-title">报告历史</strong>
            <span className="report-banner-text">保存后的报告默认进入这里，不干扰主列表。</span>
          </div>
          <button className="button-ghost button-ghost-compact">管理通道</button>
        </div>

        <div className="stack-card">
          <h4>模板与范围</h4>
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
        </div>

        <div className="stack-card">
          <h4>筛选条件</h4>
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
        </div>

        <div className="stack-card">
          <h4>模板与通道</h4>
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
        </div>

        {message ? <div className="inline-message">{message}</div> : null}
      </section>

      <section className="panel panel-report-preview report-output">
        <div className="report-header">
          <div className="panel-title">
            <h2>{draft?.title ?? "尚未生成报告"}</h2>
            <p>{draft ? "可在这里继续编辑、复制或另存为记录。" : "点击“生成草稿”后，在这里预览 AI 生成的报告内容。"}</p>
          </div>
          <div className="report-actions">
            <button className="button-ghost button-ghost-compact" disabled={!draft}>
              重新生成
            </button>
            <button className="button-ghost button-ghost-compact" disabled={!draft}>
              复制
            </button>
            <button className="button-primary" disabled={!draft || busy} onClick={() => void handleSaveAsRecord()}>
              存为记录
            </button>
          </div>
        </div>

        <div className="markdown-preview report-editor">
          {draft ? draft.contentMarkdown : "点击“生成草稿”后，在这里预览 AI 生成的报告内容。"}
        </div>
      </section>

      <section className="panel panel-report-history report-history-panel">
        <div className="panel-title report-panel-title">
          <h2>已生成报告</h2>
          <p>切换历史记录后，在下方快速回看输出内容。</p>
        </div>

        <div className="history-list report-history-list">
          {histories.length === 0 ? <div className="empty-state">还没有保存过报告历史。</div> : null}
          {histories.map((history) => (
            <button
              key={history.id}
              className={`history-row report-history-row${history.id === selectedHistoryId ? " history-row-active" : ""}`}
              onClick={() => setSelectedHistoryId(history.id)}
            >
              <div className="history-title">{history.title}</div>
              <div className="history-meta">
                {history.reportType} · {history.createdAt.slice(0, 10)}
              </div>
            </button>
          ))}
        </div>

        <div className="history-preview report-history-preview">
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

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? `${fallback}：${error.message}` : fallback;
}
