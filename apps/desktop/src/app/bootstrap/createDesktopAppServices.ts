import {
  createAppServices,
  MemoryCredentialVault,
  RoutingAIProviderGateway,
  TauriNotificationDriver,
  type AppContainer,
  type AppDataMode,
} from "@timeaura-core";

export async function createDesktopAppServices(): Promise<AppContainer> {
  const mode = (import.meta.env.VITE_TIMEAURA_DATA_MODE ?? "mock") as AppDataMode;

  return createAppServices({
    mode,
    sqliteOptions: {
      databaseUrl: import.meta.env.VITE_TIMEAURA_DB_URL ?? "sqlite:timeaura.db",
      aiGateway: new RoutingAIProviderGateway(),
      credentialVault: new MemoryCredentialVault(),
      notificationDriver: new TauriNotificationDriver(),
    },
  });
}
