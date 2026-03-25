import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createWorkspaceRecordEntity } from "../../testing/workspaceServiceTestDoubles";
import { useWorkspaceSelection } from "../useWorkspaceSelection";

describe("useWorkspaceSelection", () => {
  it("focuses a target record and resets list context", () => {
    const records = [
      createWorkspaceRecordEntity({ id: "record-1" }),
      createWorkspaceRecordEntity({ id: "record-2" }),
    ];
    const onTagFilterChange = vi.fn();
    const onResetListContext = vi.fn();

    const { result, rerender, unmount } = renderHook(
      (props: { focusNonce: number | null }) =>
        useWorkspaceSelection({
          records,
          focusTarget: props.focusNonce
            ? {
                recordId: "record-2",
                nonce: props.focusNonce,
              }
            : null,
          quickAddTarget: null,
          onTagFilterChange,
          onResetListContext,
          onQuickAddRequested: vi.fn(),
        }),
      { initialProps: { focusNonce: null as number | null } },
    );

    expect(result.current.selectedId).toBeNull();

    act(() => {
      rerender({ focusNonce: 1 });
    });

    expect(onResetListContext.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(onTagFilterChange).toHaveBeenCalledWith("all");
    expect(result.current.selectedId).toBe("record-2");
    expect(result.current.highlightedRecordId).toBe("record-2");

    unmount();
  });

  it("activates quick add spotlight and clears current inspector selection", () => {
    const records = [createWorkspaceRecordEntity({ id: "record-1" })];
    const onTagFilterChange = vi.fn();
    const onResetListContext = vi.fn();
    const onQuickAddRequested = vi.fn();

    const { result, rerender, unmount } = renderHook(
      (props: { quickAddNonce: number | null }) =>
        useWorkspaceSelection({
          records,
          focusTarget: null,
          quickAddTarget: props.quickAddNonce
            ? {
                nonce: props.quickAddNonce,
              }
            : null,
          onTagFilterChange,
          onResetListContext,
          onQuickAddRequested,
        }),
      { initialProps: { quickAddNonce: null as number | null } },
    );

    act(() => {
      result.current.setSelectedId("record-1");
      rerender({ quickAddNonce: 2 });
    });

    expect(onResetListContext.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(onTagFilterChange).toHaveBeenCalledWith("all");
    expect(onQuickAddRequested.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(result.current.selectedId).toBeNull();
    expect(result.current.quickAddActive).toBe(true);

    unmount();
  });

  it("tracks selection state, toggles all visible, and removes stale ids when records change", () => {
    const records = [
      createWorkspaceRecordEntity({ id: "record-1" }),
      createWorkspaceRecordEntity({ id: "record-2" }),
    ];

    const { result, rerender, unmount } = renderHook(
      (props: { records: ReturnType<typeof createWorkspaceRecordEntity>[] }) =>
        useWorkspaceSelection({
          records: props.records,
          focusTarget: null,
          quickAddTarget: null,
          onTagFilterChange: vi.fn(),
          onResetListContext: vi.fn(),
          onQuickAddRequested: vi.fn(),
        }),
      { initialProps: { records } },
    );

    act(() => {
      result.current.toggleSelection("record-1");
      result.current.toggleSelection("record-2");
    });

    expect(result.current.selectedIds).toEqual(["record-1", "record-2"]);
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.visibleSelectedCount).toBe(2);

    act(() => {
      result.current.toggleSelectAllVisible();
    });

    expect(result.current.selectedIds).toEqual([]);

    act(() => {
      result.current.toggleSelectAllVisible();
    });

    expect(result.current.selectedIds).toEqual(["record-1", "record-2"]);

    act(() => {
      result.current.focusRecord("record-2");
      result.current.closeInspector();
      rerender({ records: [createWorkspaceRecordEntity({ id: "record-2" })] });
    });

    expect(result.current.selectedIds).toEqual(["record-2"]);
    expect(result.current.selectedId).toBeNull();

    unmount();
  });
});
