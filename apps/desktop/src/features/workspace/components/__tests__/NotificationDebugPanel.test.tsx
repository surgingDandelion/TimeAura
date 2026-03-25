import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NotificationDebugPanel } from "../NotificationDebugPanel";

function createProps() {
  return {
    entries: [
      {
        id: "debug-1",
        at: "2026-01-01T09:30:00.000Z",
        source: "action" as const,
        level: "info" as const,
        title: "提醒已触发",
        detail: "任务 A 已进入通知扫描范围",
      },
      {
        id: "debug-2",
        at: "2026-01-01T09:31:00.000Z",
        source: "driver" as const,
        level: "warning" as const,
        title: "通知已取消",
        detail: "系统已回收旧提醒",
      },
    ],
    open: true,
    onToggleOpen: vi.fn(),
    onExport: vi.fn(),
    onClear: vi.fn(),
  };
}

describe("NotificationDebugPanel", () => {
  it("renders open panel entries and wires toolbar actions", () => {
    const props = createProps();
    const { container } = render(<NotificationDebugPanel {...props} />);

    expect(screen.getByText("2 条最近事件")).toBeTruthy();
    expect(screen.getByText("提醒已触发")).toBeTruthy();
    expect(screen.getByText(/动作/)).toBeTruthy();
    expect(container.querySelector(".debug-log-row-warning")).toBeTruthy();

    fireEvent.click(screen.getByText("导出"));
    fireEvent.click(screen.getByText("清空"));
    fireEvent.click(screen.getByText("收起调试"));

    expect(props.onExport).toHaveBeenCalledTimes(1);
    expect(props.onClear).toHaveBeenCalledTimes(1);
    expect(props.onToggleOpen).toHaveBeenCalledTimes(1);
  });

  it("shows empty copy and disables export/clear when there are no entries", () => {
    render(
      <NotificationDebugPanel
        entries={[]}
        open={true}
        onToggleOpen={vi.fn()}
        onExport={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("当前还没有通知事件，后续发送、回退、点击动作都会显示在这里。")).toBeTruthy();
    expect((screen.getByText("导出") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText("清空") as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps rows hidden when collapsed while preserving toggle availability", () => {
    render(
      <NotificationDebugPanel
        entries={createProps().entries}
        open={false}
        onToggleOpen={vi.fn()}
        onExport={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("展开调试")).toBeTruthy();
    expect(screen.queryByText("提醒已触发")).toBeNull();
  });
});
