import type { SettingsRepository } from "../settingsRepository";

import type { MockRuntime } from "../../mock/index";

import { cloneValue } from "../../mock/index";

export class MockSettingsRepository implements SettingsRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async get<T = string>(key: string): Promise<T | null> {
    if (!(key in this.runtime.settings)) {
      return null;
    }

    return cloneValue(this.runtime.settings[key] as T);
  }

  async set<T = string>(key: string, value: T, _updatedAt: string): Promise<void> {
    this.runtime.settings[key] = cloneValue(value);
  }

  async getAll(): Promise<Record<string, unknown>> {
    return cloneValue(this.runtime.settings);
  }
}
