import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RecordEntity, RecordPriority, RecordStatus, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";
import { CustomReminderSheet } from "./components/CustomReminderSheet";
import { ShortcutHelpSheet } from "./components/ShortcutHelpSheet";
import { TagManagerSheet } from "./components/TagManagerSheet";
import { WorkspaceDetailInspector } from "./components/WorkspaceDetailInspector";
import { WorkspaceListPanel } from "./components/WorkspaceListPanel";
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
import { fromInputValue, resolvePresetDate, sameTags, toInputValue } from "./utils";

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
      <WorkspaceListPanel
        activeTagId={activeTagId}
        activeView={activeView}
        currentTagName={currentTagName}
        quickAdd={quickAdd}
        keyword={keyword}
        status={status}
        sortBy={sortBy}
        tags={tags}
        records={records}
        selectedId={selectedId}
        selectedIds={selectedIds}
        selectedCount={selectedCount}
        visibleSelectedCount={visibleSelectedCount}
        highlightedRecordId={highlightedRecordId}
        loading={loading}
        quickAddActive={quickAddActive}
        message={message}
        runtimeNoticeTone={runtimeNotice?.tone}
        reminder={reminder}
        activeReminderHits={activeReminderHits}
        activeReminderTargetIds={activeReminderTargetIds}
        reminderExpanded={reminderExpanded}
        reminderSelectedIds={reminderSelectedIds}
        reminderSelectedOnly={reminderSelectedOnly}
        visibleReminderSelectedCount={visibleReminderSelectedCount}
        notificationDebugFeed={notificationDebugFeed}
        notificationDebugOpen={notificationDebugOpen}
        quickAddRef={quickAddRef}
        searchRef={searchRef}
        rowRefs={rowRefs}
        onRefresh={() => {
          void loadWorkspace();
        }}
        onQuickAddChange={setQuickAdd}
        onQuickAddSubmit={() => {
          void handleQuickAdd();
        }}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onTagFilterChange={onTagFilterChange}
        onSortByChange={setSortBy}
        onOpenShortcutHelp={openShortcutHelp}
        onToggleSelectAllVisible={toggleSelectAllVisible}
        onClearSelection={() => setSelectedIds([])}
        onBatchReschedule={(preset) => {
          void handleReschedule(preset);
        }}
        onToggleNotificationDebug={() => setNotificationDebugOpen((current) => !current)}
        onExportNotificationDebug={handleExportNotificationDebug}
        onClearNotificationDebug={() => {
          void handleClearNotificationDebugPanel();
        }}
        onToggleReminderExpanded={() => setReminderExpanded((current) => !current)}
        onToggleReminderSelectedOnly={() => setReminderSelectedOnly((current) => !current)}
        onSnoozeReminder={(minutes) => {
          void handleSnoozeReminder(minutes);
        }}
        onReminderReschedule={(preset) => {
          void handleReminderReschedule(preset);
        }}
        onOpenCustomReminderReschedule={openCustomReminderReschedule}
        onToggleSelectAllReminderHits={toggleSelectAllReminderHits}
        onFocusRecordFromReminder={focusRecordFromReminder}
        onToggleReminderSelection={toggleReminderSelection}
        onSelectRecord={setSelectedId}
        onToggleSelection={toggleSelection}
        onCompleteRecord={(recordId) => {
          void handleComplete(recordId);
        }}
      />

      <WorkspaceDetailInspector
        selectedRecord={selectedRecord}
        draft={draft}
        tags={tags}
        contentMode={contentMode}
        saving={saving}
        draftDirty={draftDirty}
        onGenerateSummary={() => {
          void handleGenerateSummary();
        }}
        onPolishMarkdown={() => {
          void handlePolishMarkdown();
        }}
        onOpenTagManager={openTagManager}
        onArchive={(recordId) => {
          void handleArchive(recordId);
        }}
        onDelete={(recordId) => {
          void handleDelete(recordId);
        }}
        onClose={closeInspector}
        onSave={() => {
          void handleSave();
        }}
        onDraftChange={setDraft}
        onToggleTag={toggleTag}
        onContentModeChange={setContentMode}
      />

      <TagManagerSheet
        open={tagManagerOpen}
        tags={tags}
        draft={draft}
        tagEditor={tagEditor}
        editingTag={editingTag}
        onClose={() => setTagManagerOpen(false)}
        onResetEditor={() =>
          setTagEditor({
            id: null,
            name: "",
            color: "#5f89ff",
          })
        }
        onToggleTag={toggleTag}
        onSelectTag={startEditTag}
        onTagEditorChange={setTagEditor}
        onSubmit={() => {
          void handleCreateOrUpdateTag();
        }}
        onDelete={(tag) => {
          void handleDeleteTag(tag);
        }}
      />

      <CustomReminderSheet
        open={customReminderTimeOpen}
        reminderSelectedOnly={reminderSelectedOnly}
        reminderSelectedIds={reminderSelectedIds}
        activeReminderTargetIds={activeReminderTargetIds}
        customReminderDueAt={customReminderDueAt}
        customReminderValidation={customReminderValidation}
        onClose={() => setCustomReminderTimeOpen(false)}
        onChangeDueAt={setCustomReminderDueAt}
        onApplyPreset={applyCustomReminderPreset}
        onSubmit={() => {
          void handleSubmitCustomReminderReschedule();
        }}
      />

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
