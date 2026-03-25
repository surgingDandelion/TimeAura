import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  createWorkspaceAppServicesDouble,
  createWorkspaceRecordEntity,
  createWorkspaceReminderHit,
  createWorkspaceReminderSummary,
  createWorkspaceTagEntity,
} from "../../testing/workspaceServiceTestDoubles";
import { useWorkspaceData } from "../useWorkspaceData";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("useWorkspaceData", () => {
  it("loads records, tags, reminder data, and computes current tag name", async () => {
    const record = createWorkspaceRecordEntity({
      id: "record-1",
      title: "整理周报",
    });
    const tag = createWorkspaceTagEntity({
      id: "tag_work",
      name: "工作",
    });
    const services = createWorkspaceAppServicesDouble({
      recordService: {
        listRecords: vi.fn(async () => ({
          items: [record],
          total: 1,
        })),
      },
      tagService: {
        listTags: vi.fn(async () => [tag]),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () =>
          createWorkspaceReminderSummary({
            kind: "due_24h",
            recordIds: [record.id],
          }),
        ),
        listReminderHits: vi.fn(async () => [
          createWorkspaceReminderHit({
            id: record.id,
            title: record.title,
            reminderKind: "due_24h",
          }),
        ]),
      },
    });

    const { result } = renderHook(() =>
      useWorkspaceData({
        activeTagId: "tag_work",
        activeView: "today",
        services,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.records).toHaveLength(1);
    });

    expect(result.current.tags).toEqual([tag]);
    expect(result.current.currentTagName).toBe("工作");
    expect(result.current.reminder?.kind).toBe("due_24h");
    expect(result.current.reminderHits).toHaveLength(1);
    expect(services.recordService.listRecords).toHaveBeenCalledWith({
      view: "today",
      keyword: undefined,
      status: "todo",
      tagId: "tag_work",
      sortBy: "smart",
    });
  });

  it("supports empty-state loading and manual reload after filter changes", async () => {
    const listRecords = vi.fn(async () => ({
      items: [],
      total: 0,
    }));
    const services = createWorkspaceAppServicesDouble({
      recordService: {
        listRecords,
      },
      tagService: {
        listTags: vi.fn(async () => []),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () => null),
        listReminderHits: vi.fn(async () => []),
      },
    });

    const { result } = renderHook(() =>
      useWorkspaceData({
        activeTagId: "all",
        activeView: "all",
        services,
      }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.records).toEqual([]);
    expect(result.current.currentTagName).toBe("全部标签");

    act(() => {
      result.current.setKeyword("周报");
      result.current.setStatus("all");
      result.current.setSortBy("priority");
    });

    await waitFor(() => {
      expect(listRecords).toHaveBeenLastCalledWith({
        view: "all",
        keyword: "周报",
        status: "all",
        tagId: "all",
        sortBy: "priority",
      });
    });
  });

  it("resets loading when a manual reload fails and preserves existing data", async () => {
    const deferred = createDeferred<{ items: ReturnType<typeof createWorkspaceRecordEntity>[]; total: number }>();
    const listRecords = vi
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({
          items: [createWorkspaceRecordEntity({ id: "record-1", title: "已有记录" })],
          total: 1,
        }),
      )
      .mockReturnValueOnce(deferred.promise);
    const services = createWorkspaceAppServicesDouble({
      recordService: {
        listRecords,
      },
      tagService: {
        listTags: vi.fn(async () => []),
      },
      reminderService: {
        getReminderSummary: vi.fn(async () => null),
        listReminderHits: vi.fn(async () => []),
      },
    });

    const { result } = renderHook(() =>
      useWorkspaceData({
        activeTagId: "all",
        activeView: "all",
        services,
      }),
    );

    await waitFor(() => {
      expect(result.current.records).toHaveLength(1);
    });

    let caughtError: unknown;
    let reloadPromise: Promise<void> | undefined;

    act(() => {
      reloadPromise = result.current.loadWorkspace().catch((error) => {
        caughtError = error;
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    deferred.reject(new Error("workspace load failed"));
    await reloadPromise;

    expect((caughtError as Error).message).toBe("workspace load failed");
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.records).toEqual([
      expect.objectContaining({
        id: "record-1",
        title: "已有记录",
      }),
    ]);
  });
});
