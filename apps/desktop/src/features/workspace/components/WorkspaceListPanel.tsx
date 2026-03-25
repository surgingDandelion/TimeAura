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
  const effectiveStatus =
    activeView === "done" ? "done" : activeView === "today" || activeView === "plan" ? "todo" : status;
  const statusLocked = activeView === "done" || activeView === "today" || activeView === "plan";

  return (
    <section className="panel panel-list panel-list-shell">
      <div className="panel-header panel-header-list">
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

      <div className="panel-list-body">
        <div className={`quick-add-card${quickAddActive ? " quick-add-card-active" : ""}`}>
          <div className="quick-add-row">
            <input
              ref={quickAddRef}
              className={`input quick-add-input${quickAddActive ? " input-spotlight" : ""}`}
              value={quickAdd}
              onChange={(event) => onQuickAddChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onQuickAddSubmit();
                }
              }}
              placeholder={`单行快速新增到「${currentTagName}」：例如 明天 18:00 #工作 和设计评审`}
            />
            <button className="button-primary quick-add-submit" onClick={onQuickAddSubmit}>
              新增
            </button>
          </div>
          <div className="quick-add-meta">
            <div className="quick-add-hints">
              <span className="tag-chip">#标签</span>
              <span className="tag-chip">!P1</span>
              <span className="tag-chip">@明早 09:00</span>
            </div>
            <span>回车立即创建，连续记录不打断思路</span>
          </div>
        </div>

        <div className="workspace-toolbar">
          <label className="search-box">
            <SearchIcon />
            <input
              ref={searchRef}
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="模糊检索标题、正文、标签"
            />
          </label>

          <div className="filter-strip">
            <div className="filter-group">
              <span className="filter-group-label">状态</span>
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

            <div className="filter-select-row">
              <select className="select select-compact" value={activeTagId} onChange={(event) => onTagFilterChange(event.target.value)}>
                <option value="all">全部标签</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <select className="select select-compact" value={sortBy} onChange={(event) => onSortByChange(event.target.value as WorkspaceSort)}>
                <option value="smart">智能排序</option>
                <option value="due">截止时间</option>
                <option value="priority">优先级</option>
                <option value="updated">更新时间</option>
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
      </div>
    </section>
  );
}

function SearchIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </svg>
  );
}
