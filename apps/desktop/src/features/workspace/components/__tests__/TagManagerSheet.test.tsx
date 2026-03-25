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
    tags: [systemTag, normalTag],
    draft: {
      title: "整理周报",
      status: "未开始" as const,
      priority: "P3" as const,
      dueAt: "",
      plannedAt: "",
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

    fireEvent.click(screen.getByText("新建标签"));
    expect(props.onResetEditor).toHaveBeenCalledTimes(1);

    const tagLibrary = container.querySelector(".sheet-tag-library") as HTMLElement;
    fireEvent.click(within(tagLibrary).getByText("工作"));
    expect(props.onSelectTag).toHaveBeenCalledWith(props.tags[1]);

    const tagSelector = container.querySelector(".tag-selector") as HTMLElement;
    fireEvent.click(within(tagSelector).getAllByRole("checkbox")[0]!);
    expect(props.onToggleTag).toHaveBeenCalledWith("tag_system");

    const nameInput = screen.getByPlaceholderText("例如：项目A");
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

    const actionsRegion = screen.getByText("编辑标签").parentElement?.parentElement;
    const deleteButton = within(actionsRegion as HTMLElement).getByText("删除标签") as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    fireEvent.click(screen.getByText("保存标签"));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });
});
