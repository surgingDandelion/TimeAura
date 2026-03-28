import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AppServices, TagCountItem } from "@timeaura-core";

import { useAppServices } from "./providers/AppServicesProvider";
import { ensureDesktopExperienceData } from "./bootstrap/ensureDesktopExperienceData";
import { ChannelStudioPage } from "../features/channels/ChannelStudioPage";
import { ReportStudioPage } from "../features/reports/ReportStudioPage";
import { TrashPage } from "../features/trash/TrashPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import type {
  NotificationActionEventPayload,
  NotificationDebugEntry,
  NotificationDebugEventDetail,
  WorkspaceFocusTarget,
  WorkspaceQuickAddTarget,
  WorkspaceRuntimeNotice,
  WorkspaceSystemView,
} from "../features/workspace/types";

type AppPage = "workspace" | "reports" | "channels" | "trash";
type ThemeMode = "light" | "dark";

interface WorkspaceSidebarCounts {
  today: number;
  plan: number;
  all: number;
  done: number;
}

interface SidebarListEditorDraft {
  id: string | null;
  name: string;
  color: string;
}

interface SidebarTagContextMenuState {
  tag: TagCountItem;
  x: number;
  y: number;
}

const WORKSPACE_VIEW_CARDS: Array<{
  id: WorkspaceSystemView;
  label: string;
  meta: string;
  accentClass: string;
}> = [
  { id: "today", label: "今天", meta: "今日焦点", accentClass: "nav-card-accent-today" },
  { id: "plan", label: "计划", meta: "提前排期", accentClass: "nav-card-accent-plan" },
  { id: "all", label: "全部", meta: "统一总览", accentClass: "nav-card-accent-all" },
  { id: "done", label: "已完成", meta: "完成沉淀", accentClass: "nav-card-accent-done" },
];

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || target.isContentEditable;
}

export function AppShell(): JSX.Element {
  const { runtime, services } = useAppServices();
  const reminderScanInFlightRef = useRef(false);
  const [workspaceBootstrapping, setWorkspaceBootstrapping] = useState(!runtime);
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
  const [notificationDebugEntries, setNotificationDebugEntries] = useState<NotificationDebugEntry[]>([]);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [workspaceDataVersion, setWorkspaceDataVersion] = useState(0);
  const [myListsOpen, setMyListsOpen] = useState(false);
  const [sidebarListDraft, setSidebarListDraft] = useState<SidebarListEditorDraft>({
    id: null,
    name: "",
    color: "#5f89ff",
  });
  const [sidebarTagContextMenu, setSidebarTagContextMenu] = useState<SidebarTagContextMenuState | null>(null);

  useEffect(() => {
    const handlePreventBrowserSelectAll = (event: KeyboardEvent) => {
      const commandPressed = event.metaKey || event.ctrlKey;

      if (!commandPressed || event.key.toLowerCase() !== "a") {
        return;
      }

      if (isTextEditingTarget(event.target)) {
        return;
      }

      event.preventDefault();
    };

    window.addEventListener("keydown", handlePreventBrowserSelectAll);

    return () => {
      window.removeEventListener("keydown", handlePreventBrowserSelectAll);
    };
  }, []);

  useEffect(() => {
    if (!sidebarTagContextMenu) {
      return;
    }

    const closeMenu = () => {
      setSidebarTagContextMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [sidebarTagContextMenu]);

  useEffect(() => {
    if (!sidebarListDraft.id) {
      return;
    }

    if (!sidebarTags.some((tag) => tag.id === sidebarListDraft.id)) {
      setSidebarListDraft({
        id: null,
        name: "",
        color: "#5f89ff",
      });
    }
  }, [sidebarListDraft.id, sidebarTags]);

  const pushNotificationDebug = useCallback((entry: Omit<NotificationDebugEntry, "id" | "at">) => {
    setNotificationDebugEntries((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        at: new Date().toISOString(),
        ...entry,
      },
      ...current,
    ].slice(0, 30));
  }, []);

  const clearNotificationDebug = useCallback(() => {
    setNotificationDebugEntries([]);

    if (runtime) {
      runtime.notifications = [];
    }
  }, [runtime]);

  const presentRuntimeNotice = useCallback((text: string, tone: WorkspaceRuntimeNotice["tone"]) => {
    setWorkspaceRuntimeNotice({
      text,
      tone,
      nonce: Date.now(),
    });
  }, []);

  const reportShellFailure = useCallback((
    title: string,
    fallbackText: string,
    error: unknown,
  ) => {
    const detail = error instanceof Error ? `${fallbackText}：${error.message}` : fallbackText;

    pushNotificationDebug({
      source: "driver",
      level: "error",
      title,
      detail,
    });
    presentRuntimeNotice(fallbackText, "warning");
  }, [presentRuntimeNotice, pushNotificationDebug]);

  const loadSidebarData = useCallback(async () => {
    try {
      const [tagCounts, todayRecords, planRecords, allRecords, doneRecords] = await Promise.all([
        services.tagService.listTagsWithCounts(false),
        services.recordService.listRecords({ status: "todo", view: "today" }),
        services.recordService.listRecords({ status: "todo", view: "plan" }),
        services.recordService.listRecords({ status: "todo", view: "all" }),
        services.recordService.listRecords({ status: "done", view: "done" }),
      ]);

      setSidebarTags(tagCounts.filter((tag) => !isHiddenListTag(tag)));
      setWorkspaceCounts({
        today: todayRecords.total,
        plan: planRecords.total,
        all: allRecords.total,
        done: doneRecords.total,
      });
    } catch (error) {
      reportShellFailure("侧栏刷新失败", "侧栏信息刷新失败，请稍后重试", error);
    }
  }, [reportShellFailure, services.recordService, services.tagService]);

  const scheduleReminderNotifications = useCallback(async () => {
    try {
      await services.notificationService.scheduleReminderNotifications();
    } catch (error) {
      reportShellFailure("提醒调度失败", "提醒通知调度失败，请稍后重试", error);
    }
  }, [reportShellFailure, services.notificationService]);

  const handleWorkspaceChanged = useCallback(async () => {
    await Promise.allSettled([
      loadSidebarData(),
      scheduleReminderNotifications(),
    ]);
    setWorkspaceDataVersion((current) => current + 1);
  }, [loadSidebarData, scheduleReminderNotifications]);

  const resetSidebarListDraft = useCallback(() => {
    setSidebarListDraft({
      id: null,
      name: "",
      color: "#5f89ff",
    });
  }, []);

  const closeMyLists = useCallback(() => {
    setMyListsOpen(false);
    resetSidebarListDraft();
  }, [resetSidebarListDraft]);

  const openMyListsCreate = useCallback(() => {
    setPage("workspace");
    setMyListsOpen(true);
    setSidebarTagContextMenu(null);
    resetSidebarListDraft();
  }, [resetSidebarListDraft]);

  const openMyListsEdit = useCallback((tag: TagCountItem) => {
    setPage("workspace");
    setMyListsOpen(true);
    setSidebarTagContextMenu(null);
    setSidebarListDraft({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    });
  }, []);

  const persistSidebarListDraft = useCallback(async (draftToPersist: SidebarListEditorDraft) => {
    const name = draftToPersist.name.trim();

    if (!name) {
      return;
    }

    try {
      if (draftToPersist.id) {
        await services.tagService.updateTag(draftToPersist.id, {
          name,
          color: draftToPersist.color,
        });
        await handleWorkspaceChanged();
        setWorkspaceTagId(draftToPersist.id);
        setSidebarListDraft((current) =>
          current.id === draftToPersist.id
            ? {
                ...current,
                name,
                color: draftToPersist.color,
              }
            : current,
        );
        return;
      }

      const created = await services.tagService.createTag({
        name,
        color: draftToPersist.color,
      });
      await handleWorkspaceChanged();
      setWorkspaceTagId(created.id);
      setSidebarListDraft({
        id: created.id,
        name: created.name,
        color: created.color,
      });
    } catch (error) {
      reportShellFailure("列表保存失败", "保存我的列表失败，请稍后重试", error);
    }
  }, [handleWorkspaceChanged, reportShellFailure, services.tagService]);

  const deleteSidebarList = useCallback(async (tag: TagCountItem) => {
    try {
      await services.tagService.deleteTag(tag.id);

      if (workspaceTagId === tag.id) {
        setWorkspaceTagId("all");
      }

      await handleWorkspaceChanged();
      setSidebarListDraft((current) => (current.id === tag.id ? { id: null, name: "", color: "#5f89ff" } : current));
    } catch (error) {
      reportShellFailure("列表删除失败", "删除我的列表失败，请稍后重试", error);
    }
  }, [handleWorkspaceChanged, reportShellFailure, services.tagService, workspaceTagId]);

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
              pushNotificationDebug({
                source: "action",
                level: "info",
                title: "通知动作：完成",
                detail: `记录 ${primaryRecordId} 已通过桌面通知标记为完成。`,
              });
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
              pushNotificationDebug({
                source: "action",
                level: "info",
                title: "通知动作：稍后提醒",
                detail: `已将 ${recordIds.length > 0 ? recordIds.length : 1} 条记录延后 30 分钟提醒。`,
              });
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
              pushNotificationDebug({
                source: "action",
                level: "info",
                title: payload.actionId === "notification_click" ? "通知点击回跳" : "通知动作：打开详情",
                detail: `已回到记录 ${primaryRecordId} 的工作台详情。`,
              });
              routeToWorkspaceRecord(primaryRecordId);
              setWorkspaceRuntimeNotice({
                text: "已从桌面通知回到对应记录",
                tone: "info",
                nonce: Date.now(),
              });
            }
        }
      } catch (_error) {
        pushNotificationDebug({
          source: "action",
          level: "error",
          title: "通知动作执行失败",
          detail: `动作 ${payload.actionId ?? "unknown"} 执行失败，已回退到工作台人工处理。`,
        });
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
    [handleWorkspaceChanged, pushNotificationDebug, routeToWorkspaceRecord, services.recordService, services.reminderService],
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
    let cancelled = false;

    void services.settingsService?.getAppSettings?.()
      .then((settings) => {
        if (cancelled || !settings?.theme) {
          return;
        }

        setTheme(settings.theme);
      })
      .catch(() => {
        // Keep the shell usable even when settings are unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [services.settingsService]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleDebugEvent = (event: Event) => {
      const detail = (event as CustomEvent<NotificationDebugEventDetail>).detail;

      pushNotificationDebug({
        source: "driver",
        level: detail?.level ?? "info",
        title: detail?.title ?? "通知调试事件",
        detail: detail?.detail ?? "无额外说明",
      });
    };

    window.addEventListener("timeaura:notification-debug", handleDebugEvent as EventListener);

    return () => {
      window.removeEventListener("timeaura:notification-debug", handleDebugEvent as EventListener);
    };
  }, [pushNotificationDebug]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const seedResult = runtime
          ? {
              seeded: false,
              recordIds: [],
              channelId: null,
            }
          : await ensureDesktopExperienceData(services);

        if (cancelled) {
          return;
        }

        const repairedCount = await repairWorkspaceRecordTags(services);

        if (cancelled) {
          return;
        }

        await loadSidebarData();
        setWorkspaceDataVersion((current) => current + 1);

        if (cancelled) {
          return;
        }

        if (seedResult.seeded) {
          presentRuntimeNotice("已自动准备演示数据，现在可以直接体验新增与提醒链路", "info");
        } else if (repairedCount > 0) {
          presentRuntimeNotice(`已修复 ${repairedCount} 条历史记录的列表归属`, "info");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        reportShellFailure("工作台初始化失败", "工作台初始化失败，请稍后重试", error);
      } finally {
        if (!cancelled) {
          setWorkspaceBootstrapping(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSidebarData, presentRuntimeNotice, reportShellFailure, runtime, services]);

  useEffect(() => {
    if (workspaceBootstrapping) {
      return;
    }

    void loadSidebarData();
  }, [loadSidebarData, workspaceBootstrapping]);

  useEffect(() => {
    if (workspaceBootstrapping) {
      return;
    }

    let disposed = false;
    let timer: number | null = null;

    const queueNextScan = (delayMs: number) => {
      if (disposed) {
        return;
      }

      timer = window.setTimeout(() => {
        void runReminderScan();
      }, delayMs);
    };

    const runReminderScan = async () => {
      if (disposed) {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        queueNextScan(60_000);
        return;
      }

      if (reminderScanInFlightRef.current) {
        queueNextScan(60_000);
        return;
      }

      reminderScanInFlightRef.current = true;

      try {
        await scheduleReminderNotifications();
      } finally {
        reminderScanInFlightRef.current = false;

        if (!disposed) {
          queueNextScan(60_000);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (disposed || typeof document === "undefined" || document.visibilityState !== "visible") {
        return;
      }

      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }

      void runReminderScan();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    void runReminderScan();

    return () => {
      disposed = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [scheduleReminderNotifications, workspaceBootstrapping]);

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
    ])
      .then(async ([notification, event]) => {
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
      })
      .catch((error) => {
        if (disposed) {
          return;
        }

        reportShellFailure("桌面通知接线失败", "桌面通知接线失败，请稍后重试", error);
      });

    return () => {
      disposed = true;
      unsubscribeAction?.();
      unsubscribeDesktopAction?.();
    };
  }, [handleNotificationAction, reportShellFailure]);

  const canTriggerQuickAdd = !workspaceBootstrapping;

  function openWorkspaceView(view: WorkspaceSystemView): void {
    setPage("workspace");
    setWorkspaceView(view);
  }

  function triggerQuickAdd(): void {
    if (workspaceBootstrapping) {
      setPage("workspace");
      presentRuntimeNotice("正在准备工作台数据，请稍候再试", "info");
      return;
    }

    setPage("workspace");
    setWorkspaceView("all");
    setWorkspaceTagId("all");
    setWorkspaceFocusTarget(null);
    setWorkspaceQuickAddTarget({
      nonce: Date.now(),
    });
  }

  function toggleTheme(): void {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    void services.settingsService?.setTheme?.(nextTheme);
  }

  return (
    <div className="app-shell">
      <div className="window-bar">
        <div className="window-title">
          <div className="brand-mark">TA</div>
          <div className="brand-copy">
            <h1>TimeAura</h1>
            <p>让每个重要时刻如约而至</p>
          </div>
        </div>

        <div className="top-actions">
          <button className="icon-btn" title="切换主题" aria-label="切换主题" onClick={toggleTheme}>
            <ThemeToggleIcon theme={theme} />
          </button>
          <button className="ghost-btn" onClick={triggerQuickAdd} disabled={!canTriggerQuickAdd}>
            快速新增
          </button>
          <button className="primary-btn" onClick={() => setPage("reports")}>
            生成周报
          </button>
          <button
            className={`icon-btn${page === "channels" ? " icon-btn-active" : ""}`}
            onClick={() => setPage("channels")}
            title="AI通道配置"
            aria-label="AI通道配置"
          >
            <ChannelStudioIcon />
          </button>
        </div>
      </div>

      <div className="main-body">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <p className="tagline">在紧凑节奏里，先看清楚什么最重要，再让它准时发生。</p>
          </div>

          <div className="nav-section">
            <div className="nav-label">视图</div>
            <nav className="desktop-nav desktop-nav-grid">
          {WORKSPACE_VIEW_CARDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item nav-item-card${page === "workspace" && workspaceView === item.id ? " nav-item-active" : ""}`}
              onClick={() => openWorkspaceView(item.id)}
            >
              <span className="nav-card-head">
                <span className="nav-item-left">
                  <span className="nav-item-title">{item.label}</span>
                </span>
                <span className="badge-count">{workspaceCounts[item.id]}</span>
              </span>
              <span className="nav-card-foot">
                <span className={`nav-card-accent ${item.accentClass}`} />
                <span className="nav-card-meta">{item.meta}</span>
              </span>
            </button>
          ))}
            </nav>
          </div>

          <div className="nav-section sidebar-section">
            <div className="nav-label-row">
              <div className="nav-label">我的列表</div>
              <button
                type="button"
                className="nav-label-action"
                aria-label="编辑我的列表"
                title="编辑我的列表"
                onClick={openMyListsCreate}
              >
                <EditIcon />
              </button>
            </div>
            <div className="sidebar-tag-list">
            <button
              type="button"
              className={`sidebar-tag-item${page === "workspace" && workspaceTagId === "all" ? " sidebar-tag-item-active" : ""}`}
              onClick={() => {
                setPage("workspace");
                setWorkspaceTagId("all");
              }}
            >
              <span className="sidebar-tag-label">
                <span className="nav-icon nav-item-dot-all" />
                <span className="tag-item-title">全部记录</span>
              </span>
              <span className="badge-count">{workspaceCounts.all}</span>
            </button>

            {sidebarTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`sidebar-tag-item${page === "workspace" && workspaceTagId === tag.id ? " sidebar-tag-item-active" : ""}`}
                onClick={() => {
                  setPage("workspace");
                  setWorkspaceTagId(tag.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setSidebarTagContextMenu({
                    tag,
                    x: Math.min(event.clientX, window.innerWidth - 176),
                    y: Math.min(event.clientY, window.innerHeight - 96),
                  });
                }}
              >
                <span className="sidebar-tag-label">
                  <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                  <span className="tag-item-title">{tag.name}</span>
                </span>
                <span className="badge-count">{tag.count}</span>
              </button>
            ))}
            </div>
          </div>

          <div className="sidebar-footer">
            <button
              className={`icon-btn sidebar-footer-icon${page === "reports" ? " icon-btn-active" : ""}`}
              onClick={() => setPage("reports")}
              title="AI 报告"
              aria-label="AI 报告"
            >
              <ReportIcon />
            </button>
            <button
              className={`icon-btn sidebar-footer-icon${page === "trash" ? " icon-btn-active" : ""}`}
              onClick={() => setPage("trash")}
              title="回收站"
              aria-label="回收站"
            >
              <TrashIcon />
            </button>
            <button
              className={`icon-btn sidebar-footer-icon${page === "channels" ? " icon-btn-active" : ""}`}
              onClick={() => setPage("channels")}
              title="通道配置"
              aria-label="通道配置"
            >
              <ChannelStudioIcon />
            </button>
            <button
              className="icon-btn sidebar-footer-icon"
              onClick={triggerQuickAdd}
              title="快速新增"
              aria-label="快速新增"
              disabled={workspaceBootstrapping}
            >
              <QuickAddIcon />
            </button>
          </div>
        </aside>

        <main className="page-stack">
          {page === "workspace" ? (
            <WorkspacePage
              activeTagId={workspaceTagId}
              activeView={workspaceView}
              dataVersion={workspaceDataVersion}
              focusTarget={workspaceFocusTarget}
              quickAddTarget={workspaceQuickAddTarget}
              runtimeNotice={workspaceRuntimeNotice}
              notificationDebugEntries={notificationDebugEntries}
              onClearNotificationDebug={clearNotificationDebug}
              onTagFilterChange={setWorkspaceTagId}
              onWorkspaceChanged={handleWorkspaceChanged}
            />
          ) : null}
          {page === "reports" ? <ReportStudioPage /> : null}
          {page === "channels" ? <ChannelStudioPage /> : null}
          {page === "trash" ? <TrashPage onTrashChanged={handleWorkspaceChanged} /> : null}
        </main>
      </div>

      {sidebarTagContextMenu ? (
        <div
          className="sidebar-context-menu"
          style={{ left: sidebarTagContextMenu.x, top: sidebarTagContextMenu.y }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="sidebar-context-menu-item"
            onClick={() => openMyListsEdit(sidebarTagContextMenu.tag)}
          >
            编辑列表
          </button>
          <button
            type="button"
            className="sidebar-context-menu-item danger"
            onClick={() => {
              void deleteSidebarList(sidebarTagContextMenu.tag);
              setSidebarTagContextMenu(null);
            }}
          >
            删除列表
          </button>
        </div>
      ) : null}

      <MyListsSheet
        open={myListsOpen}
        tags={sidebarTags}
        draft={sidebarListDraft}
        onClose={closeMyLists}
        onDraftChange={setSidebarListDraft}
        onPersistDraft={persistSidebarListDraft}
        onSelectTag={(tag) => openMyListsEdit(tag)}
        onDeleteTag={deleteSidebarList}
      />
    </div>
  );
}

interface MyListsSheetProps {
  open: boolean;
  tags: TagCountItem[];
  draft: SidebarListEditorDraft;
  onClose(): void;
  onDraftChange(nextDraft: SidebarListEditorDraft): void;
  onPersistDraft(nextDraft: SidebarListEditorDraft): Promise<void>;
  onSelectTag(tag: TagCountItem): void;
  onDeleteTag(tag: TagCountItem): Promise<void>;
}

function MyListsSheet({
  open,
  tags,
  draft,
  onClose,
  onDraftChange,
  onPersistDraft,
  onSelectTag,
  onDeleteTag,
}: MyListsSheetProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  const editingTag = draft.id ? tags.find((tag) => tag.id === draft.id) ?? null : null;
  const placeholderColor = "#5f89ff";
  const resetToCreateDraft = () => {
    onDraftChange({
      id: null,
      name: "",
      color: placeholderColor,
    });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet-panel my-lists-sheet"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="tag-manager-header">
          <div>
            <h3 className="panel-title panel-title-small">我的列表</h3>
            <div className="tag-manager-copy">改名或换色后失焦即保存</div>
          </div>
          <button type="button" className="icon-btn" aria-label="关闭我的列表" title="关闭我的列表" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="my-lists-body">
          <div
            className="tag-panel my-lists-editor-panel"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                resetToCreateDraft();
              }
            }}
          >
            <div className="tag-panel-header">
              <div className="tag-panel-title">
                <strong>{editingTag ? "编辑列表" : "新建列表"}</strong>
              </div>
            </div>

            <div className="tag-form-stack">
              <div className="tag-form-row my-lists-form-row">
                <div className="my-lists-field-copy">
                  <input
                    className="input my-lists-name-input"
                    value={draft.name}
                    onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
                    onBlur={() => {
                      void onPersistDraft(draft);
                    }}
                    placeholder="输入列表名称"
                  />
                  <span className="my-lists-field-hint">名称与颜色会立即同步到左侧导航。</span>
                </div>
                <div className="my-lists-color-slot">
                  <input
                    className="color-input my-lists-color-dot"
                    type="color"
                    value={draft.color || placeholderColor}
                    onChange={(event) => onDraftChange({ ...draft, color: event.target.value })}
                    onBlur={() => {
                      void onPersistDraft(draft);
                    }}
                    aria-label="列表颜色"
                  />
                </div>
              </div>

              {editingTag ? (
                <div className="my-lists-delete-row">
                  <button type="button" className="inspector-action-btn inspector-action-btn-danger" onClick={() => void onDeleteTag(editingTag)}>
                    删除
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="tag-panel my-lists-library-panel"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                resetToCreateDraft();
              }
            }}
          >
            <div className="tag-panel-header">
              <div className="tag-panel-title">
                <strong>列表库</strong>
              </div>
            </div>

            <div
              className="tag-library-list"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  resetToCreateDraft();
                }
              }}
            >
              {tags.length > 0 ? tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`my-lists-library-row${draft.id === tag.id ? " my-lists-library-row-active" : ""}`}
                  onClick={() => onSelectTag(tag)}
                >
                  <span className="tag-library-name">
                    <i style={{ backgroundColor: tag.color }} />
                    <span>{tag.name}</span>
                  </span>
                  <span className="tag-library-meta">{tag.count} 条记录</span>
                </button>
              )) : <div className="tag-library-empty">当前还没有列表，先从左侧加一个新的。</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const runtimeWindow = window as Window & {
    __TAURI_INTERNALS__?: unknown;
    isTauri?: boolean;
  };

  return Boolean(runtimeWindow.__TAURI_INTERNALS__ || runtimeWindow.isTauri);
}

function ReportIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.5 4.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="M7.5 8h5M7.5 10.5h5M7.5 13h3" />
    </svg>
  );
}

function ChannelStudioIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h12" />
      <path d="M4 12h16" />
      <path d="M4 17h9" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="17" r="2" />
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

function EditIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function CloseIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
    </svg>
  );
}

function ThemeToggleIcon({ theme }: { theme: ThemeMode }): JSX.Element {
  if (theme === "dark") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4A8.5 8.5 0 1 0 20 15.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v2.5" />
      <path d="M12 18.5V21" />
      <path d="M4.93 4.93l1.77 1.77" />
      <path d="M17.3 17.3l1.77 1.77" />
      <path d="M3 12h2.5" />
      <path d="M18.5 12H21" />
      <path d="M4.93 19.07l1.77-1.77" />
      <path d="M17.3 6.7l1.77-1.77" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

async function repairWorkspaceRecordTags(
  services: AppServices,
): Promise<number> {
  const [records, tags] = await Promise.all([
    services.recordService.listRecords({ view: "all", status: "all" }),
    services.tagService.listTags(),
  ]);
  const fallbackTag = tags.find((tag) => !isHiddenListTag(tag)) ?? null;

  if (!fallbackTag) {
    return 0;
  }

  const missingTagRecords = records.items.filter((record) => {
    if (record.deletedAt) {
      return false;
    }

    const visibleTags = record.tags.filter((tagId) => !isHiddenListTagId(tagId));
    return visibleTags.length === 0;
  });

  for (const record of missingTagRecords) {
    await services.tagService.setRecordTags(record.id, [fallbackTag.id]);
  }

  return missingTagRecords.length;
}

function isHiddenListTag(tag: { id: string; name: string }): boolean {
  return isHiddenListTagId(tag.id) || tag.name === "未分类";
}

function isHiddenListTagId(tagId: string): boolean {
  return tagId === "tag_uncategorized";
}
