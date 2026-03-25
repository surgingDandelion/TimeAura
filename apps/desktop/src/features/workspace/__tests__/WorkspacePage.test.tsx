import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspacePage } from "../WorkspacePage";

const hookSpy = vi.fn();
const listPanelSpy = vi.fn();
const detailSpy = vi.fn();
const tagManagerSpy = vi.fn();
const customReminderSpy = vi.fn();
const shortcutSpy = vi.fn();

vi.mock("../hooks/useWorkspaceViewModel", () => ({
  useWorkspaceViewModel: (props: unknown) => hookSpy(props),
}));

vi.mock("../components/WorkspaceListPanel", () => ({
  WorkspaceListPanel: (props: unknown) => {
    listPanelSpy(props);
    return <div data-testid="workspace-list-panel">list-panel</div>;
  },
}));

vi.mock("../components/WorkspaceDetailInspector", () => ({
  WorkspaceDetailInspector: (props: unknown) => {
    detailSpy(props);
    return <div data-testid="workspace-detail-panel">detail-panel</div>;
  },
}));

vi.mock("../components/TagManagerSheet", () => ({
  TagManagerSheet: (props: unknown) => {
    tagManagerSpy(props);
    return <div data-testid="workspace-tag-sheet">tag-sheet</div>;
  },
}));

vi.mock("../components/CustomReminderSheet", () => ({
  CustomReminderSheet: (props: unknown) => {
    customReminderSpy(props);
    return <div data-testid="workspace-reminder-sheet">reminder-sheet</div>;
  },
}));

vi.mock("../components/ShortcutHelpSheet", () => ({
  ShortcutHelpSheet: (props: unknown) => {
    shortcutSpy(props);
    return <div data-testid="workspace-shortcut-sheet">shortcut-sheet</div>;
  },
}));

describe("WorkspacePage", () => {
  it("assembles view model contracts into the page layout", () => {
    const pageProps = {
      activeTagId: "tag_work",
      activeView: "today" as const,
      focusTarget: {
        recordId: "record-1",
        nonce: 1,
      },
      quickAddTarget: {
        nonce: 2,
      },
      runtimeNotice: {
        text: "提醒已刷新",
        tone: "info" as const,
        nonce: 3,
      },
      notificationDebugEntries: [],
      onClearNotificationDebug: vi.fn(),
      onTagFilterChange: vi.fn(),
      onWorkspaceChanged: vi.fn(),
    };

    const viewModel = {
      listPanelProps: { currentTagName: "工作" },
      detailInspectorProps: { selectedRecord: null },
      tagManagerSheetProps: { open: false },
      customReminderSheetProps: { open: false },
      shortcutHelpProps: { open: false },
    };
    hookSpy.mockReturnValue(viewModel);

    const { container } = render(<WorkspacePage {...pageProps} />);

    expect(container.querySelector(".workspace-layout")).toBeTruthy();
    expect(hookSpy).toHaveBeenCalledWith(pageProps);
    expect(listPanelSpy).toHaveBeenCalledWith(viewModel.listPanelProps);
    expect(detailSpy).toHaveBeenCalledWith(viewModel.detailInspectorProps);
    expect(tagManagerSpy).toHaveBeenCalledWith(viewModel.tagManagerSheetProps);
    expect(customReminderSpy).toHaveBeenCalledWith(viewModel.customReminderSheetProps);
    expect(shortcutSpy).toHaveBeenCalledWith(viewModel.shortcutHelpProps);
    expect(screen.getByTestId("workspace-list-panel")).toBeTruthy();
    expect(screen.getByTestId("workspace-detail-panel")).toBeTruthy();
    expect(screen.getByTestId("workspace-tag-sheet")).toBeTruthy();
    expect(screen.getByTestId("workspace-reminder-sheet")).toBeTruthy();
    expect(screen.getByTestId("workspace-shortcut-sheet")).toBeTruthy();
  });
});
