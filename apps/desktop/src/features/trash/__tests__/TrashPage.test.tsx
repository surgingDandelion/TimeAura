import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TrashPage } from "../TrashPage";

const useAppServicesSpy = vi.fn();

vi.mock("../../../app/providers/AppServicesProvider", () => ({
  useAppServices: () => useAppServicesSpy(),
}));

function createDeletedRecord(id: string, title: string) {
  return {
    id,
    recordKind: "task" as const,
    title,
    contentMarkdown: "",
    contentPlain: "",
    status: "未开始" as const,
    priority: "P3" as const,
    tags: [],
    dueAt: null,
    plannedAt: null,
    completedAt: null,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    archivedAt: null,
    deletedAt: "2026-01-02T10:00:00.000Z",
    sourceReportHistoryId: null,
    aiSummary: null,
    isPinned: false,
  };
}

describe("TrashPage", () => {
  beforeEach(() => {
    useAppServicesSpy.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads deleted records and restores them", async () => {
    const listRecords = vi.fn(async () => ({
      items: [createDeletedRecord("record-1", "已删除任务")],
      total: 1,
    }));
    const restoreRecord = vi.fn(async (_id: string) => createDeletedRecord("record-1", "已删除任务"));
    const onTrashChanged = vi.fn(async () => undefined);

    useAppServicesSpy.mockReturnValue({
      services: {
        recordService: {
          listRecords,
          restoreRecord,
          destroyRecord: vi.fn(async () => undefined),
          emptyTrash: vi.fn(async () => 0),
        },
      },
    });

    render(<TrashPage onTrashChanged={onTrashChanged} />);

    await waitFor(() => {
      expect(screen.getByText("已删除任务")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "恢复" }));

    await waitFor(() => {
      expect(restoreRecord).toHaveBeenCalledWith("record-1");
      expect(onTrashChanged).toHaveBeenCalled();
      expect(screen.getByText("记录已恢复到主工作台")).toBeTruthy();
    });
  });

  it("empties trash directly", async () => {
    const listRecords = vi
      .fn()
      .mockResolvedValueOnce({
        items: [createDeletedRecord("record-1", "已删除任务")],
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      });
    const emptyTrash = vi.fn(async () => 1);

    useAppServicesSpy.mockReturnValue({
      services: {
        recordService: {
          listRecords,
          restoreRecord: vi.fn(async (_id: string) => createDeletedRecord("record-1", "已删除任务")),
          destroyRecord: vi.fn(async () => undefined),
          emptyTrash,
        },
      },
    });

    render(<TrashPage />);

    await waitFor(() => {
      expect(screen.getByText("已删除任务")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "清空回收站" }));

    await waitFor(() => {
      expect(emptyTrash).toHaveBeenCalledTimes(1);
      expect(screen.getByText("已清空回收站，共删除 1 条记录")).toBeTruthy();
    });
  });

  it("destroys a trashed record directly", async () => {
    const listRecords = vi
      .fn()
      .mockResolvedValueOnce({
        items: [createDeletedRecord("record-1", "已删除任务")],
        total: 1,
      })
      .mockResolvedValueOnce({
        items: [],
        total: 0,
      });
    const destroyRecord = vi.fn(async () => undefined);

    useAppServicesSpy.mockReturnValue({
      services: {
        recordService: {
          listRecords,
          restoreRecord: vi.fn(async (_id: string) => createDeletedRecord("record-1", "已删除任务")),
          destroyRecord,
          emptyTrash: vi.fn(async () => 0),
        },
      },
    });

    render(<TrashPage />);

    await waitFor(() => {
      expect(screen.getByText("已删除任务")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "彻底删除" }));

    await waitFor(() => {
      expect(destroyRecord).toHaveBeenCalledWith("record-1");
      expect(screen.getByText("记录已彻底删除")).toBeTruthy();
    });
  });
});
