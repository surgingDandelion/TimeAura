import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { CustomReminderSheet } from "./components/CustomReminderSheet";
import { QuickAddSheet } from "./components/QuickAddSheet";
import { ShortcutHelpSheet } from "./components/ShortcutHelpSheet";
import { TagManagerSheet } from "./components/TagManagerSheet";
import { WorkspaceDetailInspector } from "./components/WorkspaceDetailInspector";
import { WorkspaceListPanel } from "./components/WorkspaceListPanel";
import { useWorkspaceViewModel } from "./hooks/useWorkspaceViewModel";
import type { WorkspacePageProps } from "./types";

const MIN_DETAIL_WIDTH = 460;
const MAX_DETAIL_WIDTH = 760;

export function WorkspacePage(props: WorkspacePageProps): JSX.Element {
  const viewModel = useWorkspaceViewModel(props);
  const detailOpen = Boolean(viewModel.detailInspectorProps.selectedRecord);
  const [detailWidth, setDetailWidth] = useState(540);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) {
      return;
    }

    function handlePointerMove(event: MouseEvent): void {
      const nextWidth = clamp(window.innerWidth - event.clientX - 24, MIN_DETAIL_WIDTH, MAX_DETAIL_WIDTH);
      setDetailWidth(nextWidth);
    }

    function handlePointerUp(): void {
      setDragging(false);
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!detailOpen) {
      setDragging(false);
    }
  }, [detailOpen]);

  const layoutStyle = useMemo(
    () =>
      ({
        "--workspace-detail-width": `${detailWidth}px`,
      }) as CSSProperties,
    [detailWidth],
  );

  return (
    <div
      className={`workspace-layout${detailOpen ? " workspace-layout-detail-open" : ""}${dragging ? " workspace-layout-dragging" : ""}`}
      style={layoutStyle}
    >
      <WorkspaceListPanel {...viewModel.listPanelProps} />
      {detailOpen ? (
        <button
          type="button"
          className="workspace-pane-splitter"
          title="拖动调整详情区宽度"
          aria-label="拖动调整详情区宽度"
          onMouseDown={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDoubleClick={() => setDetailWidth(540)}
        />
      ) : null}
      {detailOpen ? <WorkspaceDetailInspector {...viewModel.detailInspectorProps} /> : null}
      <QuickAddSheet {...viewModel.quickAddSheetProps} />
      <TagManagerSheet {...viewModel.tagManagerSheetProps} />
      <CustomReminderSheet {...viewModel.customReminderSheetProps} />
      <ShortcutHelpSheet {...viewModel.shortcutHelpProps} />
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
