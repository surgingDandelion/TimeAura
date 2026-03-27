import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import type { AIChannelEntity, ReportDraftResult, ReportHistoryEntity, ReportTemplateEntity, TagEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

type ReportTypeOption = "weekly" | "monthly" | "custom";
type ReportSelectOption = {
  value: string;
  label: string;
};

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
  const tagOptions = useMemo<ReportSelectOption[]>(
    () => [
      { value: "all", label: "全部标签" },
      ...tags.map((tag) => ({ value: tag.id, label: tag.name })),
    ],
    [tags],
  );
  const statusOptions = useMemo<ReportSelectOption[]>(
    () => [
      { value: "all", label: "全部状态" },
      { value: "done", label: "已完成" },
      { value: "todo", label: "未完成" },
    ],
    [],
  );
  const templateOptions = useMemo<ReportSelectOption[]>(
    () => filteredTemplates.map((template) => ({ value: template.id, label: template.name })),
    [filteredTemplates],
  );
  const channelOptions = useMemo<ReportSelectOption[]>(
    () => enabledChannels.map((channel) => ({ value: channel.id, label: channel.name })),
    [enabledChannels],
  );
  const toneOptions = useMemo<ReportSelectOption[]>(
    () => [
      { value: "professional", label: "专业简洁" },
      { value: "executive", label: "管理视角" },
      { value: "friendly", label: "轻松直接" },
    ],
    [],
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
              <ReportSelect label="标签范围" value={tagFilter} options={tagOptions} onChange={setTagFilter} />
            </label>
            <label className="field">
              <span className="field-label">状态范围</span>
              <ReportSelect
                label="状态范围"
                value={statusFilter}
                options={statusOptions}
                onChange={(nextValue) => setStatusFilter(nextValue as "all" | "todo" | "done")}
              />
            </label>
          </div>

          <div className="stack-card">
            <h4>模板与通道</h4>
            <label className="field">
              <span className="field-label">报告模板</span>
              <ReportSelect
                label="报告模板"
                value={selectedTemplate?.id ?? ""}
                options={templateOptions}
                onChange={setTemplateId}
                placeholder="请选择模板"
              />
            </label>
            <button className="button-ghost report-template-config-btn" disabled={!selectedTemplate} onClick={() => setTemplateEditorOpen(true)}>
              配置当前模板
            </button>
            <label className="field">
              <span className="field-label">AI 通道</span>
              <ReportSelect
                label="AI 通道"
                value={channelId}
                options={channelOptions}
                onChange={setChannelId}
                placeholder="请选择通道"
              />
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
            <div className="panel-title report-preview-title">
              <h2>{draft?.title ?? "尚未生成报告"}</h2>
              <p>
                {draft
                  ? `已使用 ${enabledChannels.find((item) => item.id === draft.channelId)?.name ?? "当前通道"} · ${selectedTemplate?.name ?? "当前模板"}`
                  : "点击“生成报告”后，在这里预览 AI 生成的报告内容。"}
              </p>
            </div>
            <div className="report-actions report-actions-header report-preview-actions">
              <button className="button-ghost report-header-btn" disabled={!draft}>
                重新生成
              </button>
              <button className="button-ghost report-header-btn" disabled={!draft}>
                复制
              </button>
              <button className="button-ghost report-header-btn" disabled={!draft}>
                导出 Markdown
              </button>
              <button
                className="button-primary report-header-btn report-header-btn-primary"
                disabled={!draft || busy}
                onClick={() => void handleSaveAsRecord()}
              >
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
                <ReportSelect label="输出语气" value={templateEditorTone} options={toneOptions} onChange={setTemplateEditorTone} />
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

type ReportSelectProps = {
  label: string;
  value: string;
  options: ReportSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function ReportSelect({ label, value, options, onChange, placeholder = "请选择", disabled = false }: ReportSelectProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selectedOption = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [value]);

  return (
    <div ref={rootRef} className={`report-select${open ? " report-select-open" : ""}${disabled ? " report-select-disabled" : ""}`}>
      <button
        type="button"
        className="report-select-trigger"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
      >
        <span className={`report-select-value${selectedOption ? "" : " report-select-placeholder"}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <span className="report-select-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <div id={listboxId} className="report-select-menu" role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`report-select-option${option.value === value ? " report-select-option-active" : ""}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
