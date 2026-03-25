import { afterEach, describe, expect, it, vi } from "vitest";

const createAppServicesSpy = vi.hoisted(() => vi.fn());
const routingGatewaySpy = vi.hoisted(() => vi.fn(function RoutingAIProviderGateway() {
  return { kind: "gateway" };
}));
const strongholdVaultSpy = vi.hoisted(() => vi.fn(function StrongholdCredentialVault(options: unknown) {
  return { kind: "vault", options };
}));
const notificationDriverSpy = vi.hoisted(() => vi.fn(function TauriNotificationDriver() {
  return { kind: "notification-driver" };
}));

vi.mock("@timeaura-core", () => ({
  createAppServices: createAppServicesSpy,
  RoutingAIProviderGateway: routingGatewaySpy,
  StrongholdCredentialVault: strongholdVaultSpy,
  TauriNotificationDriver: notificationDriverSpy,
}));

import { createDesktopAppServices } from "../createDesktopAppServices";

describe("createDesktopAppServices", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uses mock mode outside Tauri by default", async () => {
    createAppServicesSpy.mockResolvedValue({ services: {} });

    await createDesktopAppServices();

    expect(createAppServicesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "mock",
      }),
    );
  });

  it("uses sqlite mode inside Tauri and wires desktop runtime adapters", async () => {
    vi.stubGlobal("__TAURI_INTERNALS__", {});
    vi.stubEnv("VITE_TIMEAURA_DB_URL", "sqlite:desktop-test.db");
    vi.stubEnv("VITE_TIMEAURA_STRONGHOLD_PATH", "desktop-test.stronghold");
    vi.stubEnv("VITE_TIMEAURA_STRONGHOLD_PASSWORD", "desktop-secret");
    createAppServicesSpy.mockResolvedValue({ services: {} });

    await createDesktopAppServices();

    expect(createAppServicesSpy).toHaveBeenCalledWith({
      mode: "sqlite",
      sqliteOptions: {
        databaseUrl: "sqlite:desktop-test.db",
        aiGateway: expect.objectContaining({ kind: "gateway" }),
        credentialVault: expect.objectContaining({ kind: "vault" }),
        notificationDriver: expect.objectContaining({ kind: "notification-driver" }),
      },
    });
    expect(strongholdVaultSpy).toHaveBeenCalledWith({
      password: "desktop-secret",
      snapshotPath: "desktop-test.stronghold",
      clientName: "timeaura-desktop",
    });
  });

  it("wraps bootstrap failures with the selected mode", async () => {
    vi.stubEnv("VITE_TIMEAURA_DATA_MODE", "sqlite");
    createAppServicesSpy.mockRejectedValue(new Error("database locked"));

    await expect(createDesktopAppServices()).rejects.toThrow("初始化桌面服务失败（sqlite）：database locked");
  });
});
