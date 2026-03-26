import type { RecordEntity, TagEntity } from "@timeaura-core";

import type { WorkspaceListPanelContract } from "../contracts";
import type { WorkspacePriorityFilter, WorkspaceSort, WorkspaceStatusFilter } from "../types";
import { formatDateLabel } from "../utils";
import { NotificationDebugPanel } from "./NotificationDebugPanel";
import { ReminderBanner } from "./ReminderBanner";

export type WorkspaceListPanelProps = WorkspaceListPanelContract;

const PRIORITY_OPTIONS: WorkspacePriorityFilter[] = ["all", "P1", "P2", "P3", "P4"];

export function WorkspaceListPanel({
  activeTagId,
  activeView,
  currentTagName,
  keyword,
  status,
  priority,
  sortBy,
  tags,
  records,
  selectedId,
  selectedIds,
  selectedCount,
  visibleSelectedCount,
  highlightedRecordId,
  loading,
  message,
  runtimeNoticeTone,
  reminder,
  activeReminderHits,
  activeReminderTargetIds,
  reminderExpanded,
  reminderSelectedIds,
  reminderSelectedOnly,
  visibleReminderSelectedCount,
  notificationDebugFeed,
  notificationDebugOpen,
  searchRef,
  rowRefs,
  onRefresh,
  onKeywordChange,
  onStatusChange,
  onPriorityChange,
  onTagFilterChange,
  onSortByChange,
  onOpenShortcutHelp,
  onToggleSelectAllVisible,
  onClearSelection,
  onBatchReschedule,
  onToggleNotificationDebug,
  onExportNotificationDebug,
  onClearNotificationDebug,
  onToggleReminderExpanded,
  onToggleReminderSelectedOnly,
  onSnoozeReminder,
  onReminderReschedule,
  onOpenCustomReminderReschedule,
  onToggleSelectAllReminderHits,
  onFocusRecordFromReminder,
  onToggleReminderSelection,
  onSelectRecord,
  onToggleSelection,
  onCompleteRecord,
}: WorkspaceListPanelProps): JSX.Element {
  const effectiveStatus =
    activeView === "done" ? "done" : activeView === "today" || activeView === "plan" ? "todo" : status;
  const statusLocked = activeView === "done" || activeView === "today" || activeView === "plan";
  const pendingCount = records.filter((record) => !isDoneRecord(record)).length;
  const urgentCount = records.filter((record) => isUrgentRecord(record)).length;
  const doneCount = records.filter((record) => record.status === "已完成").length;
  const titleCopy = getWorkspaceCopy(activeView, currentTagName);

  return (
    <section className="panel panel-list panel-list-shell workspace-list-pane">
      <div className="page-header workspace-page-header">
        <div>
          <h1 className="workspace-page-title">{titleCopy.title}</h1>
          <p className="workspace-page-subtitle">{titleCopy.subtitle}</p>
        </div>

        <div className="summary-pills">
          <div className="summary-pill">
            <strong>{pendingCount}</strong>
            <span>未完成</span>
          </div>
          <div className="summary-pill">
            <strong>{urgentCount}</strong>
            <span>即将到期</span>
          </div>
          <div className="summary-pill">
            <strong>{doneCount}</strong>
            <span>{activeView === "today" ? "今日完成" : "已完成"}</span>
          </div>
        </div>
      </div>

      <div className="workspace-toolbar-shell">
        <div className="workspace-toolbar-row">
          <label className="search-box workspace-search-box">
            <SearchIcon />
            <input
              ref={searchRef}
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="模糊检索标题、正文、标签"
            />
          </label>

          <div className="workspace-filter-group workspace-filter-group-status">
            <span className="workspace-filter-label">状态</span>
            {[
              { id: "all", label: "全部" },
              { id: "todo", label: "未完成" },
              { id: "done", label: "已完成" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                className={`filter-chip${effectiveStatus === option.id ? " filter-chip-active" : ""}`}
                disabled={statusLocked}
                onClick={() => onStatusChange(option.id as WorkspaceStatusFilter)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            className="select workspace-filter-select workspace-filter-select-sort"
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as WorkspaceSort)}
          >
            <option value="smart">智能排序</option>
            <option value="due">截止时间</option>
            <option value="priority">优先级</option>
            <option value="updated">更新时间</option>
          </select>
        </div>

        <div className="workspace-toolbar-row workspace-toolbar-row-secondary">
          <div className="workspace-filter-group workspace-filter-group-priority">
            <span className="workspace-filter-label">优先级</span>
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`filter-chip${priority === option ? " filter-chip-active" : ""}`}
                onClick={() => onPriorityChange(option)}
              >
                {option === "all" ? "全部" : option}
              </button>
            ))}
          </div>

          <div className="workspace-filter-group workspace-filter-group-tag">
            <span className="workspace-filter-label">标签</span>
            <select
              className="select workspace-filter-select workspace-filter-select-tag"
              value={activeTagId}
              onChange={(event) => onTagFilterChange(event.target.value)}
            >
              <option value="all">全部标签</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>
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
        onToggleExpanded={onToggleReminderExpanded}
        onToggleSelectedOnly={onToggleReminderSelectedOnly}
        onSnoozeReminder={onSnoozeReminder}
        onReschedule={onReminderReschedule}
        onOpenCustom={onOpenCustomReminderReschedule}
        onToggleSelectAll={onToggleSelectAllReminderHits}
        onFocusRecord={onFocusRecordFromReminder}
        onToggleReminderSelection={onToggleReminderSelection}
      />

      {message ? <div className={`inline-message${runtimeNoticeTone === "warning" ? " inline-message-warning" : ""}`}>{message}</div> : null}

      <NotificationDebugPanel
        entries={notificationDebugFeed}
        open={notificationDebugOpen}
        onToggleOpen={onToggleNotificationDebug}
        onExport={onExportNotificationDebug}
        onClear={onClearNotificationDebug}
      />

      <div className="card workspace-task-list-card">
        <div className="workspace-list-card-toolbar">
          <div className="list-toolbar-meta">
            <span>{records.length} 条记录</span>
            {selectedCount > 0 ? <span>已选 {selectedCount} 条</span> : null}
            <span>当前标签：{currentTagName}</span>
          </div>

          <div className="list-toolbar-actions">
            <button className="button-mini" onClick={onRefresh}>
              刷新
            </button>
            <button className="button-mini" onClick={onOpenShortcutHelp}>
              快捷键
            </button>
            <button className="button-mini" onClick={onToggleSelectAllVisible}>
              {visibleSelectedCount === records.length && records.length > 0 ? "清空全选" : "全选当前列表"}
            </button>
            {selectedCount > 0 ? (
              <button className="button-mini" onClick={onClearSelection}>
                清空选择
              </button>
            ) : null}
          </div>
        </div>

        <div className="record-list workspace-record-list">
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
                className={`record-row workspace-record-row${record.id === selectedId ? " record-row-active" : ""}${record.id === highlightedRecordId ? " record-row-highlighted" : ""}${isDoneRecord(record) ? " workspace-record-row-done" : ""}`}
                onClick={() => onSelectRecord(record.id)}
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
                    onChange={() => onToggleSelection(record.id)}
                  />
                </label>

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
                  </div>
                </div>

                <div className="record-side-meta">
                  <div className={`priority-pill priority-${record.priority.toLowerCase()}`}>{record.priority}</div>
                  <div className="record-due">{formatDateLabel(record.dueAt)}</div>
                </div>

                <div className="record-actions">
                  {record.status !== "已完成" ? (
                    <span
                      className="button-mini"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCompleteRecord(record.id);
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

        {selectedCount > 0 ? (
          <div className="selection-banner workspace-selection-banner">
            <div>
              <div className="selection-title">批量处理已选记录</div>
              <div className="selection-text">支持对当前选中的 {selectedCount} 条记录统一改期。</div>
            </div>
            <div className="reminder-actions">
              <button className="button-ghost" onClick={() => onBatchReschedule("plus_1_hour")}>
                顺延 1 小时
              </button>
              <button className="button-ghost" onClick={() => onBatchReschedule("today_18")}>
                今晚 18:00
              </button>
              <button className="button-primary" onClick={() => onBatchReschedule("tomorrow_09")}>
                明早 09:00
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function isDoneRecord(record: RecordEntity): boolean {
  return record.status === "已完成" || record.status === "已归档";
}

function isUrgentRecord(record: RecordEntity): boolean {
  if (isDoneRecord(record) || !record.dueAt) {
    return false;
  }

  const dueAt = Date.parse(record.dueAt);

  if (Number.isNaN(dueAt)) {
    return false;
  }

  return dueAt <= Date.now() + 24 * 60 * 60 * 1000;
}

function getWorkspaceCopy(activeView: WorkspaceListPanelProps["activeView"], currentTagName: string): {
  title: string;
  subtitle: string;
} {
  if (activeView === "today") {
    return {
      title: "今天",
      subtitle: "把今天最值得推进的事项留在眼前。",
    };
  }

  if (activeView === "plan") {
    return {
      title: "计划",
      subtitle: "优先处理已进入节奏、需要尽快推进的事项。",
    };
  }

  if (activeView === "done") {
    return {
      title: "已完成",
      subtitle: "回看已经收口的事项，方便复盘与报告汇总。",
    };
  }

  return {
    title: currentTagName === "全部标签" ? "全部记录" : currentTagName,
    subtitle: currentTagName === "全部标签" ? "从统一列表里快速调整优先级、时间和状态。" : "基于标签聚焦同一主题下的所有事项。",
  };
}

function SearchIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}
