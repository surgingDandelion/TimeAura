import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWorkspaceRecordEntity } from "../../testing/workspaceServiceTestDoubles";
import { useWorkspaceKeyboardShortcuts } from "../useWorkspaceKeyboardShortcuts";

function dispatchKeydown(
  key: string,
  options: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    target?: HTMLElement;
  } = {},
): void {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    metaKey: options.metaKey,
    ctrlKey: options.ctrlKey,
  });

  (options.target ?? document.body).dispatchEvent(event);
}

function createOptions() {
  const record = createWorkspaceRecordEntity({
    id: "record-1",
    title: "整理周报",
  });

  return {
    records: [
      record,
      createWorkspaceRecordEntity({
        id: "record-2",
        title: "整理月报",
      }),
    ],
    selectedId: record.id,
    selectedRecord: record,
    draftDirty: true,
    saving: false,
    customReminderTimeOpen: false,
    tagManagerOpen: false,
    shortcutHelpOpen: false,
    onFocusQuickAdd: vi.fn(),
    onFocusSearch: vi.fn(),
    onSave: vi.fn(),
    onCloseCustomReminder: vi.fn(),
    onCloseTagManager: vi.fn(),
    onCloseShortcutHelp: vi.fn(),
    onCloseInspector: vi.fn(),
    onSelectRecord: vi.fn(),
    onToggleSelection: vi.fn(),
    onOpenShortcutHelp: vi.fn(),
  };
}

describe("useWorkspaceKeyboardShortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles command shortcuts for quick add, search, save, and help", () => {
    const options = createOptions();
    renderHook(() => useWorkspaceKeyboardShortcuts(options));

    dispatchKeydown("n", { metaKey: true });
    dispatchKeydown("f", { ctrlKey: true });
    dispatchKeydown("s", { metaKey: true });
    dispatchKeydown("/", { ctrlKey: true });

    expect(options.onFocusQuickAdd).toHaveBeenCalledTimes(1);
    expect(options.onFocusSearch).toHaveBeenCalledTimes(1);
    expect(options.onSave).toHaveBeenCalledTimes(1);
    expect(options.onOpenShortcutHelp).toHaveBeenCalledTimes(1);
  });

  it("applies escape close priority from reminder to tag manager to shortcut help to inspector", () => {
    const options = createOptions();
    const { rerender } = renderHook(
      (nextOptions) => useWorkspaceKeyboardShortcuts(nextOptions),
      {
        initialProps: options,
      },
    );

    dispatchKeydown("Escape");
    expect(options.onCloseInspector).toHaveBeenCalledTimes(1);

    rerender({
      ...options,
      customReminderTimeOpen: true,
    });
    dispatchKeydown("Escape");
    expect(options.onCloseCustomReminder).toHaveBeenCalledTimes(1);

    rerender({
      ...options,
      customReminderTimeOpen: false,
      tagManagerOpen: true,
    });
    dispatchKeydown("Escape");
    expect(options.onCloseTagManager).toHaveBeenCalledTimes(1);

    rerender({
      ...options,
      tagManagerOpen: false,
      shortcutHelpOpen: true,
    });
    dispatchKeydown("Escape");
    expect(options.onCloseShortcutHelp).toHaveBeenCalledTimes(1);
  });

  it("navigates records with arrows and toggles selection with space outside editable targets", () => {
    const options = createOptions();
    renderHook(() => useWorkspaceKeyboardShortcuts(options));

    dispatchKeydown("ArrowDown");
    dispatchKeydown("ArrowUp");
    dispatchKeydown(" ");

    expect(options.onSelectRecord).toHaveBeenNthCalledWith(1, "record-2");
    expect(options.onSelectRecord).toHaveBeenNthCalledWith(2, "record-2");
    expect(options.onToggleSelection).toHaveBeenCalledWith("record-1");
  });

  it("ignores list navigation inside editable elements or when overlays are open", () => {
    const options = createOptions();
    const input = document.createElement("input");
    document.body.appendChild(input);

    const { rerender } = renderHook(
      (nextOptions) => useWorkspaceKeyboardShortcuts(nextOptions),
      {
        initialProps: options,
      },
    );

    dispatchKeydown("ArrowDown", { target: input });
    dispatchKeydown(" ", { target: input });

    expect(options.onSelectRecord).not.toHaveBeenCalled();
    expect(options.onToggleSelection).not.toHaveBeenCalled();

    rerender({
      ...options,
      shortcutHelpOpen: true,
    });

    dispatchKeydown("ArrowDown");
    dispatchKeydown(" ");

    expect(options.onSelectRecord).not.toHaveBeenCalled();
    expect(options.onToggleSelection).not.toHaveBeenCalled();

    input.remove();
  });

  it("skips save when there is no dirty selected draft or saving is in progress", () => {
    const options = createOptions();
    const { rerender } = renderHook(
      (nextOptions) => useWorkspaceKeyboardShortcuts(nextOptions),
      {
        initialProps: {
          ...options,
          draftDirty: false,
        },
      },
    );

    dispatchKeydown("s", { metaKey: true });
    expect(options.onSave).not.toHaveBeenCalled();

    rerender({
      ...options,
      draftDirty: true,
      saving: true,
    });
    dispatchKeydown("s", { metaKey: true });
    expect(options.onSave).not.toHaveBeenCalled();
  });
});
