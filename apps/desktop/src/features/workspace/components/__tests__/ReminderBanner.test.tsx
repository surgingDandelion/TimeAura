import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReminderBanner } from "../ReminderBanner";
import {
  createWorkspaceReminderHit,
  createWorkspaceReminderSummary,
} from "../../testing/workspaceServiceTestDoubles";

function createProps() {
  const reminder = createWorkspaceReminderSummary({
    kind: "overdue",
    title: "有任务已逾期",
  });
  const hit = createWorkspaceReminderHit({
    id: "record-1",
    title: "整理周报",
    reminderKind: "overdue",
    dueAt: "2026-01-02T09:00:00.000Z",
  });

  return {
    reminder,
    activeReminderHits: [hit],
    activeReminderTargetIds: [hit.id],
    reminderExpanded: true,
    reminderSelectedIds: [hit.id],
    reminderSelectedOnly: true,
    selectedId: hit.id,
    visibleReminderSelectedCount: 1,
    onToggleExpanded: vi.fn(),
    onToggleSelectedOnly: vi.fn(),
    onSnoozeReminder: vi.fn(),
    onReschedule: vi.fn(),
    onOpenCustom: vi.fn(),
    onToggleSelectAll: vi.fn(),
    onFocusRecord: vi.fn(),
    onToggleReminderSelection: vi.fn(),
  };
}

describe("ReminderBanner", () => {
  it("does not render when reminder is absent", () => {
    const { container } = render(
      <ReminderBanner
        reminder={null}
        activeReminderHits={[]}
        activeReminderTargetIds={[]}
        reminderExpanded={false}
        reminderSelectedIds={[]}
        reminderSelectedOnly={false}
        selectedId={null}
        visibleReminderSelectedCount={0}
        onToggleExpanded={vi.fn()}
        onToggleSelectedOnly={vi.fn()}
        onSnoozeReminder={vi.fn()}
        onReschedule={vi.fn()}
        onOpenCustom={vi.fn()}
        onToggleSelectAll={vi.fn()}
        onFocusRecord={vi.fn()}
        onToggleReminderSelection={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders expanded hits and wires banner actions", () => {
    const props = createProps();

    render(<ReminderBanner {...props} />);

    fireEvent.click(screen.getByText("30 分钟后提醒"));
    fireEvent.click(screen.getByText("顺延 1 小时"));
    fireEvent.click(screen.getByText("改到今晚 18:00"));
    fireEvent.click(screen.getByText("改到明早 09:00"));
    fireEvent.click(screen.getByText("自定义时间"));
    fireEvent.click(screen.getByText("清空命中选择"));
    fireEvent.click(screen.getByText("整理周报"));
    fireEvent.click(screen.getByRole("checkbox"));

    expect(props.onSnoozeReminder).toHaveBeenCalledWith(30);
    expect(props.onReschedule).toHaveBeenNthCalledWith(1, "plus_1_hour");
    expect(props.onReschedule).toHaveBeenNthCalledWith(2, "today_18");
    expect(props.onReschedule).toHaveBeenNthCalledWith(3, "tomorrow_09");
    expect(props.onOpenCustom).toHaveBeenCalledTimes(1);
    expect(props.onToggleSelectAll).toHaveBeenCalledTimes(1);
    expect(props.onFocusRecord).toHaveBeenCalledWith("record-1");
    expect(props.onToggleReminderSelection).toHaveBeenCalledWith("record-1");
  });

  it("renders collapsed boundary state and disables selected-only actions without selections", () => {
    const props = {
      ...createProps(),
      reminderExpanded: false,
      reminderSelectedIds: [],
      reminderSelectedOnly: false,
      visibleReminderSelectedCount: 0,
    };

    const { container } = render(<ReminderBanner {...props} />);

    expect(screen.getByText("展开命中任务（1）")).toBeTruthy();
    expect(screen.getByText("已选 0 / 命中 1")).toBeTruthy();
    expect(screen.queryByText("当前快捷操作默认作用于全部命中项")).toBeNull();
    expect(container.querySelector(".reminder-hit-panel")).toBeNull();

    const selectedOnlyButton = screen.getByText("仅改选中") as HTMLButtonElement;
    expect(selectedOnlyButton.disabled).toBe(true);

    fireEvent.click(screen.getByText("展开命中任务（1）"));

    expect(props.onToggleExpanded).toHaveBeenCalledTimes(1);
    expect(props.onToggleSelectedOnly).not.toHaveBeenCalled();
  });

  it("prevents row focus when only toggling hit selection and reflects all-selected label", () => {
    const props = {
      ...createProps(),
      activeReminderHits: [
        createWorkspaceReminderHit({
          id: "record-1",
          title: "整理周报",
          reminderKind: "overdue",
        }),
        createWorkspaceReminderHit({
          id: "record-2",
          title: "整理月报",
          reminderKind: "overdue",
          priority: "P1",
        }),
      ],
      activeReminderTargetIds: ["record-1", "record-2"],
      reminderSelectedIds: ["record-1", "record-2"],
      selectedId: "record-2",
      visibleReminderSelectedCount: 2,
    };

    const { container } = render(<ReminderBanner {...props} />);

    expect(screen.getByText("清空命中选择")).toBeTruthy();

    const hitRows = container.querySelectorAll(".reminder-hit-row");
    expect(hitRows[1]?.className).toContain("reminder-hit-row-active");
    expect(hitRows[1]?.className).toContain("reminder-hit-row-selected");

    const checkbox = screen.getAllByRole("checkbox")[1] as HTMLInputElement;
    fireEvent.click(checkbox);

    expect(props.onToggleReminderSelection).toHaveBeenCalledWith("record-2");
    expect(props.onFocusRecord).not.toHaveBeenCalled();
  });
});
