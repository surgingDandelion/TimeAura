import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CustomReminderSheet } from "../CustomReminderSheet";

function createProps() {
  return {
    open: true,
    reminderSelectedOnly: true,
    reminderSelectedIds: ["record-1", "record-2"],
    activeReminderTargetIds: ["record-1", "record-2", "record-3"],
    customReminderDueAt: "2026-01-03T12:30",
    customReminderValidation: [],
    onClose: vi.fn(),
    onChangeDueAt: vi.fn(),
    onApplyPreset: vi.fn(),
    onSubmit: vi.fn(),
  };
}

describe("CustomReminderSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CustomReminderSheet
        open={false}
        reminderSelectedOnly={false}
        reminderSelectedIds={[]}
        activeReminderTargetIds={[]}
        customReminderDueAt=""
        customReminderValidation={[]}
        onClose={vi.fn()}
        onChangeDueAt={vi.fn()}
        onApplyPreset={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("wires preset actions, date changes, submit, and close", () => {
    const props = createProps();
    const { container } = render(<CustomReminderSheet {...props} />);

    expect(screen.getByText("仅调整已勾选的 2 条命中任务")).toBeTruthy();

    fireEvent.click(screen.getByText("1 小时后"));
    fireEvent.click(screen.getByText("今晚 18:00"));
    fireEvent.click(screen.getByText("明早 09:00"));
    fireEvent.click(screen.getByText("本周五 18:00"));
    fireEvent.click(screen.getByText("下周一 09:00"));

    expect(props.onApplyPreset).toHaveBeenNthCalledWith(1, "plus_1_hour");
    expect(props.onApplyPreset).toHaveBeenNthCalledWith(2, "today_18");
    expect(props.onApplyPreset).toHaveBeenNthCalledWith(3, "tomorrow_09");
    expect(props.onApplyPreset).toHaveBeenNthCalledWith(4, "friday_18");
    expect(props.onApplyPreset).toHaveBeenNthCalledWith(5, "next_monday_09");

    fireEvent.change(screen.getByDisplayValue("2026-01-03T12:30"), {
      target: { value: "2026-01-04T08:00" },
    });
    expect(props.onChangeDueAt).toHaveBeenCalledWith("2026-01-04T08:00");

    fireEvent.click(screen.getByText("保存改期"));
    fireEvent.click(screen.getByText("取消"));
    fireEvent.click(container.firstChild as HTMLElement);

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it("shows validation state and disables submit", () => {
    const props = {
      ...createProps(),
      reminderSelectedOnly: false,
      reminderSelectedIds: [],
      customReminderValidation: ["请选择新的截止时间。", "当前没有可改期的提醒命中任务。"],
    };

    render(<CustomReminderSheet {...props} />);

    expect(screen.getByText("默认调整当前提醒命中的 3 条任务")).toBeTruthy();
    expect(screen.getByText("保存前请先处理以下问题：")).toBeTruthy();

    const saveButton = screen.getByText("保存改期") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });
});
