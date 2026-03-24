import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import { createWorkspaceAppServicesDouble, createWorkspaceRecordEntity } from "../../testing/workspaceServiceTestDoubles";
import { useWorkspaceQuickAddActions } from "../useWorkspaceQuickAddActions";

describe("useWorkspaceQuickAddActions", () => {
  it("returns noop when quick add title is empty", async () => {
    const services = createWorkspaceAppServicesDouble();
    const onSelectCreatedRecord = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);
    const quickAddRef = { current: null } as RefObject<HTMLInputElement>;

    const { result } = renderHook(() =>
      useWorkspaceQuickAddActions({
        activeTagId: "all",
        quickAddRef,
        services,
        onSelectCreatedRecord,
        syncWorkspace,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleQuickAdd>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleQuickAdd();
    });

    expect(commandResult).toEqual({
      status: "noop",
    });
    expect(services.recordService.createRecord).not.toHaveBeenCalled();
    expect(onSelectCreatedRecord).not.toHaveBeenCalled();
    expect(syncWorkspace).not.toHaveBeenCalled();
  });

  it("creates a record, focuses input again, and returns success metadata", async () => {
    const createRecord = vi.fn(async () =>
      createWorkspaceRecordEntity({
        id: "record-new",
        title: "补充周报素材",
        tags: ["tag_work"],
      }),
    );
    const services = createWorkspaceAppServicesDouble({
      createRecord,
    });
    const onSelectCreatedRecord = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);
    const input = document.createElement("input");
    const quickAddRef = { current: input } as RefObject<HTMLInputElement>;

    document.body.appendChild(input);

    const { result } = renderHook(() =>
      useWorkspaceQuickAddActions({
        activeTagId: "tag_work",
        quickAddRef,
        services,
        onSelectCreatedRecord,
        syncWorkspace,
      }),
    );

    act(() => {
      result.current.setQuickAdd("  补充周报素材  ");
    });

    let commandResult: Awaited<ReturnType<typeof result.current.handleQuickAdd>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleQuickAdd();
    });

    expect(createRecord).toHaveBeenCalledWith({
      title: "补充周报素材",
      tags: ["tag_work"],
      priority: "P3",
      status: "未开始",
      plannedAt: null,
    });
    expect(commandResult).toEqual({
      status: "success",
      message: "已新增记录",
      data: { recordId: "record-new" },
    });
    expect(result.current.quickAdd).toBe("");
    expect(onSelectCreatedRecord).toHaveBeenCalledWith("record-new");
    expect(syncWorkspace).toHaveBeenCalledWith("已新增记录");
    expect(document.activeElement).toBe(input);

    input.remove();
  });
});
