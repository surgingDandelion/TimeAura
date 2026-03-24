import { useCallback, useEffect, useMemo, useState } from "react";

import type { TagCountItem } from "@timeaura-core";

import { useAppServices } from "./providers/AppServicesProvider";
import { ChannelStudioPage } from "../features/channels/ChannelStudioPage";
import { ReportStudioPage } from "../features/reports/ReportStudioPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";

type AppPage = "workspace" | "reports" | "channels";
type WorkspaceSystemView = "today" | "plan" | "all" | "done";

interface WorkspaceFocusTarget {
  recordId: string;
  nonce: number;
}

interface WorkspaceQuickAddTarget {
  nonce: number;
}

interface WorkspaceRuntimeNotice {
  text: string;
  tone: "info" | "warning";
  nonce: number;
}

interface WorkspaceSidebarCounts {
  today: number;
  plan: number;
  all: number;
  done: number;
}

interface NotificationActionEventPayload {
  actionId?: string;
  extra?: Record<string, unknown>;
}

export function AppShell(): JSX.Element {
  const { runtime, services } = useAppServices();
  const [page, setPage] = useState<AppPage>("workspace");
  const [workspaceCounts, setWorkspaceCounts] = useState<WorkspaceSidebarCounts>({
    today: 0,
    plan: 0,
    all: 0,
    done: 0,
  });
  const [sidebarTags, setSidebarTags] = useState<TagCountItem[]>([]);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceSystemView>("all");
  const [workspaceTagId, setWorkspaceTagId] = useState<string>("all");
  const [workspaceFocusTarget, setWorkspaceFocusTarget] = useState<WorkspaceFocusTarget | null>(null);
  const [workspaceQuickAddTarget, setWorkspaceQuickAddTarget] = useState<WorkspaceQuickAddTarget | null>(null);
  const [workspaceRuntimeNotice, setWorkspaceRuntimeNotice] = useState<WorkspaceRuntimeNotice | null>(null);

  const loadSidebarData = useCallback(async () => {
    const [tagCounts, todayRecords, planRecords, allRecords, doneRecords] = await Promise.all([
      services.tagService.listTagsWithCounts(false),
      services.recordService.listRecords({ status: "todo", view: "today" }),
      services.recordService.listRecords({ status: "todo", view: "plan" }),
      services.recordService.listRecords({ status: "todo", view: "all" }),
      services.recordService.listRecords({ status: "done", view: "done" }),
    ]);

    setSidebarTags(tagCounts);
    setWorkspaceCounts({
      today: todayRecords.total,
      plan: planRecords.total,
      all: allRecords.total,
      done: doneRecords.total,
    });
  }, [services.recordService, services.tagService]);

  const handleWorkspaceChanged = useCallback(async () => {
    await Promise.all([
      loadSidebarData(),
      services.notificationService.scheduleReminderNotifications(),
    ]);
  }, [loadSidebarData, services.notificationService]);

  const routeToWorkspaceRecord = useCallback((recordId: string) => {
    setPage("workspace");
    setWorkspaceView("all");
    setWorkspaceTagId("all");
    setWorkspaceFocusTarget({
      recordId,
      nonce: Date.now(),
    });
  }, []);

  const handleNotificationAction = useCallback(
    async (payload: NotificationActionEventPayload) => {
      const extra = payload.extra ?? {};
      const recordIds = Array.isArray(extra.recordIds)
        ? extra.recordIds.filter((value): value is string => typeof value === "string")
        : [];
      const primaryRecordId =
        typeof extra.recordId === "string" ? extra.recordId : recordIds[0] ?? null;

      try {
        switch (payload.actionId) {
          case "complete":
            if (primaryRecordId) {
              await services.recordService.completeRecord(primaryRecordId);
              await handleWorkspaceChanged();
              routeToWorkspaceRecord(primaryRecordId);
              setWorkspaceRuntimeNotice({
                text: "已通过桌面通知完成任务",
                tone: "info",
                nonce: Date.now(),
              });
            }
            return;

          case "snooze_30":
            if (recordIds.length > 0 || primaryRecordId) {
              await services.reminderService.snoozeReminder(
                recordIds.length > 0 ? recordIds : [primaryRecordId as string],
                30,
              );
              await handleWorkspaceChanged();
              if (primaryRecordId) {
                routeToWorkspaceRecord(primaryRecordId);
              }
              setWorkspaceRuntimeNotice({
                text: "已通过桌面通知延后 30 分钟提醒",
                tone: "info",
                nonce: Date.now(),
              });
            }
            return;

          case "open_detail":
          case "notification_click":
          default:
            if (primaryRecordId) {
              routeToWorkspaceRecord(primaryRecordId);
              setWorkspaceRuntimeNotice({
                text: "已从桌面通知回到对应记录",
                tone: "info",
                nonce: Date.now(),
              });
            }
        }
      } catch (_error) {
        if (primaryRecordId) {
          routeToWorkspaceRecord(primaryRecordId);
        } else {
          setPage("workspace");
        }

        setWorkspaceRuntimeNotice({
          text: "通知动作处理失败，请在工作台中手动继续操作",
          tone: "warning",
          nonce: Date.now(),
        });
        await handleWorkspaceChanged();
      }
    },
    [handleWorkspaceChanged, routeToWorkspaceRecord, services.recordService, services.reminderService],
  );

  useEffect(() => {
    if (!workspaceRuntimeNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setWorkspaceRuntimeNotice((current) =>
        current?.nonce === workspaceRuntimeNotice.nonce ? null : current,
      );
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [workspaceRuntimeNotice]);

  useEffect(() => {
    void loadSidebarData();
  }, [loadSidebarData]);

  useEffect(() => {
    void services.notificationService.scheduleReminderNotifications();

    const interval = window.setInterval(() => {
      void services.notificationService.scheduleReminderNotifications();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [services.notificationService]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let disposed = false;
    let unsubscribeAction: (() => void) | undefined;
    let unsubscribeDesktopAction: (() => void) | undefined;

    void Promise.all([
      import("@tauri-apps/plugin-notification"),
      import("@tauri-apps/api/event"),
    ]).then(async ([notification, event]) => {
      if (disposed) {
        return;
      }

      const listener = await notification.onAction((payload) => {
        void handleNotificationAction({
          actionId: "notification_click",
          extra: payload.extra ?? {},
        });
      });
      const desktopListener = await event.listen<NotificationActionEventPayload>(
        "timeaura://notification-action",
        (payload) => {
          void handleNotificationAction(payload.payload);
        },
      );

      unsubscribeAction = () => {
        void listener.unregister();
      };
      unsubscribeDesktopAction = () => {
        void desktopListener();
      };
    });

    return () => {
      disposed = true;
      unsubscribeAction?.();
      unsubscribeDesktopAction?.();
    };
  }, [handleNotificationAction]);

  const sidebarSummary = useMemo(
    () => ({
      runtimeLabel: runtime ? "Mock Runtime" : "SQLite Runtime",
      serviceReady: services.channelService ? "已就绪" : "未就绪",
    }),
    [runtime, services.channelService],
  );

  const shellTitle = useMemo(() => {
    if (page === "reports") {
      return {
        kicker: "AI 报告",
        title: "时间范围报告工作台",
      };
    }

    if (page === "channels") {
      return {
        kicker: "通道配置",
        title: "AI Channel Studio",
      };
    }

    return {
      kicker: "备忘录",
      title: "统一记录工作台",
    };
  }, [page]);

  function openWorkspaceView(view: WorkspaceSystemView): void {
    setPage("workspace");
    setWorkspaceView(view);
  }

  function triggerQuickAdd(): void {
    setPage("workspace");
    setWorkspaceView("all");
    setWorkspaceTagId("all");
    setWorkspaceFocusTarget(null);
    setWorkspaceQuickAddTarget({
      nonce: Date.now(),
    });
  }

  return (
    <div className="desktop-shell">
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <div className="desktop-title">TimeAura</div>
          <div className="desktop-subtitle">让每个重要时刻如约而至</div>
        </div>

        <nav className="desktop-nav">
          {[
            { id: "today", label: "今天", count: workspaceCounts.today },
            { id: "plan", label: "计划", count: workspaceCounts.plan },
            { id: "all", label: "全部", count: workspaceCounts.all },
            { id: "done", label: "已完成", count: workspaceCounts.done },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item${page === "workspace" && workspaceView === item.id ? " nav-item-active" : ""}`}
              onClick={() => openWorkspaceView(item.id as WorkspaceSystemView)}
            >
              <span>{item.label}</span>
              <span className="nav-badge">{item.count}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-title">标签</div>
          <div className="sidebar-tag-list">
            <button
              className={`sidebar-tag-item${page === "workspace" && workspaceTagId === "all" ? " sidebar-tag-item-active" : ""}`}
              onClick={() => {
                setPage("workspace");
                setWorkspaceTagId("all");
              }}
            >
              <span className="sidebar-tag-label">全部记录</span>
              <span className="sidebar-tag-count">{workspaceCounts.all}</span>
            </button>

            {sidebarTags.map((tag) => (
              <button
                key={tag.id}
                className={`sidebar-tag-item${page === "workspace" && workspaceTagId === tag.id ? " sidebar-tag-item-active" : ""}`}
                onClick={() => {
                  setPage("workspace");
                  setWorkspaceTagId(tag.id);
                }}
              >
                <span className="sidebar-tag-label">
                  <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                  <span>{tag.name}</span>
                </span>
                <span className="sidebar-tag-count">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="desktop-sidebar-footer">
          <div className="sidebar-footer-actions">
            <button
              className={`sidebar-icon-button${page === "reports" ? " sidebar-icon-button-active" : ""}`}
              onClick={() => setPage("reports")}
              title="AI 报告"
              aria-label="AI 报告"
            >
              <ReportIcon />
            </button>
            <button
              className={`sidebar-icon-button${page === "channels" ? " sidebar-icon-button-active" : ""}`}
              onClick={() => setPage("channels")}
              title="通道配置"
              aria-label="通道配置"
            >
              <ChannelIcon />
            </button>
            <button
              className="sidebar-icon-button"
              onClick={triggerQuickAdd}
              title="快速新增"
              aria-label="快速新增"
            >
              <QuickAddIcon />
            </button>
          </div>

          <div className="sidebar-foot-label">当前环境</div>
          <div className="sidebar-foot-value">{sidebarSummary.runtimeLabel}</div>
          <div className="sidebar-foot-label">服务接线</div>
          <div className="sidebar-foot-value">{sidebarSummary.serviceReady}</div>
        </div>
      </aside>

      <main className="desktop-main">
        <div className="desktop-main-header">
          <div>
            <div className="panel-kicker">{shellTitle.kicker}</div>
            <div className="desktop-main-title">{shellTitle.title}</div>
          </div>
          <button className="button-secondary" onClick={triggerQuickAdd}>
            快速新增
          </button>
        </div>

        {page === "workspace" ? (
          <WorkspacePage
            activeTagId={workspaceTagId}
            activeView={workspaceView}
            focusTarget={workspaceFocusTarget}
            quickAddTarget={workspaceQuickAddTarget}
            runtimeNotice={workspaceRuntimeNotice}
            onTagFilterChange={setWorkspaceTagId}
            onWorkspaceChanged={handleWorkspaceChanged}
          />
        ) : null}
        {page === "reports" ? <ReportStudioPage /> : null}
        {page === "channels" ? <ChannelStudioPage /> : null}
      </main>
    </div>
  );
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function ReportIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 4.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="M7.5 8h5M7.5 10.5h5M7.5 13h3" />
    </svg>
  );
}

function ChannelIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7.5 5.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm5 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
      <path d="M9.2 8.2 10.8 9.8M9.2 11.8 10.8 10.2M5.5 7.5H3.8M16.2 12.5h-1.7" />
    </svg>
  );
}

function QuickAddIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
