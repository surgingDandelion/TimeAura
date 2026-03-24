import type { SettingsRepository } from "../settingsRepository";

import { SqliteClient } from "./sqliteClient";
import { deserializeSettingValue, serializeSettingValue } from "./sqliteMappers";

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly client: SqliteClient) {}

  async get<T = string>(key: string): Promise<T | null> {
    const rows = await this.client.select<{ value: string }>(
      "SELECT value FROM settings WHERE key = ? LIMIT 1",
      [key],
    );

    if (!rows[0]) {
      return null;
    }

    return deserializeSettingValue(rows[0].value) as T;
  }

  async set<T = string>(key: string, value: T, updatedAt: string): Promise<void> {
    await this.client.execute(
      `
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      [key, serializeSettingValue(value), updatedAt],
    );
  }

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await this.client.select<{ key: string; value: string }>(
      "SELECT key, value FROM settings ORDER BY key ASC",
    );

    return rows.reduce<Record<string, unknown>>((result, row) => {
      result[row.key] = deserializeSettingValue(row.value);
      return result;
    }, {});
  }
}
