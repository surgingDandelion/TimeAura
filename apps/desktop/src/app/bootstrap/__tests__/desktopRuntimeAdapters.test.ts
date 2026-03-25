import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  StrongholdCredentialVault,
  TauriNotificationDriver,
  createSqliteAppServices,
} from "@timeaura-core";

const strongholdLoadSpy = vi.hoisted(() => vi.fn());
const notificationState = vi.hoisted(() => ({
  permissionGranted: false,
  requestedPermission: "granted" as "default" | "denied" | "granted" | "prompt",
  sendNotification: vi.fn(async () => undefined),
  cancel: vi.fn(async () => undefined),
}));
const invokeSpy = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@tauri-apps/plugin-stronghold", () => ({
  Stronghold: {
    load: strongholdLoadSpy,
  },
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(async () => notificationState.permissionGranted),
  requestPermission: vi.fn(async () => notificationState.requestedPermission),
  sendNotification: notificationState.sendNotification,
  cancel: notificationState.cancel,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeSpy,
}));

describe("desktop runtime adapters", () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(window.navigator, "platform");

  beforeEach(() => {
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    });
    notificationState.permissionGranted = false;
    notificationState.requestedPermission = "granted";
    notificationState.sendNotification.mockClear();
    notificationState.cancel.mockClear();
    invokeSpy.mockClear();
    strongholdLoadSpy.mockReset();
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(window.navigator, "platform", originalPlatform);
    }

    vi.restoreAllMocks();
  });

  it("retries Stronghold initialization after an initial failure", async () => {
    const store = {
      get: vi.fn(async () => null),
      insert: vi.fn(async () => undefined),
      remove: vi.fn(async () => null),
    };
    const unloadSpy = vi.fn(async () => undefined);
    const saveSpy = vi.fn(async () => undefined);

    strongholdLoadSpy
      .mockRejectedValueOnce(new Error("snapshot broken"))
      .mockResolvedValue({
        loadClient: vi.fn(async () => {
          throw new Error("missing client");
        }),
        createClient: vi.fn(async () => ({
          getStore: () => store,
        })),
        save: saveSpy,
        unload: unloadSpy,
      });

    const vault = new StrongholdCredentialVault({
      password: "desktop-secret",
      snapshotPath: "desktop.stronghold",
      clientName: "timeaura-desktop",
    });

    await expect(vault.setSecret("cred://main", "first")).rejects.toThrow("写入 Stronghold 凭证失败：snapshot broken");

    await expect(vault.setSecret("cred://main", "second")).resolves.toBeUndefined();
    await expect(vault.getSecret("cred://main")).resolves.toBeNull();
    await expect(vault.removeSecret("cred://main")).resolves.toBeUndefined();
    await expect(vault.dispose()).resolves.toBeUndefined();

    expect(strongholdLoadSpy).toHaveBeenCalledTimes(2);
    expect(store.insert).toHaveBeenCalledWith("cred://main", expect.any(Array));
    expect(saveSpy).toHaveBeenCalledTimes(2);
    expect(unloadSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back from actionable notifications and surfaces send/cancel failures", async () => {
    const debugEvents: Array<{ title: string; detail: string; level: string }> = [];
    window.addEventListener("timeaura:notification-debug", ((event: Event) => {
      debugEvents.push((event as CustomEvent<{ title: string; detail: string; level: string }>).detail);
    }) as EventListener);

    invokeSpy.mockRejectedValueOnce(new Error("native unavailable"));
    const driver = new TauriNotificationDriver();

    await driver.notify({
      id: "notification-1",
      title: "提醒",
      body: "有任务即将到期",
      actions: [{ key: "open_detail", label: "打开详情" }],
      extra: {
        recordId: "record-1",
      },
    });

    expect(invokeSpy).toHaveBeenCalledTimes(1);
    expect(notificationState.sendNotification).toHaveBeenCalledTimes(1);
    expect(debugEvents.some((item) => item.title === "原生动作通知降级")).toBe(true);

    notificationState.sendNotification.mockRejectedValueOnce(new Error("permission api crashed"));

    await expect(driver.notify({
      id: "notification-2",
      title: "失败提醒",
      body: "发送失败",
    })).rejects.toThrow("发送系统通知失败：permission api crashed");

    notificationState.cancel.mockRejectedValueOnce(new Error("cancel failed"));

    await expect(driver.cancel("notification-2")).rejects.toThrow("取消系统通知失败：cancel failed");
  });

  it("releases opened sqlite resources when service bootstrap fails after connection", async () => {
    const closeSpy = vi.fn(async () => undefined);
    const disposeSpy = vi.fn(async () => undefined);

    await expect(
      createSqliteAppServices({
        loadDatabase: async () => ({
          execute: async (query: string) => {
            if (query.includes("broken_table")) {
              throw new Error("migration failed");
            }

            return {
              rowsAffected: 0,
              lastInsertId: null,
            };
          },
          select: async () => [],
          close: closeSpy,
        }),
        credentialVault: {
          getSecret: async () => null,
          setSecret: async () => undefined,
          removeSecret: async () => undefined,
          dispose: disposeSpy,
        },
        migrations: [
          {
            version: "1",
            description: "broken migration",
            sql: "CREATE TABLE broken_table (id TEXT PRIMARY KEY);",
          },
        ],
      }),
    ).rejects.toThrow("migration failed");

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(disposeSpy).toHaveBeenCalledTimes(0);
  });
});
