import { CustomReminderSheet } from "./components/CustomReminderSheet";
import { ShortcutHelpSheet } from "./components/ShortcutHelpSheet";
import { TagManagerSheet } from "./components/TagManagerSheet";
import { WorkspaceDetailInspector } from "./components/WorkspaceDetailInspector";
import { WorkspaceListPanel } from "./components/WorkspaceListPanel";
import { useWorkspaceViewModel } from "./hooks/useWorkspaceViewModel";
import type {
  WorkspacePageProps,
} from "./types";

export function WorkspacePage(props: WorkspacePageProps): JSX.Element {
  const viewModel = useWorkspaceViewModel(props);
  const detailOpen = Boolean(viewModel.detailInspectorProps.selectedRecord);

  return (
    <div className={`workspace-layout${detailOpen ? " workspace-layout-detail-open" : ""}`}>
      <WorkspaceListPanel {...viewModel.listPanelProps} />
      {detailOpen ? <WorkspaceDetailInspector {...viewModel.detailInspectorProps} /> : null}
      <TagManagerSheet {...viewModel.tagManagerSheetProps} />
      <CustomReminderSheet {...viewModel.customReminderSheetProps} />
      <ShortcutHelpSheet {...viewModel.shortcutHelpProps} />
    </div>
  );
}
