import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createWorkspaceAppServicesDouble } from "../../testing/workspaceServiceTestDoubles";
import { createWorkspaceTestFixtureBundle } from "../../testing/workspaceTestFixtures";
import { useWorkspaceRecordActions } from "../useWorkspaceRecordActions";

describe("useWorkspaceRecordActions", () => {
  it("returns cancelled when delete confirmation is rejected", async () => {
    const { seams, state } = createWorkspaceTestFixtureBundle({ confirmResult: false });
    const deleteRecord = vi.fn(async (_recordId: string) => undefined);
    const services = createWorkspaceAppServicesDouble({
      recordService: {
        deleteRecord,
      },
    });
    const clearSelection = vi.fn();
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);

    const { result } = renderHook(() =>
      useWorkspaceRecordActions({
        batchTargetIds: [],
        selectedId: "record-1",
        selectedIds: ["record-1", "record-2"],
        services,
        clearSelection,
        setSelectedId,
        setSelectedIds,
        syncWorkspace,
        seams,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleDelete>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleDelete("record-1");
    });

    expect(commandResult).toEqual({
      status: "cancelled",
    });
    expect(state.confirmMessages).toEqual(["确认删除这条记录吗？"]);
    expect(deleteRecord).not.toHaveBeenCalled();
    expect(setSelectedId).not.toHaveBeenCalled();
    expect(setSelectedIds).not.toHaveBeenCalled();
    expect(syncWorkspace).not.toHaveBeenCalled();
  });

  it("deletes selected record and clears matching selection state", async () => {
    const { seams, state } = createWorkspaceTestFixtureBundle({ confirmResult: true });
    const deleteRecord = vi.fn(async (_recordId: string) => undefined);
    const services = createWorkspaceAppServicesDouble({
      recordService: {
        deleteRecord,
      },
    });
    let selectedIdsState = ["record-1", "record-2"];
    const clearSelection = vi.fn();
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn((updater: (current: string[]) => string[]) => {
      selectedIdsState = updater(selectedIdsState);
    });
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);

    const { result } = renderHook(() =>
      useWorkspaceRecordActions({
        batchTargetIds: [],
        selectedId: "record-1",
        selectedIds: selectedIdsState,
        services,
        clearSelection,
        setSelectedId,
        setSelectedIds,
        syncWorkspace,
        seams,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleDelete>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleDelete("record-1");
    });

    expect(commandResult).toEqual({
      status: "success",
      message: "记录已删除",
      data: { recordId: "record-1" },
    });
    expect(state.confirmMessages).toEqual(["确认删除这条记录吗？"]);
    expect(deleteRecord).toHaveBeenCalledWith("record-1");
    expect(setSelectedId).toHaveBeenCalledWith(null);
    expect(setSelectedIds).toHaveBeenCalledTimes(1);
    expect(selectedIdsState).toEqual(["record-2"]);
    expect(syncWorkspace).toHaveBeenCalledWith("记录已删除");
  });

  it("returns noop when there is no record to reschedule", async () => {
    const services = createWorkspaceAppServicesDouble();
    const clearSelection = vi.fn();
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);

    const { result } = renderHook(() =>
      useWorkspaceRecordActions({
        batchTargetIds: [],
        selectedId: null,
        selectedIds: [],
        services,
        clearSelection,
        setSelectedId,
        setSelectedIds,
        syncWorkspace,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleReschedule>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleReschedule("tomorrow_09");
    });

    expect(commandResult).toEqual({
      status: "noop",
    });
    expect(services.recordService.batchReschedule).not.toHaveBeenCalled();
    expect(clearSelection).not.toHaveBeenCalled();
    expect(syncWorkspace).not.toHaveBeenCalled();
  });

  it("batch reschedules selected records and returns affected count", async () => {
    const batchReschedule = vi.fn(async (_ids: string[], _strategy: { preset: "plus_1_hour" | "tomorrow_09" | "today_18" }) => []);
    const services = createWorkspaceAppServicesDouble({
      recordService: {
        batchReschedule,
      },
    });
    const clearSelection = vi.fn();
    const setSelectedId = vi.fn();
    const setSelectedIds = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);

    const { result } = renderHook(() =>
      useWorkspaceRecordActions({
        batchTargetIds: ["record-1", "record-2"],
        selectedId: "record-1",
        selectedIds: ["record-1", "record-2"],
        services,
        clearSelection,
        setSelectedId,
        setSelectedIds,
        syncWorkspace,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleReschedule>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleReschedule("today_18");
    });

    expect(batchReschedule).toHaveBeenCalledWith(["record-1", "record-2"], {
      preset: "today_18",
    });
    expect(clearSelection).toHaveBeenCalledTimes(1);
    expect(syncWorkspace).toHaveBeenCalledWith("已完成批量改期");
    expect(commandResult).toEqual({
      status: "success",
      message: "已完成批量改期",
      data: { count: 2 },
    });
  });
});
