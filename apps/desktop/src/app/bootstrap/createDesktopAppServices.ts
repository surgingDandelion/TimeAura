import {
  createAppServices,
  RoutingAIProviderGateway,
  StrongholdCredentialVault,
  TauriNotificationDriver,
  type AppContainer,
  type AppDataMode,
} from "@timeaura-core";

export async function createDesktopAppServices(): Promise<AppContainer> {
  const mode = (import.meta.env.VITE_TIMEAURA_DATA_MODE ?? "mock") as AppDataMode;
  const strongholdPassword =
    import.meta.env.VITE_TIMEAURA_STRONGHOLD_PASSWORD ?? "timeaura-dev-password";

  return createAppServices({
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
}
