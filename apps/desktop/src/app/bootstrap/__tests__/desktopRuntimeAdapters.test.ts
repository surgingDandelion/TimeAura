import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SqliteClient,
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

  it("allows Stronghold to reinitialize after unload failure", async () => {
    const firstStore = {
      get: vi.fn(async () => null),
      insert: vi.fn(async () => undefined),
      remove: vi.fn(async () => null),
    };
    const secondStore = {
      get: vi.fn(async () => null),
      insert: vi.fn(async () => undefined),
      remove: vi.fn(async () => null),
    };

    strongholdLoadSpy
      .mockResolvedValueOnce({
        loadClient: vi.fn(async () => ({
          getStore: () => firstStore,
        })),
        createClient: vi.fn(async () => ({
          getStore: () => firstStore,
        })),
        save: vi.fn(async () => undefined),
        unload: vi.fn(async () => {
          throw new Error("unload failed");
        }),
      })
      .mockResolvedValueOnce({
        loadClient: vi.fn(async () => ({
          getStore: () => secondStore,
        })),
        createClient: vi.fn(async () => ({
          getStore: () => secondStore,
        })),
        save: vi.fn(async () => undefined),
        unload: vi.fn(async () => undefined),
      });

    const vault = new StrongholdCredentialVault({
      password: "desktop-secret",
      snapshotPath: "desktop.stronghold",
      clientName: "timeaura-desktop",
    });

    await expect(vault.setSecret("cred://main", "first")).resolves.toBeUndefined();
    await expect(vault.dispose()).rejects.toThrow("释放 Stronghold 失败：unload failed");
    await expect(vault.setSecret("cred://main", "second")).resolves.toBeUndefined();

    expect(strongholdLoadSpy).toHaveBeenCalledTimes(2);
    expect(firstStore.insert).toHaveBeenCalledTimes(1);
    expect(secondStore.insert).toHaveBeenCalledTimes(1);
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

  it("reports sqlite transaction rollback failures with the original error", async () => {
    const executedStatements: string[] = [];
    const client = new SqliteClient({
      execute: async (query: string) => {
        executedStatements.push(query);

        if (query === "ROLLBACK") {
          throw new Error("rollback unavailable");
        }

        return {
          rowsAffected: 0,
          lastInsertId: null,
        };
      },
      select: async () => [],
      close: async () => undefined,
    });

    await expect(
      client.transaction(async () => {
        throw new Error("write failed");
      }),
    ).rejects.toThrow("SQLite 事务失败：write failed；回滚失败：rollback unavailable");

    expect(executedStatements).toEqual(["BEGIN IMMEDIATE", "ROLLBACK"]);
  });

  it("keeps the original sqlite error when rollback reports no active transaction", async () => {
    const executedStatements: string[] = [];
    const client = new SqliteClient({
      execute: async (query: string) => {
        executedStatements.push(query);

        if (query === "ROLLBACK") {
          throw new Error("cannot rollback - no transaction is active");
        }

        return {
          rowsAffected: 0,
          lastInsertId: null,
        };
      },
      select: async () => [],
      close: async () => undefined,
    });

    await expect(
      client.transaction(async () => {
        throw new Error("UNIQUE constraint failed: records.id");
      }),
    ).rejects.toThrow("UNIQUE constraint failed: records.id");

    expect(executedStatements).toEqual(["BEGIN IMMEDIATE", "ROLLBACK"]);
  });

  it("serializes concurrent sqlite transactions on the same client", async () => {
    const executedStatements: string[] = [];
    let releaseFirstTransaction!: () => void;
    const firstTransactionGate = new Promise<void>((resolve) => {
      releaseFirstTransaction = resolve;
    });
    const client = new SqliteClient({
      execute: async (query: string) => {
        executedStatements.push(query);
        return {
          rowsAffected: 0,
          lastInsertId: null,
        };
      },
      select: async () => [],
      close: async () => undefined,
    });

    const firstTransaction = client.transaction(async () => {
      executedStatements.push("first-run");
      await firstTransactionGate;
      executedStatements.push("first-finish");
    });
    const secondTransaction = client.transaction(async () => {
      executedStatements.push("second-run");
    });

    await Promise.resolve();

    expect(executedStatements[0]).toBe("BEGIN IMMEDIATE");
    expect(executedStatements.filter((statement) => statement === "BEGIN IMMEDIATE")).toHaveLength(1);
    expect(executedStatements).not.toContain("second-run");

    releaseFirstTransaction();
    await Promise.all([firstTransaction, secondTransaction]);

    expect(executedStatements).toEqual([
      "BEGIN IMMEDIATE",
      "first-run",
      "first-finish",
      "COMMIT",
      "BEGIN IMMEDIATE",
      "second-run",
      "COMMIT",
    ]);
  });

  it("serializes concurrent standalone sqlite operations outside transactions", async () => {
    const executedStatements: string[] = [];
    let releaseFirstSelect!: () => void;
    const firstSelectGate = new Promise<void>((resolve) => {
      releaseFirstSelect = resolve;
    });
    const client = new SqliteClient({
      execute: async (query: string) => {
        executedStatements.push(query);
        return {
          rowsAffected: 1,
          lastInsertId: null,
        };
      },
      select: async (query: string) => {
        executedStatements.push(query);

        if (query === "SELECT * FROM records") {
          await firstSelectGate;
        }

        return [];
      },
      close: async () => undefined,
    });

    const firstSelect = client.select("SELECT * FROM records");
    const secondWrite = client.execute("INSERT INTO records VALUES (1)");

    await Promise.resolve();

    expect(executedStatements).toEqual(["SELECT * FROM records"]);

    releaseFirstSelect();
    await Promise.all([firstSelect, secondWrite]);

    expect(executedStatements).toEqual([
      "SELECT * FROM records",
      "INSERT INTO records VALUES (1)",
    ]);
  });

  it("uses savepoints for nested sqlite transactions", async () => {
    const executedStatements: string[] = [];
    const client = new SqliteClient({
      execute: async (query: string) => {
        executedStatements.push(query);
        return {
          rowsAffected: 0,
          lastInsertId: null,
        };
      },
      select: async () => [],
      close: async () => undefined,
    });

    await client.transaction(async (outer) => {
      await outer.transaction(async () => undefined);
    });

    expect(executedStatements).toEqual([
      "BEGIN IMMEDIATE",
      "SAVEPOINT timeaura_tx_2",
      "RELEASE SAVEPOINT timeaura_tx_2",
      "COMMIT",
    ]);
  });

  it("combines sqlite migration and close errors during connect", async () => {
    const closeSpy = vi.fn(async () => {
      throw new Error("close failed");
    });

    await expect(
      SqliteClient.connect({
        databaseUrl: "sqlite:test.db",
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
        migrations: [
          {
            version: "1",
            description: "broken migration",
            sql: "CREATE TABLE broken_table (id TEXT PRIMARY KEY);",
          },
        ],
      }),
    ).rejects.toThrow("SQLite 初始化失败：migration failed；关闭连接失败：close failed");

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it("configures sqlite pragmas before running migrations", async () => {
    const executedStatements: string[] = [];

    await SqliteClient.connect({
      databaseUrl: "sqlite:test.db",
      loadDatabase: async () => ({
        execute: async (query: string) => {
          executedStatements.push(query.trim());
          return {
            rowsAffected: 0,
            lastInsertId: null,
          };
        },
        select: async () => [],
        close: async () => undefined,
      }),
      migrations: [],
    });

    expect(executedStatements.slice(0, 4)).toEqual([
      "PRAGMA foreign_keys = ON",
      "PRAGMA busy_timeout = 5000",
      "PRAGMA journal_mode = WAL",
      "PRAGMA synchronous = NORMAL",
    ]);
  });

  it("still closes sqlite when vault disposal fails during app container cleanup", async () => {
    const closeSpy = vi.fn(async () => undefined);

    const container = await createSqliteAppServices({
      loadDatabase: async () => ({
        execute: async () => ({
          rowsAffected: 0,
          lastInsertId: null,
        }),
        select: async () => [],
        close: closeSpy,
      }),
      credentialVault: {
        getSecret: async () => null,
        setSecret: async () => undefined,
        removeSecret: async () => undefined,
        dispose: async () => {
          throw new Error("vault busy");
        },
      },
      migrations: [],
    });

    expect(container.dispose).toBeDefined();
    await expect(container.dispose?.()).rejects.toThrow("凭证库释放失败：vault busy");
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
