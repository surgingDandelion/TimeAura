import { useMemo, useState } from "react";

import { useAppServices } from "./providers/AppServicesProvider";
import { ChannelStudioPage } from "../features/channels/ChannelStudioPage";
import { ReportStudioPage } from "../features/reports/ReportStudioPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";

export function AppShell(): JSX.Element {
  const { runtime, services } = useAppServices();
  const [page, setPage] = useState<"workspace" | "reports" | "channels">("workspace");

  const navStats = useMemo(
    () => ({
      workspaceCount: runtime?.records.length ?? 0,
    }),
    [runtime],
  );

  return (
    <div className="desktop-shell">
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <div className="desktop-title">TimeAura</div>
          <div className="desktop-subtitle">让每个重要时刻如约而至</div>
        </div>

        <nav className="desktop-nav">
          <button
            className={`nav-item${page === "workspace" ? " nav-item-active" : ""}`}
            onClick={() => setPage("workspace")}
          >
            <span>备忘录</span>
            <span className="nav-badge">{navStats.workspaceCount}</span>
          </button>
          <button
            className={`nav-item${page === "reports" ? " nav-item-active" : ""}`}
            onClick={() => setPage("reports")}
          >
            <span>AI 报告</span>
            <span className="nav-badge">AI</span>
          </button>
          <button
            className={`nav-item${page === "channels" ? " nav-item-active" : ""}`}
            onClick={() => setPage("channels")}
          >
            <span>通道配置</span>
            <span className="nav-badge">LLM</span>
          </button>
        </nav>

        <div className="desktop-sidebar-footer">
          <div className="sidebar-foot-label">当前环境</div>
          <div className="sidebar-foot-value">{runtime ? "Mock Runtime" : "SQLite Runtime"}</div>
          <div className="sidebar-foot-label">服务接线</div>
          <div className="sidebar-foot-value">{services.channelService ? "已就绪" : "未就绪"}</div>
        </div>
      </aside>

      <main className="desktop-main">
        {page === "workspace" ? <WorkspacePage /> : null}
        {page === "reports" ? <ReportStudioPage /> : null}
        {page === "channels" ? <ChannelStudioPage /> : null}
      </main>
    </div>
  );
}
