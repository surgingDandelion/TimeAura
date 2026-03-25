import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createWorkspaceAppServicesDouble, createWorkspaceRecordEntity } from "../../testing/workspaceServiceTestDoubles";
import { fromInputValue, toInputValue } from "../../utils";
import { useWorkspaceRecordDraft } from "../useWorkspaceRecordDraft";

describe("useWorkspaceRecordDraft", () => {
  it("hydrates draft from selected record and updates dirty state as fields change", () => {
    const selectedRecord = createWorkspaceRecordEntity({
      id: "record-1",
      title: "整理周报",
      dueAt: "2026-01-02T09:00:00.000Z",
      plannedAt: "2026-01-01T18:00:00.000Z",
      tags: ["tag_uncategorized"],
    });

    const { result } = renderHook(() =>
      useWorkspaceRecordDraft({
        selectedRecord,
        services: createWorkspaceAppServicesDouble(),
        syncWorkspace: vi.fn(async (_afterMessage?: string) => undefined),
        onMessage: vi.fn(),
      }),
    );

    expect(result.current.draft).toEqual({
      title: "整理周报",
      status: "未开始",
      priority: "P3",
      dueAt: toInputValue("2026-01-02T09:00:00.000Z"),
      plannedAt: toInputValue("2026-01-01T18:00:00.000Z"),
      contentMarkdown: "",
      tags: ["tag_uncategorized"],
      isPinned: false,
    });
    expect(result.current.contentMode).toBe("edit");
    expect(result.current.draftDirty).toBe(false);

    act(() => {
      result.current.setDraft({
        ...result.current.draft!,
        title: "整理周报 v2",
      });
    });

    expect(result.current.draftDirty).toBe(true);

    act(() => {
      result.current.toggleTag("tag_work");
    });

    expect(result.current.draft?.tags).toEqual(["tag_work"]);

    act(() => {
      result.current.toggleTag("tag_work");
    });

    expect(result.current.draft?.tags).toEqual(["tag_uncategorized"]);
  });

  it("saves draft with trimmed title and normalized date fields", async () => {
    const updateRecord = vi.fn(async () => createWorkspaceRecordEntity());
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);
    const selectedRecord = createWorkspaceRecordEntity({
      id: "record-1",
      title: "整理周报",
      tags: ["tag_work"],
    });

    const { result } = renderHook(() =>
      useWorkspaceRecordDraft({
        selectedRecord,
        services: createWorkspaceAppServicesDouble({
          recordService: {
            updateRecord,
          },
        }),
        syncWorkspace,
        onMessage: vi.fn(),
      }),
    );

    act(() => {
      result.current.setDraft({
        ...result.current.draft!,
        title: "  新标题  ",
        dueAt: "2026-01-03T12:30",
        plannedAt: "2026-01-02T10:15",
        isPinned: true,
      });
    });

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(updateRecord).toHaveBeenCalledWith("record-1", {
      title: "新标题",
      status: "未开始",
      priority: "P3",
      dueAt: fromInputValue("2026-01-03T12:30"),
      plannedAt: fromInputValue("2026-01-02T10:15"),
      contentMarkdown: "",
      tags: ["tag_work"],
      isPinned: true,
    });
    expect(syncWorkspace).toHaveBeenCalledWith("记录已保存");
    expect(result.current.saving).toBe(false);
  });

  it("runs AI summary and polish flows with correct state updates", async () => {
    const generateSummary = vi.fn(async () => ({
      content: "AI 摘要结果",
      channelId: "channel-default",
      providerType: "openai-compatible",
      fallbackUsed: false,
    }));
    const polishMarkdown = vi.fn(async () => ({
      content: "## 润色后的内容",
      channelId: "channel-default",
      providerType: "openai-compatible",
      fallbackUsed: false,
    }));
    const updateRecord = vi.fn(async () => createWorkspaceRecordEntity());
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);
    const onMessage = vi.fn();
    const selectedRecord = createWorkspaceRecordEntity({
      id: "record-1",
      contentMarkdown: "# 原始内容",
    });

    const { result } = renderHook(() =>
      useWorkspaceRecordDraft({
        selectedRecord,
        services: createWorkspaceAppServicesDouble({
          aiService: {
            generateSummary,
            polishMarkdown,
          },
          recordService: {
            updateRecord,
          },
        }),
        syncWorkspace,
        onMessage,
      }),
    );

    await act(async () => {
      await result.current.generateSummary();
    });

    expect(generateSummary).toHaveBeenCalledWith({
      recordId: "record-1",
    });
    expect(updateRecord).toHaveBeenCalledWith("record-1", {
      aiSummary: "AI 摘要结果",
    });
    expect(syncWorkspace).toHaveBeenCalledWith("AI 摘要已写入");

    await act(async () => {
      await result.current.polishMarkdown();
    });

    expect(polishMarkdown).toHaveBeenCalledWith({
      recordId: "record-1",
      markdown: "# 原始内容",
    });

    await waitFor(() => {
      expect(result.current.draft?.contentMarkdown).toBe("## 润色后的内容");
    });

    expect(result.current.contentMode).toBe("preview");
    expect(onMessage).toHaveBeenCalledWith("内容已完成 AI 润色，可预览后再保存");
    expect(result.current.saving).toBe(false);
  });
});
