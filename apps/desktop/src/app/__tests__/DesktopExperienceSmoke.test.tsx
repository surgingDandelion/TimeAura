import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMockAppServices } from "@timeaura-core";
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../App";
import * as createDesktopAppServicesModule from "../bootstrap/createDesktopAppServices";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  window.HTMLElement.prototype,
  "scrollIntoView",
);

describe("Desktop experience smoke", () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterAll(() => {
    if (originalScrollIntoView) {
      Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
      return;
    }

    delete (window.HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("boots the real desktop shell and navigates through workspace, report, and channel flows", async () => {
    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockResolvedValue(
      createMockAppServices(),
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("统一记录列表")).toBeTruthy();
    });

    const quickAddInput = screen.getByPlaceholderText(/单行快速新增到/);
    fireEvent.change(quickAddInput, {
      target: {
        value: "Smoke 验收记录",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "新增" }));

    await waitFor(() => {
      expect(screen.getByText("Smoke 验收记录")).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText("AI 报告"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "周报 / 月报工作台" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "生成草稿" }));

    await waitFor(() => {
      expect(screen.getByText("报告草稿已生成")).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText("通道配置"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "通道配置中心" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));

    await waitFor(() => {
      expect(screen.getByText("通道连接成功")).toBeTruthy();
    });
  });
});
