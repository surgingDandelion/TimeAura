import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "../App";

const providerSpy = vi.fn();
const shellSpy = vi.fn();

vi.mock("../providers/AppServicesProvider", () => ({
  AppServicesProvider: ({ children }: { children: JSX.Element }) => {
    providerSpy();
    return <div data-testid="app-provider">{children}</div>;
  },
}));

vi.mock("../AppShell", () => ({
  AppShell: () => {
    shellSpy();
    return <div data-testid="app-shell">shell</div>;
  },
}));

describe("App", () => {
  it("wraps AppShell with AppServicesProvider", () => {
    render(<App />);

    expect(providerSpy).toHaveBeenCalledTimes(1);
    expect(shellSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("app-provider")).toBeTruthy();
    expect(screen.getByTestId("app-shell")).toBeTruthy();
  });
});
