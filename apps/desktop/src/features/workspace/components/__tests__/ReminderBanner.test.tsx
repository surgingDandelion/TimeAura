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
});
