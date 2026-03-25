import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AppServicesProvider,
  useAppServices,
} from "../AppServicesProvider";
import * as createDesktopAppServicesModule from "../../bootstrap/createDesktopAppServices";
import { createWorkspaceAppContainerDouble } from "../../../features/workspace/testing/workspaceServiceTestDoubles";

function Consumer() {
  const container = useAppServices();

  return <div data-testid="provider-consumer">{container.services ? "ready" : "missing"}</div>;
}

function ThrowingConsumer() {
  useAppServices();
  return null;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("AppServicesProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows bootstrap loading before services are ready, then renders children", async () => {
    const deferred = createDeferred<ReturnType<typeof createWorkspaceAppContainerDouble>>();
    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockReturnValue(
      deferred.promise as ReturnType<typeof createDesktopAppServicesModule.createDesktopAppServices>,
    );

    render(
      <AppServicesProvider>
        <Consumer />
      </AppServicesProvider>,
    );

    expect(screen.getByText("正在初始化 TimeAura Desktop…")).toBeTruthy();

    deferred.resolve(createWorkspaceAppContainerDouble());

    await waitFor(() => {
      expect(screen.getByTestId("provider-consumer").textContent).toBe("ready");
    });
  });

  it("renders error bootstrap state when service initialization fails", async () => {
    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockRejectedValue(
      new Error("初始化链路失败"),
    );

    render(
      <AppServicesProvider>
        <Consumer />
      </AppServicesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("应用初始化失败")).toBeTruthy();
      expect(screen.getByText("初始化链路失败")).toBeTruthy();
    });
  });

  it("disposes resolved container if initialization finishes after unmount", async () => {
    const deferred = createDeferred<ReturnType<typeof createWorkspaceAppContainerDouble>>();
    const container = createWorkspaceAppContainerDouble();
    const disposeSpy = vi.fn(async () => undefined);
    container.dispose = disposeSpy;

    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockReturnValue(
      deferred.promise as ReturnType<typeof createDesktopAppServicesModule.createDesktopAppServices>,
    );

    const { unmount } = render(
      <AppServicesProvider>
        <Consumer />
      </AppServicesProvider>,
    );

    unmount();
    deferred.resolve(container);

    await waitFor(() => {
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("disposes active container on unmount after successful initialization", async () => {
    const container = createWorkspaceAppContainerDouble();
    const disposeSpy = vi.fn(async () => undefined);
    container.dispose = disposeSpy;

    vi.spyOn(createDesktopAppServicesModule, "createDesktopAppServices").mockResolvedValue(container);

    const { unmount } = render(
      <AppServicesProvider>
        <Consumer />
      </AppServicesProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("provider-consumer")).toBeTruthy();
    });

    unmount();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it("throws when useAppServices is used before provider is ready", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<ThrowingConsumer />)).toThrow("AppServicesProvider is not ready");

    consoleErrorSpy.mockRestore();
  });
});
