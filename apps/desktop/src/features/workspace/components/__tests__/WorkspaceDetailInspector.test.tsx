import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceDetailInspector } from "../WorkspaceDetailInspector";
import {
  createWorkspaceRecordEntity,
  createWorkspaceTagEntity,
} from "../../testing/workspaceServiceTestDoubles";

function createProps() {
  const workTag = createWorkspaceTagEntity({
    id: "tag_work",
    name: "工作",
  });
  const focusTag = createWorkspaceTagEntity({
    id: "tag_focus",
    name: "重点",
    color: "#ff6b57",
  });
  const record = createWorkspaceRecordEntity({
    id: "record-1",
    title: "整理周报",
    tags: [workTag.id],
    contentMarkdown: "# 周报\n- 已完成架构梳理",
    aiSummary: "当前记录已有 AI 摘要。",
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  });

  return {
    selectedRecord: record,
    draft: {
      title: record.title,
      status: record.status,
      priority: record.priority,
      dueAt: "",
      plannedAt: "",
      completedAt: "",
      contentMarkdown: record.contentMarkdown,
      tags: record.tags,
      isPinned: false,
    },
    tags: [workTag, focusTag],
    contentMode: "edit" as const,
    saving: false,
    draftDirty: true,
    onGenerateSummary: vi.fn(),
    onPolishMarkdown: vi.fn(),
    onOpenTagManager: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDraftChange: vi.fn(),
    onToggleTag: vi.fn(),
    onContentModeChange: vi.fn(),
  };
}

describe("WorkspaceDetailInspector", () => {
  it("renders empty state when there is no selected record", () => {
    render(
      <WorkspaceDetailInspector
        selectedRecord={null}
        draft={null}
        tags={[]}
        contentMode="edit"
        saving={false}
        draftDirty={false}
        onGenerateSummary={vi.fn()}
        onPolishMarkdown={vi.fn()}
        onOpenTagManager={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDraftChange={vi.fn()}
        onToggleTag={vi.fn()}
        onContentModeChange={vi.fn()}
      />,
    );

    expect(screen.getByText("点击左侧记录后，在这里查看和编辑详情。")).toBeTruthy();
  });

  it("wires header actions, field changes, selects, and preview toggle", () => {
    const props = createProps();
    const { container } = render(<WorkspaceDetailInspector {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "AI 摘要" }));
    fireEvent.click(screen.getByRole("button", { name: "润色" }));
    fireEvent.click(screen.getByRole("button", { name: "归档" }));
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    fireEvent.click(screen.getByRole("button", { name: "管理标签" }));

    expect(props.onGenerateSummary).toHaveBeenCalledTimes(1);
    expect(props.onPolishMarkdown).toHaveBeenCalledTimes(1);
    expect(props.onOpenTagManager).toHaveBeenCalledTimes(1);
    expect(props.onArchive).toHaveBeenCalledWith("record-1");
    expect(props.onDelete).toHaveBeenCalledWith("record-1");
    expect(props.onClose).toHaveBeenCalledTimes(1);

    const titleInput = screen.getByDisplayValue("整理周报");
    fireEvent.change(titleInput, {
      target: { value: "整理周报 v2" },
    });
    expect(props.onDraftChange).toHaveBeenCalledWith({
      ...props.draft,
      title: "整理周报 v2",
    });

    fireEvent.change(screen.getByDisplayValue("未开始"), {
      target: { value: "进行中" },
    });
    expect(props.onDraftChange).toHaveBeenCalledWith({
      ...props.draft,
      status: "进行中",
    });

    fireEvent.change(screen.getByDisplayValue("P3 常规"), {
      target: { value: "P1" },
    });
    expect(props.onDraftChange).toHaveBeenCalledWith({
      ...props.draft,
      priority: "P1",
    });

    const dateInputs = container.querySelectorAll('input[type="datetime-local"]');
    fireEvent.change(dateInputs[0] as HTMLInputElement, {
      target: { value: "2026-01-03T12:30" },
    });
    expect(props.onDraftChange).toHaveBeenCalledWith({
      ...props.draft,
      dueAt: "2026-01-03T12:30",
    });

    expect(screen.getByText("工作")).toBeTruthy();

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "## 新内容" },
    });
    expect(props.onDraftChange).toHaveBeenCalledWith({
      ...props.draft,
      contentMarkdown: "## 新内容",
    });

    fireEvent.click(screen.getByText("分栏"));
    fireEvent.click(screen.getByText("预览"));
    expect(props.onContentModeChange).toHaveBeenNthCalledWith(1, "split");
    expect(props.onContentModeChange).toHaveBeenNthCalledWith(2, "preview");
  });

  it("renders preview mode with synced draft header and tag chips", () => {
    const props = {
      ...createProps(),
      contentMode: "preview" as const,
      draftDirty: false,
      saving: true,
    };

    render(<WorkspaceDetailInspector {...props} />);

    expect(screen.getByText("当前记录已有 AI 摘要。")).toBeTruthy();
    expect(screen.getByText("已完成架构梳理")).toBeTruthy();
    expect(screen.getByRole("button", { name: "关闭详情" })).toBeTruthy();
    expect(screen.getByDisplayValue("未开始")).toBeTruthy();
    expect(screen.getByText("截止时间 · 未设置")).toBeTruthy();
  });
});
