import type { ChannelRepository } from "../channelRepository";

import type { AIAbilityKey, AbilityMappingEntity, AIChannelEntity } from "../../types/index";

import { SqliteClient } from "./sqliteClient";
import {
  mapAbilityMappingRow,
  mapChannelRow,
  serializeBoolean,
  serializeJson,
  type SqliteAbilityMappingRow,
  type SqliteChannelRow,
} from "./sqliteMappers";

export class SqliteChannelRepository implements ChannelRepository {
  constructor(private readonly client: SqliteClient) {}

  async insert(channel: AIChannelEntity): Promise<void> {
    await this.client.execute(
      `
        INSERT INTO ai_channels (
          id, name, provider_type, base_url, model, temperature, max_tokens,
          timeout_ms, system_prompt, default_language, enabled, allow_fallback,
          api_key_ref, provider_options_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        channel.id,
        channel.name,
        channel.providerType,
        channel.baseUrl,
        channel.model,
        channel.temperature,
        channel.maxTokens,
        channel.timeoutMs,
        channel.systemPrompt,
        channel.defaultLanguage,
        serializeBoolean(channel.enabled),
        serializeBoolean(channel.allowFallback),
        channel.apiKeyRef,
        serializeJson(channel.providerOptions),
        channel.createdAt,
        channel.updatedAt,
      ],
    );
  }

  async update(id: string, patch: Partial<AIChannelEntity>): Promise<AIChannelEntity> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Channel not found: ${id}`);
    }

    const next: AIChannelEntity = {
      ...current,
      ...patch,
    };

    await this.client.execute(
      `
        UPDATE ai_channels
        SET
          name = ?,
          provider_type = ?,
          base_url = ?,
          model = ?,
          temperature = ?,
          max_tokens = ?,
          timeout_ms = ?,
          system_prompt = ?,
          default_language = ?,
          enabled = ?,
          allow_fallback = ?,
          api_key_ref = ?,
          provider_options_json = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        next.name,
        next.providerType,
        next.baseUrl,
        next.model,
        next.temperature,
        next.maxTokens,
        next.timeoutMs,
        next.systemPrompt,
        next.defaultLanguage,
        serializeBoolean(next.enabled),
        serializeBoolean(next.allowFallback),
        next.apiKeyRef,
        serializeJson(next.providerOptions),
        next.updatedAt,
        id,
      ],
    );

    return next;
  }

  async delete(id: string): Promise<void> {
    await this.client.execute("DELETE FROM ai_channels WHERE id = ?", [id]);
  }

  async findById(id: string): Promise<AIChannelEntity | null> {
    const rows = await this.client.select<SqliteChannelRow>("SELECT * FROM ai_channels WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? mapChannelRow(rows[0]) : null;
  }

  async list(): Promise<AIChannelEntity[]> {
    const rows = await this.client.select<SqliteChannelRow>(
      "SELECT * FROM ai_channels ORDER BY enabled DESC, updated_at DESC, name ASC",
    );
    return rows.map(mapChannelRow);
  }

  async listEnabled(): Promise<AIChannelEntity[]> {
    const rows = await this.client.select<SqliteChannelRow>(
      "SELECT * FROM ai_channels WHERE enabled = 1 ORDER BY updated_at DESC, name ASC",
    );
    return rows.map(mapChannelRow);
  }

  async setAbilityMapping(mapping: AbilityMappingEntity): Promise<void> {
    await this.client.execute(
      `
        INSERT INTO ai_ability_mappings (ability_key, channel_id, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(ability_key)
        DO UPDATE SET channel_id = excluded.channel_id, updated_at = excluded.updated_at
      `,
      [mapping.abilityKey, mapping.channelId, mapping.updatedAt],
    );
  }

  async clearAbilityMapping(abilityKey: AIAbilityKey): Promise<void> {
    await this.client.execute("DELETE FROM ai_ability_mappings WHERE ability_key = ?", [abilityKey]);
  }

  async listAbilityMappings(): Promise<AbilityMappingEntity[]> {
    const rows = await this.client.select<SqliteAbilityMappingRow>(
      "SELECT * FROM ai_ability_mappings ORDER BY ability_key ASC",
    );
    return rows.map(mapAbilityMappingRow);
  }

  async findChannelIdForAbility(abilityKey: AIAbilityKey): Promise<string | null> {
    const rows = await this.client.select<{ channel_id: string }>(
      "SELECT channel_id FROM ai_ability_mappings WHERE ability_key = ? LIMIT 1",
      [abilityKey],
    );
    return rows[0]?.channel_id ?? null;
  }
}
