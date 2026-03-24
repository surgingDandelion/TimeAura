import type { MockAppContainer } from "./createMockAppServices";

import { createMockAppServices } from "./createMockAppServices";

export type AppDataMode = "mock" | "sqlite";

export interface CreateAppServicesOptions {
  mode?: AppDataMode;
  sqliteFactory?: () => Promise<MockAppContainer> | MockAppContainer;
}

export async function createAppServices(
  options: CreateAppServicesOptions = {},
): Promise<MockAppContainer> {
  const mode = options.mode ?? "mock";

  if (mode === "mock") {
    return createMockAppServices();
  }

  if (options.sqliteFactory) {
    return Promise.resolve(options.sqliteFactory());
  }

  throw new Error(
    "SQLite app services are not wired yet. Provide sqliteFactory after the real Tauri scaffold is initialized.",
  );
}
