import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RecordEntity, RecordPriority, RecordStatus, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";
import { NotificationDebugPanel } from "./components/NotificationDebugPanel";
import { ReminderBanner } from "./components/ReminderBanner";
import { ShortcutHelpSheet } from "./components/ShortcutHelpSheet";
import { WORKSPACE_SHORTCUT_ITEMS, useWorkspaceKeyboardShortcuts } from "./hooks/useWorkspaceKeyboardShortcuts";
import type {
  ContentMode,
  NotificationDebugEntry,
  RecordDraft,
  TagEditorDraft,
  WorkspaceFocusTarget,
  WorkspaceQuickAddTarget,
  WorkspaceRuntimeNotice,
  WorkspaceSort,
  WorkspaceStatusFilter,
} from "./types";
import { formatDateLabel, formatDateTime, fromInputValue, renderMarkdownPreview, resolvePresetDate, sameTags, toInputValue } from "./utils";

interface WorkspacePageProps {
  activeTagId: string;
  activeView: "today" | "plan" | "all" | "done";
  focusTarget: WorkspaceFocusTarget | null;
  quickAddTarget: WorkspaceQuickAddTarget | null;
  runtimeNotice: WorkspaceRuntimeNotice | null;
  notificationDebugEntries: NotificationDebugEntry[];
  onClearNotificationDebug?(): void | Promise<void>;
  onTagFilterChange(tagId: string): void;
  onWorkspaceChanged?(): void;
}

export function WorkspacePage({
  activeTagId,
  activeView,
  focusTarget,
  quickAddTarget,
  runtimeNotice,
  notificationDebugEntries,
  onClearNotificationDebug,
  onTagFilterChange,
  onWorkspaceChanged,
}: WorkspacePageProps): JSX.Element {
  const { services, runtime } = useAppServices();
  const quickAddRef = useRef<HTMLInputElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [records, setRecords] = useState<RecordEntity[]>([]);
  const [tags, setTags] = useState<TagEntity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [quickAdd, setQuickAdd] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<WorkspaceStatusFilter>("todo");
  const [sortBy, setSortBy] = useState<WorkspaceSort>("smart");
  const [reminder, setReminder] = useState<ReminderSummary | null>(null);
  const [reminderHits, setReminderHits] = useState<ReminderHit[]>([]);
  const [reminderExpanded, setReminderExpanded] = useState(false);
  const [reminderSelectedIds, setReminderSelectedIds] = useState<string[]>([]);
  const [reminderSelectedOnly, setReminderSelectedOnly] = useState(false);
  const [customReminderTimeOpen, setCustomReminderTimeOpen] = useState(false);
  const [customReminderDueAt, setCustomReminderDueAt] = useState("");
  const [notificationDebugOpen, setNotificationDebugOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const [contentMode, setContentMode] = useState<ContentMode>("edit");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quickAddActive, setQuickAddActive] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [tagEditor, setTagEditor] = useState<TagEditorDraft>({
    id: null,
    name: "",
    color: "#5f89ff",
  });

  const selectedRecord = useMemo(
    () => records.find((item) => item.id === selectedId) ?? null,
    [records, selectedId],
  );
  const selectedCount = selectedIds.length;
  const batchTargetIds = selectedIds.length > 0 ? selectedIds : reminder?.recordIds ?? [];
  const activeReminderHits = useMemo(
    () => (reminder ? reminderHits.filter((hit) => hit.reminderKind === reminder.kind) : []),
    [reminder, reminderHits],
  );
  const activeReminderTargetIds = useMemo(
    () => activeReminderHits.map((hit) => hit.id),
    [activeReminderHits],
  );
  const visibleReminderSelectedCount = useMemo(
    () => activeReminderTargetIds.filter((id) => reminderSelectedIds.includes(id)).length,
    [activeReminderTargetIds, reminderSelectedIds],
  );
  const visibleSelectedCount = useMemo(
    () => records.filter((record) => selectedIds.includes(record.id)).length,
    [records, selectedIds],
  );
  const currentTagName = useMemo(
    () => (activeTagId === "all" ? "全部标签" : tags.find((tag) => tag.id === activeTagId)?.name ?? "当前标签"),
    [activeTagId, tags],
  );
  const notificationDebugFeed = useMemo(() => {
    const runtimeEntries =
      runtime?.notifications.map((item) => ({
        id: `runtime-${item.id}-${item.createdAt}`,
        at: item.createdAt,
        source: "driver" as const,
        level: item.cancelledAt ? ("warning" as const) : ("info" as const),
        title: item.title,
        detail: `${item.body}${item.cancelledAt ? "（已取消）" : ""}`,
      })) ?? [];

    return [...notificationDebugEntries, ...runtimeEntries]
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
      .slice(0, 24);
  }, [notificationDebugEntries, runtime?.notifications]);
  const editingTag = useMemo(
    () => (tagEditor.id ? tags.find((tag) => tag.id === tagEditor.id) ?? null : null),
    [tagEditor.id, tags],
  );
  const customReminderValidation = useMemo(() => {
    const errors: string[] = [];
    const targetIds = getReminderActionTargetIds();

    if (targetIds.length === 0) {
      errors.push("当前没有可改期的提醒命中任务。");
    }

    if (!customReminderDueAt) {
      errors.push("请选择新的截止时间。");
      return errors;
    }

    const date = new Date(customReminderDueAt);

    if (Number.isNaN(date.getTime())) {
      errors.push("时间格式无效，请重新选择。");
      return errors;
    }

    if (date.getTime() <= Date.now()) {
      errors.push("新的截止时间需晚于当前时间。");
    }

    return errors;
  }, [customReminderDueAt, activeReminderTargetIds, reminderSelectedIds, reminderSelectedOnly]);
  const draftDirty = useMemo(() => {
    if (!selectedRecord || !draft) {
      return false;
    }

    return (
      draft.title !== selectedRecord.title ||
      draft.status !== selectedRecord.status ||
      draft.priority !== selectedRecord.priority ||
      draft.dueAt !== toInputValue(selectedRecord.dueAt) ||
      draft.plannedAt !== toInputValue(selectedRecord.plannedAt) ||
      draft.contentMarkdown !== selectedRecord.contentMarkdown ||
      draft.isPinned !== selectedRecord.isPinned ||
      !sameTags(draft.tags, selectedRecord.tags)
    );
  }, [draft, selectedRecord]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      const [recordResult, tagResult, reminderResult, reminderHitsResult] = await Promise.all([
        services.recordService.listRecords({
          view: activeView,
          keyword: keyword.trim() || undefined,
          status: activeView === "done" ? "done" : status,
          tagId: activeTagId,
          sortBy,
        }),
        services.tagService.listTags(),
        services.reminderService.getReminderSummary(new Date().toISOString()),
        services.reminderService.listReminderHits(new Date().toISOString()),
      ]);

      setRecords(recordResult.items);
      setTags(tagResult);
      setReminder(reminderResult);
      setReminderHits(reminderHitsResult);

      if (recordResult.items.length === 0) {
        setSelectedId(null);
        return;
      }

      if (selectedId && !recordResult.items.some((item) => item.id === selectedId)) {
        setSelectedId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTagId, activeView, keyword, selectedId, services.recordService, services.reminderService, services.tagService, sortBy, status]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => records.some((record) => record.id === id)));
  }, [records]);

  useEffect(() => {
    setReminderSelectedIds((current) => current.filter((id) => activeReminderTargetIds.includes(id)));
  }, [activeReminderTargetIds]);

  useEffect(() => {
    if (reminderSelectedIds.length > 0) {
      return;
    }

    setReminderSelectedOnly(false);
  }, [reminderSelectedIds]);

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
      isPinned: selectedRecord.isPinned,
    });
    setContentMode("edit");
  }, [selectedRecord]);

  useEffect(() => {
    if (!focusTarget?.recordId) {
      return;
    }

    setKeyword("");
    setStatus("todo");
    onTagFilterChange("all");
    setSelectedId(focusTarget.recordId);
    setHighlightedRecordId(focusTarget.recordId);
  }, [focusTarget, onTagFilterChange]);

  useEffect(() => {
    if (!highlightedRecordId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setHighlightedRecordId((current) => (current === highlightedRecordId ? null : current));
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [highlightedRecordId]);

  useEffect(() => {
    if (!quickAddTarget) {
      return;
    }

    setKeyword("");
    setStatus("todo");
    onTagFilterChange("all");
    setSelectedId(null);
    focusQuickAddInput();
  }, [quickAddTarget, onTagFilterChange]);

  useEffect(() => {
    if (!quickAddActive) {
      return;
    }

    const timer = window.setTimeout(() => {
      setQuickAddActive(false);
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [quickAddActive]);

  useEffect(() => {
    if (!runtimeNotice) {
      return;
    }

    setMessage(runtimeNotice.text);

    const timer = window.setTimeout(() => {
      setMessage((current) => (current === runtimeNotice.text ? null : current));
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [runtimeNotice]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    rowRefs.current[selectedId]?.scrollIntoView({
      block: "nearest",
    });
  }, [selectedId]);

  function focusQuickAddInput(): void {
    quickAddRef.current?.focus();
    quickAddRef.current?.select();
    setQuickAddActive(true);
  }

  function focusSearchInput(): void {
    searchRef.current?.focus();
    searchRef.current?.select();
  }

  async function syncWorkspace(afterMessage?: string): Promise<void> {
    await loadWorkspace();
    await onWorkspaceChanged?.();

    if (afterMessage) {
      setMessage(afterMessage);
    }
  }

  async function handleQuickAdd(): Promise<void> {
    const title = quickAdd.trim();

    if (!title) {
      return;
    }

    const created = await services.recordService.createRecord({
      title,
      tags: activeTagId !== "all" ? [activeTagId] : undefined,
      priority: "P3",
      status: "未开始",
      plannedAt: null,
    });

    setQuickAdd("");
    setSelectedId(created.id);
    await syncWorkspace("已新增记录");
    quickAddRef.current?.focus();
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
        isPinned: draft.isPinned,
      });

      await syncWorkspace("记录已保存");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(recordId: string): Promise<void> {
    await services.recordService.completeRecord(recordId);
    await syncWorkspace("已完成该任务");
  }

  async function handleDelete(recordId: string): Promise<void> {
    const confirmed = globalThis.confirm?.("确认删除这条记录吗？") ?? true;

    if (!confirmed) {
      return;
    }

    await services.recordService.deleteRecord(recordId);

    if (selectedId === recordId) {
      setSelectedId(null);
    }

    setSelectedIds((current) => current.filter((id) => id !== recordId));
    await syncWorkspace("记录已删除");
  }

  async function handleArchive(recordId: string): Promise<void> {
    await services.recordService.archiveRecord(recordId);
    await syncWorkspace("记录已归档");
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
      await syncWorkspace("AI 摘要已写入");
    } finally {
      setSaving(false);
    }
  }

  async function handlePolishMarkdown(): Promise<void> {
    if (!selectedRecord || !draft) {
      return;
    }

    setSaving(true);

    try {
      const result = await services.aiService.polishMarkdown({
        recordId: selectedRecord.id,
        markdown: draft.contentMarkdown,
      });
      setDraft({
        ...draft,
        contentMarkdown: result.content,
      });
      setContentMode("preview");
      setMessage("内容已完成 AI 润色，可预览后再保存");
    } finally {
      setSaving(false);
    }
  }

  async function handleReschedule(preset: "plus_1_hour" | "tomorrow_09" | "today_18"): Promise<void> {
    if (batchTargetIds.length === 0) {
      return;
    }

    await services.recordService.batchReschedule(batchTargetIds, { preset });
    setSelectedIds([]);
    await syncWorkspace(selectedIds.length > 0 ? "已完成批量改期" : "已完成一键改期");
  }

  function getReminderActionTargetIds(): string[] {
    if (reminderSelectedOnly && reminderSelectedIds.length > 0) {
      return reminderSelectedIds;
    }

    return activeReminderTargetIds;
  }

  async function handleReminderReschedule(preset: "plus_1_hour" | "tomorrow_09" | "today_18"): Promise<void> {
    const targetIds = getReminderActionTargetIds();

    if (targetIds.length === 0) {
      return;
    }

    await services.recordService.batchReschedule(targetIds, { preset });
    setReminderSelectedIds([]);
    setReminderSelectedOnly(false);
    await syncWorkspace(reminderSelectedOnly ? "已完成仅改选中改期" : "已完成提醒命中改期");
  }

  async function handleSnoozeReminder(minutes: number): Promise<void> {
    const targetIds = getReminderActionTargetIds();

    if (targetIds.length === 0) {
      return;
    }

    await services.reminderService.snoozeReminder(targetIds, minutes);
    setReminderSelectedIds([]);
    setReminderSelectedOnly(false);
    await syncWorkspace(`已延后提醒 ${minutes} 分钟`);
  }

  function openCustomReminderReschedule(): void {
    const nextDefault = activeReminderHits[0]?.dueAt ?? resolvePresetDate("tomorrow_09");

    setCustomReminderDueAt(toInputValue(nextDefault));
    setCustomReminderTimeOpen(true);
  }

  function applyCustomReminderPreset(
    preset: "plus_1_hour" | "today_18" | "tomorrow_09" | "friday_18" | "next_monday_09",
  ): void {
    setCustomReminderDueAt(toInputValue(resolvePresetDate(preset)));
  }

  async function handleSubmitCustomReminderReschedule(): Promise<void> {
    const targetIds = getReminderActionTargetIds();
    const customAt = fromInputValue(customReminderDueAt);

    if (customReminderValidation.length > 0 || targetIds.length === 0 || !customAt) {
      setMessage(customReminderValidation[0] ?? "请先选择命中任务，并设置新的时间");
      return;
    }

    await services.recordService.batchReschedule(targetIds, {
      preset: "custom",
      customAt,
    });
    setCustomReminderTimeOpen(false);
    setReminderSelectedIds([]);
    setReminderSelectedOnly(false);
    await syncWorkspace("已完成自定义改期");
  }

  function toggleReminderSelection(recordId: string): void {
    setReminderSelectedIds((current) =>
      current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId],
    );
  }

  function toggleSelectAllReminderHits(): void {
    if (visibleReminderSelectedCount === activeReminderTargetIds.length && activeReminderTargetIds.length > 0) {
      setReminderSelectedIds([]);
      setReminderSelectedOnly(false);
      return;
    }

    setReminderSelectedIds(activeReminderTargetIds);
  }

  function focusRecordFromReminder(recordId: string): void {
    setSelectedId(recordId);
    setHighlightedRecordId(recordId);
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

  function toggleSelection(recordId: string): void {
    setSelectedIds((current) =>
      current.includes(recordId) ? current.filter((id) => id !== recordId) : [...current, recordId],
    );
  }

  function toggleSelectAllVisible(): void {
    if (visibleSelectedCount === records.length && records.length > 0) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(records.map((record) => record.id));
  }

  function openTagManager(): void {
    setTagManagerOpen(true);
    setTagEditor({
      id: null,
      name: "",
      color: "#5f89ff",
    });
  }

  function startEditTag(tag: TagEntity): void {
    setTagEditor({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    });
  }

  async function handleCreateOrUpdateTag(): Promise<void> {
    const name = tagEditor.name.trim();

    if (!name) {
      setMessage("标签名称不能为空");
      return;
    }

    if (tagEditor.id) {
      await services.tagService.updateTag(tagEditor.id, {
        name,
        color: tagEditor.color,
      });
      await syncWorkspace("标签已更新");
      return;
    }

    const created = await services.tagService.createTag({
      name,
      color: tagEditor.color,
    });

    if (draft) {
      setDraft({
        ...draft,
        tags: [...draft.tags.filter((item) => item !== "tag_uncategorized"), created.id],
      });
    }

    setTagEditor({
      id: created.id,
      name: created.name,
      color: created.color,
    });
    await syncWorkspace("已创建新标签");
  }

  async function handleDeleteTag(tag: TagEntity): Promise<void> {
    const confirmed = globalThis.confirm?.(`确认删除标签“${tag.name}”吗？`) ?? true;

    if (!confirmed) {
      return;
    }

    await services.tagService.deleteTag(tag.id);

    if (activeTagId === tag.id) {
      onTagFilterChange("all");
    }

    if (draft?.tags.includes(tag.id)) {
      setDraft({
        ...draft,
        tags: draft.tags.filter((item) => item !== tag.id),
      });
    }

    setTagEditor({
      id: null,
      name: "",
      color: "#5f89ff",
    });
    await syncWorkspace("标签已删除");
  }

  function closeInspector(): void {
    setSelectedId(null);
  }

  function openShortcutHelp(): void {
    setShortcutHelpOpen(true);
  }

  function closeShortcutHelp(): void {
    setShortcutHelpOpen(false);
  }

  function handleExportNotificationDebug(): void {
    if (notificationDebugFeed.length === 0) {
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      entries: notificationDebugFeed,
    };
    const fileName = `timeaura-notification-debug-${createExportTimestamp()}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("通知调试记录已导出");
  }

  async function handleClearNotificationDebugPanel(): Promise<void> {
    if (notificationDebugFeed.length === 0) {
      return;
    }

    const confirmed = globalThis.confirm?.("确认清空当前通知调试记录吗？") ?? true;

    if (!confirmed) {
      return;
    }

    await onClearNotificationDebug?.();
    setMessage("通知调试记录已清空");
  }

  useWorkspaceKeyboardShortcuts({
    records,
    selectedId,
    selectedRecord,
    draftDirty,
    saving,
    customReminderTimeOpen,
    tagManagerOpen,
    shortcutHelpOpen,
    onFocusQuickAdd: focusQuickAddInput,
    onFocusSearch: focusSearchInput,
    onSave: () => {
      void handleSave();
    },
    onCloseCustomReminder: () => setCustomReminderTimeOpen(false),
    onCloseTagManager: () => setTagManagerOpen(false),
    onCloseShortcutHelp: closeShortcutHelp,
    onCloseInspector: closeInspector,
    onSelectRecord: setSelectedId,
    onToggleSelection: toggleSelection,
    onOpenShortcutHelp: openShortcutHelp,
  });

  return (
    <div className="workspace-layout">
      <section className="panel panel-list">
        <div className="panel-header">
          <div>
            <div className="panel-kicker">备忘录</div>
            <h1 className="panel-title">统一记录列表</h1>
            <div className="channel-panel-subtitle">
              {activeView === "today"
                ? "聚焦今天、逾期和临近到期记录。"
                : activeView === "plan"
                  ? "查看已排期的后续记录。"
                  : activeView === "done"
                    ? "浏览已完成与已归档记录。"
                    : "在一个工作台里整理全部待办与备忘。"}
            </div>
          </div>
          <button className="button-secondary" onClick={() => void loadWorkspace()}>
            刷新
          </button>
        </div>

        <ReminderBanner
          reminder={reminder}
          activeReminderHits={activeReminderHits}
          activeReminderTargetIds={activeReminderTargetIds}
          reminderExpanded={reminderExpanded}
          reminderSelectedIds={reminderSelectedIds}
          reminderSelectedOnly={reminderSelectedOnly}
          selectedId={selectedId}
          visibleReminderSelectedCount={visibleReminderSelectedCount}
          onToggleExpanded={() => setReminderExpanded((current) => !current)}
          onToggleSelectedOnly={() => setReminderSelectedOnly((current) => !current)}
          onSnoozeReminder={(minutes) => {
            void handleSnoozeReminder(minutes);
          }}
          onReschedule={(preset) => {
            void handleReminderReschedule(preset);
          }}
          onOpenCustom={openCustomReminderReschedule}
          onToggleSelectAll={toggleSelectAllReminderHits}
          onFocusRecord={focusRecordFromReminder}
          onToggleReminderSelection={toggleReminderSelection}
        />

        <div className="quick-add-row">
          <input
            ref={quickAddRef}
            className={`input${quickAddActive ? " input-spotlight" : ""}`}
            value={quickAdd}
            onChange={(event) => setQuickAdd(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleQuickAdd();
              }
            }}
            placeholder={`单行快速新增到「${currentTagName}」`}
          />
          <button className="button-primary" onClick={() => void handleQuickAdd()}>
            新增
          </button>
        </div>

        <div className="filters-row">
          <input
            ref={searchRef}
            className="input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="模糊检索标题或内容"
          />
          <select
            className="select"
            value={activeView === "done" ? "done" : activeView === "today" || activeView === "plan" ? "todo" : status}
            onChange={(event) => setStatus(event.target.value as WorkspaceStatusFilter)}
            disabled={activeView === "done" || activeView === "today" || activeView === "plan"}
          >
            <option value="todo">待处理</option>
            <option value="all">全部</option>
            <option value="done">已完成</option>
          </select>
          <select className="select" value={activeTagId} onChange={(event) => onTagFilterChange(event.target.value)}>
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

        <div className="list-toolbar">
          <div className="list-toolbar-meta">
            <span>{records.length} 条记录</span>
            {selectedCount > 0 ? <span>已选 {selectedCount} 条</span> : null}
            <span>快捷键帮助：⌘/Ctrl+/</span>
          </div>
          <div className="list-toolbar-actions">
            <button className="button-mini" onClick={openShortcutHelp}>
              快捷键
            </button>
            <button className="button-mini" onClick={toggleSelectAllVisible}>
              {visibleSelectedCount === records.length && records.length > 0 ? "清空全选" : "全选当前列表"}
            </button>
            {selectedCount > 0 ? (
              <button className="button-mini" onClick={() => setSelectedIds([])}>
                清空选择
              </button>
            ) : null}
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="selection-banner">
            <div>
              <div className="selection-title">批量处理已选记录</div>
              <div className="selection-text">你可以对当前选中的 {selectedCount} 条记录统一改期。</div>
            </div>
            <div className="reminder-actions">
              <button className="button-ghost" onClick={() => void handleReschedule("plus_1_hour")}>
                顺延 1 小时
              </button>
              <button className="button-ghost" onClick={() => void handleReschedule("today_18")}>
                今晚 18:00
              </button>
              <button className="button-primary" onClick={() => void handleReschedule("tomorrow_09")}>
                明早 09:00
              </button>
            </div>
          </div>
        ) : null}

        {message ? <div className={`inline-message${runtimeNotice?.tone === "warning" ? " inline-message-warning" : ""}`}>{message}</div> : null}

        <NotificationDebugPanel
          entries={notificationDebugFeed}
          open={notificationDebugOpen}
          onToggleOpen={() => setNotificationDebugOpen((current) => !current)}
          onExport={handleExportNotificationDebug}
          onClear={() => {
            void handleClearNotificationDebugPanel();
          }}
        />

        <div className="record-list">
          {loading ? <div className="empty-state">正在加载记录…</div> : null}

          {!loading && records.length === 0 ? <div className="empty-state">当前没有符合筛选条件的记录。</div> : null}

          {records.map((record) => {
            const recordTags = record.tags
              .map((tagRef) => tags.find((item) => item.id === tagRef))
              .filter((item): item is TagEntity => Boolean(item));

            return (
              <button
                key={record.id}
                ref={(node) => {
                  rowRefs.current[record.id] = node;
                }}
                className={`record-row${record.id === selectedId ? " record-row-active" : ""}${record.id === highlightedRecordId ? " record-row-highlighted" : ""}`}
                onClick={() => setSelectedId(record.id)}
              >
                <label
                  className="record-check"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(record.id)}
                    onChange={() => toggleSelection(record.id)}
                  />
                </label>
                <div className={`priority-pill priority-${record.priority.toLowerCase()}`}>{record.priority}</div>
                <div className="record-main">
                  <div className="record-topline">
                    <div className="record-title-wrap">
                      {record.isPinned ? <span className="pin-indicator">置顶</span> : null}
                      <div className="record-title-text">{record.title}</div>
                    </div>
                    <div className="record-meta">{record.status}</div>
                  </div>
                  <div className="record-bottomline">
                    <div className="record-tags">
                      {recordTags.map((tag) => (
                        <span key={tag.id} className="tag-chip">
                          {tag.name}
                        </span>
                      ))}
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
            );
          })}
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
                <div className="channel-panel-subtitle">
                  {selectedRecord.recordKind === "report" ? "报告记录" : selectedRecord.recordKind === "note" ? "备忘记录" : "待办记录"}
                </div>
              </div>
              <div className="detail-header-actions">
                <button className="button-ghost" disabled={saving} onClick={() => void handleGenerateSummary()}>
                  AI 摘要
                </button>
                <button className="button-ghost" disabled={saving} onClick={() => void handlePolishMarkdown()}>
                  AI 润色
                </button>
                <button className="button-ghost" onClick={openTagManager}>
                  管理标签
                </button>
                <button className="button-ghost" onClick={() => void handleArchive(selectedRecord.id)}>
                  归档
                </button>
                <button className="button-ghost button-danger-soft" onClick={() => void handleDelete(selectedRecord.id)}>
                  删除
                </button>
                <button className="button-ghost" onClick={closeInspector}>
                  收起
                </button>
                <button className="button-primary" disabled={saving || !draftDirty} onClick={() => void handleSave()}>
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
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
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
                          onClick={() => setDraft({ ...draft, status: option })}
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
                          onClick={() => setDraft({ ...draft, priority: option })}
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
                          onChange={(event) => setDraft({ ...draft, isPinned: event.target.checked })}
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
                      onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })}
                    />
                    <div className="quick-chip-row">
                      <button className="button-mini" onClick={() => setDraft({ ...draft, dueAt: toInputValue(resolvePresetDate("today_18")) })}>
                        今晚 18:00
                      </button>
                      <button className="button-mini" onClick={() => setDraft({ ...draft, dueAt: toInputValue(resolvePresetDate("tomorrow_09")) })}>
                        明早 09:00
                      </button>
                      <button className="button-mini" onClick={() => setDraft({ ...draft, dueAt: "" })}>
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
                      onChange={(event) => setDraft({ ...draft, plannedAt: event.target.value })}
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
                            onChange={() => toggleTag(tag.id)}
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
                        onClick={() => setContentMode("edit")}
                        type="button"
                      >
                        编辑
                      </button>
                      <button
                        className={`segmented-item${contentMode === "preview" ? " segmented-item-active" : ""}`}
                        onClick={() => setContentMode("preview")}
                        type="button"
                      >
                        预览
                      </button>
                    </div>

                    {contentMode === "edit" ? (
                      <textarea
                        className="textarea"
                        value={draft.contentMarkdown}
                        onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })}
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

      {tagManagerOpen ? (
        <div className="sheet-backdrop" onClick={() => setTagManagerOpen(false)}>
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
                <button
                  className="button-mini"
                  onClick={() =>
                    setTagEditor({
                      id: null,
                      name: "",
                      color: "#5f89ff",
                    })
                  }
                >
                  新建标签
                </button>
                <button className="button-ghost" onClick={() => setTagManagerOpen(false)}>
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
                      onChange={() => toggleTag(tag.id)}
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
                      onClick={() => startEditTag(tag)}
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
                      onChange={(event) => setTagEditor({ ...tagEditor, name: event.target.value })}
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
                        onChange={(event) => setTagEditor({ ...tagEditor, color: event.target.value })}
                      />
                      <span className="color-field-value">{tagEditor.color.toUpperCase()}</span>
                    </div>
                  </label>
                  <div className="sheet-actions">
                    <button className="button-primary" onClick={() => void handleCreateOrUpdateTag()}>
                      {editingTag ? "保存标签" : "新建标签"}
                    </button>
                    {editingTag ? (
                      <>
                        <button
                          className="button-ghost"
                          onClick={() =>
                            setTagEditor({
                              id: null,
                              name: "",
                              color: "#5f89ff",
                            })
                          }
                        >
                          取消编辑
                        </button>
                        <button
                          className="button-ghost button-danger-soft"
                          disabled={editingTag.isSystem}
                          onClick={() => void handleDeleteTag(editingTag)}
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
      ) : null}

      {customReminderTimeOpen ? (
        <div className="sheet-backdrop" onClick={() => setCustomReminderTimeOpen(false)}>
          <div
            className="sheet-panel sheet-panel-compact"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="sheet-header">
              <div>
                <div className="panel-kicker">自定义改期</div>
                <h3 className="panel-title panel-title-small">提醒命中时间调整</h3>
                <div className="channel-panel-subtitle">
                  {reminderSelectedOnly && reminderSelectedIds.length > 0
                    ? `仅调整已勾选的 ${reminderSelectedIds.length} 条命中任务`
                    : `默认调整当前提醒命中的 ${activeReminderTargetIds.length} 条任务`}
                </div>
              </div>
              <button className="button-ghost" onClick={() => setCustomReminderTimeOpen(false)}>
                关闭
              </button>
            </div>

            <div className="sheet-section">
              <div className="sheet-form">
                <label className="field">
                  <span className="field-label">新的截止时间</span>
                  <input
                    className="input"
                    type="datetime-local"
                    value={customReminderDueAt}
                    onChange={(event) => setCustomReminderDueAt(event.target.value)}
                  />
                </label>
                <div className="quick-chip-row">
                  <button className="button-mini" onClick={() => applyCustomReminderPreset("plus_1_hour")}>
                    1 小时后
                  </button>
                  <button className="button-mini" onClick={() => applyCustomReminderPreset("today_18")}>
                    今晚 18:00
                  </button>
                  <button className="button-mini" onClick={() => applyCustomReminderPreset("tomorrow_09")}>
                    明早 09:00
                  </button>
                  <button className="button-mini" onClick={() => applyCustomReminderPreset("friday_18")}>
                    本周五 18:00
                  </button>
                  <button className="button-mini" onClick={() => applyCustomReminderPreset("next_monday_09")}>
                    下周一 09:00
                  </button>
                </div>
                {customReminderValidation.length > 0 ? (
                  <div className="inline-message inline-message-warning">
                    <div className="validation-title">保存前请先处理以下问题：</div>
                    <ul className="validation-list">
                      {customReminderValidation.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="sheet-actions">
                  <button
                    className="button-primary"
                    disabled={customReminderValidation.length > 0}
                    onClick={() => void handleSubmitCustomReminderReschedule()}
                  >
                    保存改期
                  </button>
                  <button className="button-ghost" onClick={() => setCustomReminderTimeOpen(false)}>
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ShortcutHelpSheet open={shortcutHelpOpen} shortcuts={WORKSPACE_SHORTCUT_ITEMS} onClose={closeShortcutHelp} />
    </div>
  );
}

function createExportTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
