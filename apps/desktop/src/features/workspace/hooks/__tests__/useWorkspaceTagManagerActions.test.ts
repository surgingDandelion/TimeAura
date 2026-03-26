import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecordDraft } from "../../types";
import {
  createWorkspaceAppServicesDouble,
  createWorkspaceTagEntity,
} from "../../testing/workspaceServiceTestDoubles";
import { createWorkspaceTestFixtureBundle } from "../../testing/workspaceTestFixtures";
import { useWorkspaceTagManagerActions } from "../useWorkspaceTagManagerActions";

function createDraft(overrides: Partial<RecordDraft> = {}): RecordDraft {
  return {
    title: "整理周报",
    status: "未开始",
    priority: "P3",
    dueAt: "",
    plannedAt: "",
    completedAt: "",
    contentMarkdown: "",
    tags: ["tag_uncategorized"],
    isPinned: false,
    ...overrides,
  };
}

describe("useWorkspaceTagManagerActions", () => {
  it("returns noop and message when tag name is empty", async () => {
    const services = createWorkspaceAppServicesDouble();
    const onDraftChange = vi.fn();
    const onMessage = vi.fn();
    const onTagFilterChange = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);

    const { result } = renderHook(() =>
      useWorkspaceTagManagerActions({
        activeTagId: "all",
        draft: createDraft(),
        services,
        tags: [],
        onDraftChange,
        onMessage,
        onTagFilterChange,
        syncWorkspace,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleCreateOrUpdateTag>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleCreateOrUpdateTag();
    });

    expect(commandResult).toEqual({
      status: "noop",
    });
    expect(onMessage).toHaveBeenCalledWith("标签名称不能为空");
    expect(services.tagService.createTag).not.toHaveBeenCalled();
    expect(syncWorkspace).not.toHaveBeenCalled();
  });

  it("creates a new tag and replaces uncategorized tag in current draft", async () => {
    const createTag = vi.fn(async () =>
      createWorkspaceTagEntity({
        id: "tag_focus",
        name: "重点",
        color: "#ff6b57",
      }),
    );
    const services = createWorkspaceAppServicesDouble({
      tagService: {
        createTag,
      },
    });
    const onDraftChange = vi.fn();
    const onMessage = vi.fn();
    const onTagFilterChange = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);

    const { result } = renderHook(() =>
      useWorkspaceTagManagerActions({
        activeTagId: "all",
        draft: createDraft(),
        services,
        tags: [],
        onDraftChange,
        onMessage,
        onTagFilterChange,
        syncWorkspace,
      }),
    );

    act(() => {
      result.current.setTagEditor({
        id: null,
        name: "  重点  ",
        color: "#ff6b57",
      });
    });

    let commandResult: Awaited<ReturnType<typeof result.current.handleCreateOrUpdateTag>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleCreateOrUpdateTag();
    });

    expect(createTag).toHaveBeenCalledWith({
      name: "重点",
      color: "#ff6b57",
    });
    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag_focus"],
      }),
    );
    expect(result.current.tagEditor).toEqual({
      id: "tag_focus",
      name: "重点",
      color: "#ff6b57",
    });
    expect(commandResult).toEqual({
      status: "success",
      message: "已创建新标签",
      data: { tagId: "tag_focus" },
    });
    expect(syncWorkspace).toHaveBeenCalledWith("已创建新标签");
    expect(onMessage).not.toHaveBeenCalled();
    expect(onTagFilterChange).not.toHaveBeenCalled();
  });

  it("updates an existing tag and returns success metadata", async () => {
    const updateTag = vi.fn(async (_id: string) =>
      createWorkspaceTagEntity({
        id: "tag_work",
        name: "工作-已更新",
        color: "#4d7cff",
      }),
    );
    const services = createWorkspaceAppServicesDouble({
      tagService: {
        updateTag,
      },
    });
    const tag = createWorkspaceTagEntity({
      id: "tag_work",
      name: "工作",
      color: "#5f89ff",
    });

    const { result } = renderHook(() =>
      useWorkspaceTagManagerActions({
        activeTagId: "all",
        draft: createDraft({
          tags: ["tag_work"],
        }),
        services,
        tags: [tag],
        onDraftChange: vi.fn(),
        onMessage: vi.fn(),
        onTagFilterChange: vi.fn(),
        syncWorkspace: vi.fn(async (_afterMessage?: string) => undefined),
      }),
    );

    act(() => {
      result.current.startEditTag(tag);
    });

    act(() => {
      result.current.setTagEditor({
        id: "tag_work",
        name: " 工作-已更新 ",
        color: "#4d7cff",
      });
    });

    let commandResult: Awaited<ReturnType<typeof result.current.handleCreateOrUpdateTag>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleCreateOrUpdateTag();
    });

    expect(updateTag).toHaveBeenCalledWith("tag_work", {
      name: "工作-已更新",
      color: "#4d7cff",
    });
    expect(commandResult).toEqual({
      status: "success",
      message: "标签已更新",
      data: { tagId: "tag_work" },
    });
  });

  it("deletes tag after confirmation and clears active filter plus draft tag", async () => {
    const { seams, state } = createWorkspaceTestFixtureBundle({ confirmResult: true });
    const deleteTag = vi.fn(async () => undefined);
    const services = createWorkspaceAppServicesDouble({
      tagService: {
        deleteTag,
      },
    });
    const onDraftChange = vi.fn();
    const onTagFilterChange = vi.fn();
    const syncWorkspace = vi.fn(async (_afterMessage?: string) => undefined);
    const tag = createWorkspaceTagEntity({
      id: "tag_work",
      name: "工作",
    });

    const { result } = renderHook(() =>
      useWorkspaceTagManagerActions({
        activeTagId: "tag_work",
        draft: createDraft({
          tags: ["tag_work", "tag_focus"],
        }),
        services,
        tags: [tag],
        onDraftChange,
        onMessage: vi.fn(),
        onTagFilterChange,
        syncWorkspace,
        seams,
      }),
    );

    let commandResult: Awaited<ReturnType<typeof result.current.handleDeleteTag>> | undefined;

    await act(async () => {
      commandResult = await result.current.handleDeleteTag(tag);
    });

    expect(state.confirmMessages).toEqual(['确认删除标签“工作”吗？']);
    expect(deleteTag).toHaveBeenCalledWith("tag_work");
    expect(onTagFilterChange).toHaveBeenCalledWith("all");
    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["tag_focus"],
      }),
    );
    expect(commandResult).toEqual({
      status: "success",
      message: "标签已删除",
      data: { tagId: "tag_work" },
    });
    expect(syncWorkspace).toHaveBeenCalledWith("标签已删除");
  });
});
