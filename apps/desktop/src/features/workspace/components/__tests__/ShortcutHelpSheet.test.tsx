import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ShortcutHelpSheet } from "../ShortcutHelpSheet";
import { WORKSPACE_SHORTCUT_ITEMS } from "../../hooks/useWorkspaceKeyboardShortcuts";

describe("ShortcutHelpSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <ShortcutHelpSheet
        open={false}
        shortcuts={[]}
        onClose={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders shortcuts and wires close button plus backdrop close", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ShortcutHelpSheet
        open={true}
        shortcuts={WORKSPACE_SHORTCUT_ITEMS.slice(0, 3)}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("工作台键盘操作")).toBeTruthy();
    expect(screen.getByText("⌘/Ctrl + N")).toBeTruthy();
    expect(screen.getByText("聚焦顶部快速新增，并选中现有输入内容。")).toBeTruthy();

    fireEvent.click(screen.getByText("关闭"));
    fireEvent.click(container.firstChild as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stops backdrop close when clicking inside the sheet body", () => {
    const onClose = vi.fn();
    const { container } = render(
      <ShortcutHelpSheet
        open={true}
        shortcuts={WORKSPACE_SHORTCUT_ITEMS.slice(0, 1)}
        onClose={onClose}
      />,
    );

    const panel = container.querySelector(".sheet-panel-shortcuts") as HTMLElement;
    fireEvent.click(panel);

    expect(onClose).not.toHaveBeenCalled();
  });
});
