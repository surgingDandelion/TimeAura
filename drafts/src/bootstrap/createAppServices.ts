import type { AppContainer } from "./appContainer";
import type { CreateSqliteAppServicesOptions } from "./createSqliteAppServices";

import { createSqliteAppServices } from "./createSqliteAppServices";
import { createMockAppServices } from "./createMockAppServices";

export type AppDataMode = "mock" | "sqlite";

export interface CreateAppServicesOptions {
  mode?: AppDataMode;
  sqliteFactory?: () => Promise<AppContainer> | AppContainer;
  sqliteOptions?: CreateSqliteAppServicesOptions;
}

export async function createAppServices(
  options: CreateAppServicesOptions = {},
): Promise<AppContainer> {
  const mode = options.mode ?? "mock";

  if (mode === "mock") {
    return createMockAppServices();
  }

  if (options.sqliteFactory) {
    return Promise.resolve(options.sqliteFactory());
  }

  return createSqliteAppServices(options.sqliteOptions);
}
