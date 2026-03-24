import type { ChannelService } from "../channelService";

import type { ChannelRepository } from "../../repositories/index";
import type { AbilityMappingEntity, AIAbilityKey, AIChannelEntity, ChannelTestResult, CreateChannelInput, UpdateChannelPatch } from "../../types/index";

import { createMockId } from "../../mock/index";

export class MockChannelService implements ChannelService {
  constructor(private readonly channelRepository: ChannelRepository, private readonly now: () => string) {}

  async listChannels(): Promise<AIChannelEntity[]> {
    return this.channelRepository.list();
  }

  async listEnabledChannels(): Promise<AIChannelEntity[]> {
    return this.channelRepository.listEnabled();
  }

  async getChannelById(id: string): Promise<AIChannelEntity | null> {
    return this.channelRepository.findById(id);
  }

  async createChannel(input: CreateChannelInput): Promise<AIChannelEntity> {
    const timestamp = this.now();
    const channel: AIChannelEntity = {
      id: createMockId("channel"),
      name: input.name.trim(),
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      model: input.model,
      temperature: input.temperature ?? 0.3,
      maxTokens: input.maxTokens ?? null,
      timeoutMs: input.timeoutMs ?? 60_000,
      systemPrompt: input.systemPrompt ?? "",
      defaultLanguage: input.defaultLanguage ?? "zh-CN",
      enabled: input.enabled ?? true,
      allowFallback: input.allowFallback ?? true,
      apiKeyRef: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.channelRepository.insert(channel);
    return channel;
  }

  async updateChannel(id: string, patch: UpdateChannelPatch): Promise<AIChannelEntity> {
    return this.channelRepository.update(id, {
      ...patch,
      updatedAt: this.now(),
    });
  }

  async deleteChannel(id: string): Promise<void> {
    await this.channelRepository.delete(id);
  }

  async toggleChannel(id: string, enabled: boolean): Promise<AIChannelEntity> {
    return this.channelRepository.update(id, {
      enabled,
      updatedAt: this.now(),
    });
  }

  async testChannel(id: string): Promise<ChannelTestResult> {
    const channel = await this.channelRepository.findById(id);

    if (!channel) {
      return {
        ok: false,
        message: "通道不存在",
      };
    }

    return {
      ok: true,
      message: `已成功连接 ${channel.name}`,
      latencyMs: 320,
    };
  }

  async listAbilityMappings(): Promise<AbilityMappingEntity[]> {
    return this.channelRepository.listAbilityMappings();
  }

  async setAbilityChannel(abilityKey: AIAbilityKey, channelId: string): Promise<void> {
    await this.channelRepository.setAbilityMapping({
      abilityKey,
      channelId,
      updatedAt: this.now(),
    });
  }
}
