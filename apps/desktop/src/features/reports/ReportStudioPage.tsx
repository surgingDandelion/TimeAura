import { useCallback, useEffect, useMemo, useState } from "react";

import type { AIChannelEntity, ReportDraftResult, ReportHistoryEntity, ReportTemplateEntity, TagEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

type ReportTypeOption = "weekly" | "monthly" | "custom";

export function ReportStudioPage(): JSX.Element {
  const { services } = useAppServices();
  const [templates, setTemplates] = useState<ReportTemplateEntity[]>([]);
  const [channels, setChannels] = useState<AIChannelEntity[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [histories, setHistories] = useState<ReportHistoryEntity[]>([]);
  const [reportType, setReportType] = useState<ReportTypeOption>("weekly");
  const [templateId, setTemplateId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "done">("all");
  const [timeRangeStart, setTimeRangeStart] = useState(defaultRangeStart());
  const [timeRangeEnd, setTimeRangeEnd] = useState(defaultRangeEnd());
  const [draft, setDraft] = useState<ReportDraftResult | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateEditorName, setTemplateEditorName] = useState("");
  const [templateEditorTone, setTemplateEditorTone] = useState("professional");
  const [templateEditorSections, setTemplateEditorSections] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const filteredTemplates = useMemo(
    () => templates.filter((item) => item.templateType === reportType),
    [reportType, templates],
  );
  const enabledChannels = useMemo(
    () => channels.filter((item) => item.enabled),
    [channels],
  );
  const selectedTemplate = useMemo(
    () => filteredTemplates.find((item) => item.id === templateId) ?? filteredTemplates[0] ?? null,
    [filteredTemplates, templateId],
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

      const nextTemplates = templateResult.filter((item) => item.templateType === reportType);
      if (!templateId || !nextTemplates.some((item) => item.id === templateId)) {
        setTemplateId(nextTemplates[0]?.id ?? templateResult[0]?.id ?? "");
      }

      const nextEnabledChannels = channelResult.filter((item) => item.enabled);
      if (!channelId || !nextEnabledChannels.some((item) => item.id === channelId)) {
        setChannelId(nextEnabledChannels[0]?.id ?? channelResult[0]?.id ?? "");
      }

      if (!selectedHistoryId && historyResult[0]) {
        setSelectedHistoryId(historyResult[0].id);
      }
    } catch (error) {
      setMessage(toErrorMessage(error, "报告工作台初始化失败"));
    }
  }, [channelId, reportType, selectedHistoryId, services.channelService, services.reportService, services.tagService, services.templateService, templateId]);

  useEffect(() => {
    void loadReportMeta();
  }, [loadReportMeta]);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    setTemplateEditorName(selectedTemplate.name);
    setTemplateEditorTone(selectedTemplate.tone || "professional");
    setTemplateEditorSections(selectedTemplate.sections.join("\n"));
  }, [selectedTemplate]);

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
        channelId: channelId || null,
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
    const targetHistoryId = selectedHistoryId ?? selectedHistory?.id;
    if (!targetHistoryId) {
      return;
    }

    setBusy(true);

    try {
      await services.reportService.saveReportAsRecord(targetHistoryId);
      setMessage("报告已保存为记录");
    } catch (error) {
      setMessage(toErrorMessage(error, "保存为记录失败"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTemplate(): Promise<void> {
    if (!selectedTemplate) {
      return;
    }

    setBusy(true);

    try {
      await services.templateService.updateTemplate(selectedTemplate.id, {
        name: templateEditorName.trim() || selectedTemplate.name,
        tone: templateEditorTone.trim() || selectedTemplate.tone,
        sections: templateEditorSections
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setMessage("模板配置已保存");
      setTemplateEditorOpen(false);
      await loadReportMeta();
    } catch (error) {
      setMessage(toErrorMessage(error, "模板配置保存失败"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
          <button className="button-ghost button-ghost-compact report-manage-channel-btn" onClick={() => setMessage("请在左侧底部进入 AI 通道配置")}>
            管理通道
          </button>
        </div>

          <div className="stack-card">
            <h4>报告类型</h4>
            <div className="option-list">
              {[
                { id: "weekly", label: "周报" },
                { id: "monthly", label: "月报" },
                { id: "custom", label: "专题报告" },
              ].map((option) => (
                <label key={option.id} className="option-row">
                  <input
                    type="radio"
                    name="reportType"
                    value={option.id}
                    checked={reportType === option.id}
                    onChange={() => setReportType(option.id as ReportTypeOption)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="stack-card">
            <h4>时间范围</h4>
            <div className="date-grid">
              <input
                className="input"
                type="date"
                aria-label="开始时间"
                value={timeRangeStart}
                onChange={(event) => setTimeRangeStart(event.target.value)}
              />
              <input
                className="input"
                type="date"
                aria-label="结束时间"
                value={timeRangeEnd}
                onChange={(event) => setTimeRangeEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="stack-card">
            <h4>筛选条件</h4>
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
                <option value="done">已完成</option>
                <option value="todo">未完成</option>
              </select>
            </label>
          </div>

          <div className="stack-card">
            <h4>模板与通道</h4>
            <label className="field">
              <span className="field-label">报告模板</span>
              <select className="select" value={selectedTemplate?.id ?? ""} onChange={(event) => setTemplateId(event.target.value)}>
                {filteredTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-ghost report-template-config-btn" disabled={!selectedTemplate} onClick={() => setTemplateEditorOpen(true)}>
              配置当前模板
            </button>
            <label className="field">
              <span className="field-label">AI 通道</span>
              <select className="select" value={channelId} onChange={(event) => setChannelId(event.target.value)}>
                {enabledChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary report-generate-btn" disabled={busy || !selectedTemplate} onClick={() => void handleGenerate()}>
              {busy ? "生成中…" : "生成报告"}
            </button>
          </div>

          <div className="stack-card">
            <h4>历史记录</h4>
            <div className="history-list report-history-list report-history-list-compact">
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
          </div>

          {message ? <div className="inline-message">{message}</div> : null}
        </section>

        <section className="panel panel-report-preview report-output">
          <div className="report-header">
            <div className="panel-title">
              <h2>{draft?.title ?? "尚未生成报告"}</h2>
              <p>
                {draft
                  ? `已使用 ${enabledChannels.find((item) => item.id === draft.channelId)?.name ?? "当前通道"} · ${selectedTemplate?.name ?? "当前模板"}`
                  : "点击“生成报告”后，在这里预览 AI 生成的报告内容。"}
              </p>
            </div>
            <div className="report-actions report-actions-header">
              <button className="button-ghost" disabled={!draft}>
                重新生成
              </button>
              <button className="button-ghost" disabled={!draft}>
                复制
              </button>
              <button className="button-ghost" disabled={!draft}>
                导出 Markdown
              </button>
              <button className="button-primary" disabled={!draft || busy} onClick={() => void handleSaveAsRecord()}>
                保存为记录
              </button>
            </div>
          </div>

          <div className="markdown-preview report-editor">
            {draft ? draft.contentMarkdown : "点击“生成报告”后，在这里预览 AI 生成的报告内容。"}
          </div>

          {selectedHistory ? (
            <div className="history-preview report-history-preview report-history-preview-inline">
              {selectedHistory.contentMarkdown}
            </div>
          ) : null}

          {draft ? (
            <div className="report-actions report-actions-footer">
              <button className="button-ghost" disabled={busy} onClick={() => void handleSaveDraft()}>
                保存历史
              </button>
              <button className="button-primary" disabled={busy} onClick={() => void handleSaveAsRecord()}>
                存为记录
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {templateEditorOpen && selectedTemplate ? (
        <div className="sheet-backdrop" onClick={() => setTemplateEditorOpen(false)}>
          <div
            className="sheet-panel sheet-panel-compact report-template-sheet"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="sheet-header">
              <div>
                <div className="panel-kicker">模板配置</div>
                <h3 className="panel-title panel-title-small">配置当前模板</h3>
                <div className="channel-panel-subtitle">调整模板名称、输出语气和章节结构，后续一键生成会沿用这套设定。</div>
              </div>
              <div className="sheet-header-actions">
                <button className="button-ghost" onClick={() => setTemplateEditorOpen(false)}>
                  关闭
                </button>
              </div>
            </div>

            <div className="sheet-form">
              <label className="field">
                <span className="field-label">模板名称</span>
                <input className="input" value={templateEditorName} onChange={(event) => setTemplateEditorName(event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">输出语气</span>
                <select className="select" value={templateEditorTone} onChange={(event) => setTemplateEditorTone(event.target.value)}>
                  <option value="professional">专业简洁</option>
                  <option value="executive">管理视角</option>
                  <option value="friendly">轻松直接</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">章节结构</span>
                <textarea
                  className="textarea textarea-medium"
                  value={templateEditorSections}
                  onChange={(event) => setTemplateEditorSections(event.target.value)}
                />
              </label>
              <div className="sheet-actions">
                <button className="button-primary" disabled={busy} onClick={() => void handleSaveTemplate()}>
                  保存模板
                </button>
                <button className="button-ghost" onClick={() => setTemplateEditorOpen(false)}>
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
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
