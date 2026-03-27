import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TagManagerSheet } from "../TagManagerSheet";
import { createWorkspaceTagEntity } from "../../testing/workspaceServiceTestDoubles";

function createProps() {
  const systemTag = createWorkspaceTagEntity({
    id: "tag_system",
    name: "系统标签",
    isSystem: true,
  });
  const normalTag = createWorkspaceTagEntity({
    id: "tag_work",
    name: "工作",
    isSystem: false,
  });

  return {
    open: true,
    selectedRecord: {
      id: "record-1",
      recordKind: "task" as const,
      title: "整理周报",
      contentMarkdown: "",
      contentPlain: "",
      status: "未开始" as const,
      priority: "P3" as const,
      tags: [normalTag.id],
      dueAt: null,
      plannedAt: null,
      completedAt: null,
      createdAt: "2026-01-01T09:00:00.000Z",
      updatedAt: "2026-01-01T09:00:00.000Z",
      archivedAt: null,
      deletedAt: null,
      sourceReportHistoryId: null,
      aiSummary: null,
      isPinned: false,
    },
    records: [
      {
        id: "record-1",
        recordKind: "task" as const,
        title: "整理周报",
        contentMarkdown: "",
        contentPlain: "",
        status: "未开始" as const,
        priority: "P3" as const,
        tags: [normalTag.id],
        dueAt: null,
        plannedAt: null,
        completedAt: null,
        createdAt: "2026-01-01T09:00:00.000Z",
        updatedAt: "2026-01-01T09:00:00.000Z",
        archivedAt: null,
        deletedAt: null,
        sourceReportHistoryId: null,
        aiSummary: null,
        isPinned: false,
      },
    ],
    tags: [systemTag, normalTag],
    draft: {
      title: "整理周报",
      status: "未开始" as const,
      priority: "P3" as const,
      dueAt: "",
      plannedAt: "",
      completedAt: "",
      contentMarkdown: "",
      tags: [normalTag.id],
      isPinned: false,
    },
    tagEditor: {
      id: systemTag.id,
      name: systemTag.name,
      color: systemTag.color,
    },
    editingTag: systemTag,
    onClose: vi.fn(),
    onResetEditor: vi.fn(),
    onToggleTag: vi.fn(),
    onSelectTag: vi.fn(),
    onTagEditorChange: vi.fn(),
    onSubmit: vi.fn(),
    onDelete: vi.fn(),
  };
}

describe("TagManagerSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
        <TagManagerSheet
          open={false}
          selectedRecord={null}
          records={[]}
          tags={[]}
          draft={null}
          tagEditor={{ id: null, name: "", color: "#5f89ff" }}
        editingTag={null}
        onClose={vi.fn()}
        onResetEditor={vi.fn()}
        onToggleTag={vi.fn()}
        onSelectTag={vi.fn()}
        onTagEditorChange={vi.fn()}
        onSubmit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("wires backdrop, tag selection, editor changes, and disables delete for system tag", () => {
    const props = createProps();
    const { container } = render(<TagManagerSheet {...props} />);

    fireEvent.click(container.firstChild as HTMLElement);
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("清空"));
    expect(props.onResetEditor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("编辑标签 工作"));
    expect(props.onSelectTag).toHaveBeenCalledWith(props.tags[1]);

    const bindList = container.querySelector(".tag-bind-list") as HTMLElement;
    fireEvent.click(within(bindList).getByText("系统标签"));
    expect(props.onToggleTag).toHaveBeenCalledWith("tag_system");

    const nameInput = screen.getByPlaceholderText("输入标签名称");
    fireEvent.change(nameInput, {
      target: { value: "新标签" },
    });
    expect(props.onTagEditorChange).toHaveBeenCalledWith({
      ...props.tagEditor,
      name: "新标签",
    });

    const colorInput = container.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(colorInput, {
      target: { value: "#123456" },
    });
    expect(props.onTagEditorChange).toHaveBeenCalledWith({
      ...props.tagEditor,
      color: "#123456",
    });

    const deleteButton = screen.getByLabelText("删除标签 系统标签") as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("删除标签 工作"));
    expect(screen.getByText("确认删除“工作”？")).toBeTruthy();
    fireEvent.click(screen.getByText("取消"));
    expect(props.onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("删除标签 工作"));
    fireEvent.click(screen.getByText("确认删除"));
    expect(props.onDelete).toHaveBeenCalledWith(props.tags[1]);

    fireEvent.click(screen.getByText("保存修改"));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });
});
