import type { ChannelService } from "../channelService";

import type { ChannelRepository, SettingsRepository } from "../../repositories/index";
import type {
  AbilityMappingEntity,
  AIAbilityKey,
  AIChannelEntity,
  AIChannelProviderOptions,
  AIProviderType,
  ChannelTestResult,
  CreateChannelInput,
  UpdateChannelPatch,
} from "../../types/index";

import { createMockId } from "../../mock/index";

export class MockChannelService implements ChannelService {
  constructor(
    private readonly channelRepository: ChannelRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly now: () => string,
  ) {}

  async listChannels(): Promise<AIChannelEntity[]> {
    return this.channelRepository.list();
  }

  async listEnabledChannels(): Promise<AIChannelEntity[]> {
    return this.channelRepository.listEnabled();
  }

  async getChannelById(id: string): Promise<AIChannelEntity | null> {
    return this.channelRepository.findById(id);
  }

  async getDefaultChannelId(): Promise<string | null> {
    return this.settingsRepository.get<string>("defaultChannelId");
  }

  async hasChannelSecret(id: string): Promise<boolean> {
    const channel = await this.channelRepository.findById(id);
    return Boolean(channel?.apiKeyRef);
  }

  async createChannel(input: CreateChannelInput): Promise<AIChannelEntity> {
    const timestamp = this.now();
    const normalized = normalizeChannelInput(input);
    const channel: AIChannelEntity = {
      id: createMockId("channel"),
      ...normalized,
      apiKeyRef: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.channelRepository.insert(channel);

    const currentDefault = await this.getDefaultChannelId();
    if (!currentDefault && channel.enabled) {
      await this.settingsRepository.set("defaultChannelId", channel.id, this.now());
    }

    return channel;
  }

  async updateChannel(id: string, patch: UpdateChannelPatch): Promise<AIChannelEntity> {
    const current = await this.channelRepository.findById(id);

    if (!current) {
      throw new Error(`Channel not found: ${id}`);
    }

    const normalized = normalizeChannelInput({
      name: patch.name ?? current.name,
      providerType: patch.providerType ?? current.providerType,
      baseUrl: patch.baseUrl ?? current.baseUrl,
      model: patch.model ?? current.model,
      temperature: patch.temperature ?? current.temperature,
      maxTokens:
        patch.maxTokens === undefined ? current.maxTokens : patch.maxTokens,
      timeoutMs: patch.timeoutMs ?? current.timeoutMs,
      systemPrompt: patch.systemPrompt ?? current.systemPrompt,
      defaultLanguage: patch.defaultLanguage ?? current.defaultLanguage,
      enabled: patch.enabled ?? current.enabled,
      allowFallback: patch.allowFallback ?? current.allowFallback,
      providerOptions: patch.providerOptions ?? current.providerOptions,
    });

    return this.channelRepository.update(id, {
      ...normalized,
      updatedAt: this.now(),
    });
  }

  async deleteChannel(id: string): Promise<void> {
    const currentDefault = await this.getDefaultChannelId();
    await this.channelRepository.delete(id);

    if (currentDefault === id) {
      const fallbackChannel = (await this.channelRepository.listEnabled())[0] ?? null;
      await this.settingsRepository.set("defaultChannelId", fallbackChannel?.id ?? null, this.now());
    }
  }

  async duplicateChannel(id: string): Promise<AIChannelEntity> {
    const source = await this.channelRepository.findById(id);

    if (!source) {
      throw new Error(`Channel not found: ${id}`);
    }

    const timestamp = this.now();
    const channel: AIChannelEntity = {
      ...source,
      id: createMockId("channel"),
      name: createDuplicateChannelName(source.name),
      apiKeyRef: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.channelRepository.insert(channel);
    return channel;
  }

  async setDefaultChannel(id: string | null): Promise<void> {
    if (id) {
      const channel = await this.channelRepository.findById(id);

      if (!channel) {
        throw new Error(`Channel not found: ${id}`);
      }

      if (!channel.enabled) {
        throw new Error("默认通道必须处于启用状态");
      }
    }

    await this.settingsRepository.set("defaultChannelId", id, this.now());
  }

  async toggleChannel(id: string, enabled: boolean): Promise<AIChannelEntity> {
    const updated = await this.channelRepository.update(id, {
      enabled,
      updatedAt: this.now(),
    });

    const currentDefault = await this.getDefaultChannelId();

    if (!enabled && currentDefault === id) {
      const fallbackChannel = (await this.channelRepository.listEnabled()).find((channel) => channel.id !== id) ?? null;
      await this.settingsRepository.set("defaultChannelId", fallbackChannel?.id ?? null, this.now());
    }

    if (enabled && !currentDefault) {
      await this.settingsRepository.set("defaultChannelId", id, this.now());
    }

    return updated;
  }

  async setChannelApiKey(id: string, _apiKey: string): Promise<AIChannelEntity> {
    const channel = await this.channelRepository.findById(id);

    if (!channel) {
      throw new Error(`Channel not found: ${id}`);
    }

    const apiKeyRef = channel.apiKeyRef ?? `cred://channel/${id}`;
    return this.channelRepository.update(id, {
      apiKeyRef,
      updatedAt: this.now(),
    });
  }

  async clearChannelApiKey(id: string): Promise<AIChannelEntity> {
    return this.channelRepository.update(id, {
      apiKeyRef: null,
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

  async clearAbilityChannel(abilityKey: AIAbilityKey): Promise<void> {
    await this.channelRepository.clearAbilityMapping(abilityKey);
  }
}

function createDuplicateChannelName(name: string): string {
  const trimmed = name.trim();
  return trimmed.endsWith("副本") ? `${trimmed} 2` : `${trimmed} 副本`;
}

function normalizeChannelInput(input: CreateChannelInput): Omit<AIChannelEntity, "id" | "apiKeyRef" | "createdAt" | "updatedAt"> {
  return {
    name: input.name.trim(),
    providerType: input.providerType,
    baseUrl: input.baseUrl.trim(),
    model: input.model.trim(),
    temperature: input.temperature ?? 0.3,
    maxTokens: input.maxTokens ?? null,
    timeoutMs: input.timeoutMs ?? 60_000,
    systemPrompt: input.systemPrompt ?? "",
    defaultLanguage: input.defaultLanguage ?? "zh-CN",
    enabled: input.enabled ?? true,
    allowFallback: input.allowFallback ?? true,
    providerOptions: normalizeProviderOptions(input.providerType, input.providerOptions),
  };
}

function normalizeProviderOptions(
  providerType: AIProviderType,
  options: AIChannelProviderOptions | undefined,
): AIChannelProviderOptions {
  const customHeaders = Object.fromEntries(
    Object.entries(options?.customHeaders ?? {})
      .map(([key, value]) => [key.trim(), value.trim()] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0),
  );

  if (providerType === "anthropic") {
    return {
      apiVersion: normalizeOptionalText(options?.apiVersion) ?? "2023-06-01",
      customHeaders,
    };
  }

  if (providerType === "azure_openai") {
    return {
      apiVersion: normalizeOptionalText(options?.apiVersion) ?? "2024-10-21",
      deployment: normalizeOptionalText(options?.deployment),
      customHeaders,
    };
  }

  if (providerType === "local_gateway" || providerType === "aggregator") {
    return {
      endpointPath: normalizeOptionalText(options?.endpointPath) ?? "/chat/completions",
      customHeaders,
    };
  }

  return {
    endpointPath: normalizeOptionalText(options?.endpointPath),
    customHeaders,
  };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}
