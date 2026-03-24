import type { MutableRefObject, RefObject } from "react";

import type { RecordEntity, ReminderHit, ReminderSummary, TagEntity } from "@timeaura-core";

import type { WorkspaceListPanelContract } from "../contracts";
import { NotificationDebugPanel } from "./NotificationDebugPanel";
import { ReminderBanner } from "./ReminderBanner";
import type { NotificationDebugEntry, WorkspaceSort, WorkspaceStatusFilter } from "../types";
import { formatDateLabel } from "../utils";

export type WorkspaceListPanelProps = WorkspaceListPanelContract;

export function WorkspaceListPanel({
  activeTagId,
  activeView,
  currentTagName,
  quickAdd,
  keyword,
  status,
  sortBy,
  tags,
  records,
  selectedId,
  selectedIds,
  selectedCount,
  visibleSelectedCount,
  highlightedRecordId,
  loading,
  quickAddActive,
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
  quickAddRef,
  searchRef,
  rowRefs,
  onRefresh,
  onQuickAddChange,
  onQuickAddSubmit,
  onKeywordChange,
  onStatusChange,
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
  return (
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
        <button className="button-secondary" onClick={onRefresh}>
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
        onToggleExpanded={onToggleReminderExpanded}
        onToggleSelectedOnly={onToggleReminderSelectedOnly}
        onSnoozeReminder={onSnoozeReminder}
        onReschedule={onReminderReschedule}
        onOpenCustom={onOpenCustomReminderReschedule}
        onToggleSelectAll={onToggleSelectAllReminderHits}
        onFocusRecord={onFocusRecordFromReminder}
        onToggleReminderSelection={onToggleReminderSelection}
      />

      <div className="quick-add-row">
        <input
          ref={quickAddRef}
          className={`input${quickAddActive ? " input-spotlight" : ""}`}
          value={quickAdd}
          onChange={(event) => onQuickAddChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onQuickAddSubmit();
            }
          }}
          placeholder={`单行快速新增到「${currentTagName}」`}
        />
        <button className="button-primary" onClick={onQuickAddSubmit}>
          新增
        </button>
      </div>

      <div className="filters-row">
        <input
          ref={searchRef}
          className="input"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="模糊检索标题或内容"
        />
        <select
          className="select"
          value={activeView === "done" ? "done" : activeView === "today" || activeView === "plan" ? "todo" : status}
          onChange={(event) => onStatusChange(event.target.value as WorkspaceStatusFilter)}
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
        <select className="select" value={sortBy} onChange={(event) => onSortByChange(event.target.value as WorkspaceSort)}>
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

      {selectedCount > 0 ? (
        <div className="selection-banner">
          <div>
            <div className="selection-title">批量处理已选记录</div>
            <div className="selection-text">你可以对当前选中的 {selectedCount} 条记录统一改期。</div>
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

      {message ? <div className={`inline-message${runtimeNoticeTone === "warning" ? " inline-message-warning" : ""}`}>{message}</div> : null}

      <NotificationDebugPanel
        entries={notificationDebugFeed}
        open={notificationDebugOpen}
        onToggleOpen={onToggleNotificationDebug}
        onExport={onExportNotificationDebug}
        onClear={onClearNotificationDebug}
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
    </section>
  );
}
