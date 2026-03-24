import { WorkspaceHome } from "../features/workspace/WorkspaceHome";

export function AppShell(): JSX.Element {
  return (
    <div className="desktop-shell">
      <header className="desktop-titlebar">
        <div>
          <div className="desktop-title">TimeAura</div>
          <div className="desktop-subtitle">让每个重要时刻如约而至</div>
        </div>
      </header>
      <main className="desktop-main">
        <WorkspaceHome />
      </main>
    </div>
  );
}
