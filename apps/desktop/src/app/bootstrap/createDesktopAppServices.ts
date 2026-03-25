import {
  createAppServices,
  RoutingAIProviderGateway,
  StrongholdCredentialVault,
  TauriNotificationDriver,
  type AppContainer,
  type AppDataMode,
} from "@timeaura-core";

export async function createDesktopAppServices(): Promise<AppContainer> {
  const mode = (import.meta.env.VITE_TIMEAURA_DATA_MODE ??
    (isTauriRuntime() ? "sqlite" : "mock")) as AppDataMode;
  const strongholdPassword =
    import.meta.env.VITE_TIMEAURA_STRONGHOLD_PASSWORD ?? "timeaura-dev-password";

  try {
    return await createAppServices({
      mode,
      sqliteOptions: {
        databaseUrl: import.meta.env.VITE_TIMEAURA_DB_URL ?? "sqlite:timeaura.db",
        aiGateway: new RoutingAIProviderGateway(),
        credentialVault: new StrongholdCredentialVault({
          password: strongholdPassword,
          snapshotPath: import.meta.env.VITE_TIMEAURA_STRONGHOLD_PATH ?? "timeaura.stronghold",
          clientName: "timeaura-desktop",
        }),
        notificationDriver: new TauriNotificationDriver(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`初始化桌面服务失败（${mode}）：${error.message}`);
    }

    throw new Error(`初始化桌面服务失败（${mode}）`);
  }
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
