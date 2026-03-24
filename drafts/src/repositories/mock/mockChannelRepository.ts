import type { ChannelRepository } from "../channelRepository";

import type { MockRuntime } from "../../mock/index";
import type { AIAbilityKey, AbilityMappingEntity, AIChannelEntity } from "../../types/index";

import { cloneValue } from "../../mock/index";

export class MockChannelRepository implements ChannelRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async insert(channel: AIChannelEntity): Promise<void> {
    this.runtime.channels.push(cloneValue(channel));
  }

  async update(id: string, patch: Partial<AIChannelEntity>): Promise<AIChannelEntity> {
    const channel = this.requireChannel(id);

    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined) {
        (channel as Record<string, unknown>)[key] = value;
      }
    });

    return cloneValue(channel);
  }

  async delete(id: string): Promise<void> {
    this.runtime.channels = this.runtime.channels.filter((channel) => channel.id !== id);
    this.runtime.abilityMappings = this.runtime.abilityMappings.filter((mapping) => mapping.channelId !== id);
  }

  async findById(id: string): Promise<AIChannelEntity | null> {
    const channel = this.runtime.channels.find((item) => item.id === id);
    return channel ? cloneValue(channel) : null;
  }

  async list(): Promise<AIChannelEntity[]> {
    return cloneValue(this.runtime.channels);
  }

  async listEnabled(): Promise<AIChannelEntity[]> {
    return cloneValue(this.runtime.channels.filter((channel) => channel.enabled));
  }

  async setAbilityMapping(mapping: AbilityMappingEntity): Promise<void> {
    this.runtime.abilityMappings = this.runtime.abilityMappings.filter(
      (item) => item.abilityKey !== mapping.abilityKey,
    );
    this.runtime.abilityMappings.push(cloneValue(mapping));
  }

  async listAbilityMappings(): Promise<AbilityMappingEntity[]> {
    return cloneValue(this.runtime.abilityMappings);
  }

  async findChannelIdForAbility(abilityKey: AIAbilityKey): Promise<string | null> {
    return this.runtime.abilityMappings.find((item) => item.abilityKey === abilityKey)?.channelId ?? null;
  }

  private requireChannel(id: string): AIChannelEntity {
    const channel = this.runtime.channels.find((item) => item.id === id);

    if (!channel) {
      throw new Error(`Channel not found: ${id}`);
    }

    return channel;
  }
}
