import type { ChannelService } from "../channelService";

import type { AIProviderGateway, CredentialVault } from "../../providers/index";
import type { ChannelRepository } from "../../repositories/index";
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

export class DefaultChannelService implements ChannelService {
  constructor(
    private readonly channelRepository: ChannelRepository,
    private readonly aiGateway: AIProviderGateway,
    private readonly credentialVault: CredentialVault,
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

  async hasChannelSecret(id: string): Promise<boolean> {
    const channel = await this.channelRepository.findById(id);

    if (!channel?.apiKeyRef) {
      return false;
    }

    const secret = await this.credentialVault.getSecret(channel.apiKeyRef);
    return Boolean(secret);
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
      apiKeyRef: patch.apiKeyRef !== undefined ? patch.apiKeyRef : current.apiKeyRef,
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

  async setChannelApiKey(id: string, apiKey: string): Promise<AIChannelEntity> {
    const channel = await this.channelRepository.findById(id);

    if (!channel) {
      throw new Error(`Channel not found: ${id}`);
    }

    const apiKeyRef = channel.apiKeyRef ?? `cred://channel/${id}`;
    await this.credentialVault.setSecret(apiKeyRef, apiKey.trim());

    if (channel.apiKeyRef === apiKeyRef) {
      return channel;
    }

    return this.channelRepository.update(id, {
      apiKeyRef,
      updatedAt: this.now(),
    });
  }

  async clearChannelApiKey(id: string): Promise<AIChannelEntity> {
    const channel = await this.channelRepository.findById(id);

    if (!channel) {
      throw new Error(`Channel not found: ${id}`);
    }

    if (channel.apiKeyRef) {
      await this.credentialVault.removeSecret(channel.apiKeyRef);
    }

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

    return this.aiGateway.testConnection({
      providerType: channel.providerType,
      baseUrl: channel.baseUrl,
      apiKey: channel.apiKeyRef ? await this.credentialVault.getSecret(channel.apiKeyRef) : null,
      model: channel.model,
      systemPrompt: channel.systemPrompt,
      temperature: channel.temperature,
      maxTokens: channel.maxTokens,
      timeoutMs: channel.timeoutMs,
      providerOptions: channel.providerOptions,
    });
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

function normalizeChannelInput(input: CreateChannelInput): Omit<AIChannelEntity, "id" | "apiKeyRef" | "createdAt" | "updatedAt"> {
  const providerType = input.providerType;
  const name = input.name.trim();
  const baseUrl = input.baseUrl.trim();
  const model = input.model.trim();
  const temperature = input.temperature ?? 0.3;
  const timeoutMs = input.timeoutMs ?? 60_000;
  const defaultLanguage = (input.defaultLanguage ?? "zh-CN").trim() || "zh-CN";
  const maxTokens = input.maxTokens ?? null;
  const providerOptions = normalizeProviderOptions(providerType, input.providerOptions);

  validateChannelInput({
    providerType,
    name,
    baseUrl,
    model,
    temperature,
    maxTokens,
    timeoutMs,
    providerOptions,
  });

  return {
    name,
    providerType,
    baseUrl,
    model,
    temperature,
    maxTokens,
    timeoutMs,
    systemPrompt: input.systemPrompt ?? "",
    defaultLanguage,
    enabled: input.enabled ?? true,
    allowFallback: input.allowFallback ?? true,
    providerOptions,
  };
}

function normalizeProviderOptions(
  providerType: AIProviderType,
  options: AIChannelProviderOptions | undefined,
): AIChannelProviderOptions {
  const endpointPath = normalizeOptionalText(options?.endpointPath);
  const apiVersion = normalizeOptionalText(options?.apiVersion);
  const deployment = normalizeOptionalText(options?.deployment);
  const customHeaders = Object.fromEntries(
    Object.entries(options?.customHeaders ?? {})
      .map(([key, value]) => [key.trim(), value.trim()] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0),
  );

  if (providerType === "anthropic") {
    return {
      apiVersion: apiVersion ?? "2023-06-01",
      customHeaders,
    };
  }

  if (providerType === "azure_openai") {
    return {
      apiVersion: apiVersion ?? "2024-10-21",
      deployment,
      customHeaders,
    };
  }

  if (providerType === "local_gateway") {
    return {
      endpointPath: endpointPath ?? "/chat/completions",
      customHeaders,
    };
  }

  if (providerType === "aggregator") {
    return {
      endpointPath: endpointPath ?? "/chat/completions",
      customHeaders,
    };
  }

  return {
    endpointPath,
    customHeaders,
  };
}

function validateChannelInput(input: {
  providerType: AIProviderType;
  name: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number | null;
  timeoutMs: number;
  providerOptions: AIChannelProviderOptions;
}): void {
  if (!input.name) {
    throw new Error("通道名称不能为空");
  }

  if (!input.baseUrl) {
    throw new Error("Base URL 不能为空");
  }

  try {
    new URL(input.baseUrl);
  } catch {
    throw new Error("Base URL 格式不正确");
  }

  if (!input.model) {
    throw new Error("模型名称不能为空");
  }

  if (Number.isNaN(input.temperature) || input.temperature < 0 || input.temperature > 2) {
    throw new Error("Temperature 需要在 0 到 2 之间");
  }

  if (
    input.maxTokens !== null &&
    (!Number.isInteger(input.maxTokens) || input.maxTokens <= 0)
  ) {
    throw new Error("Max Tokens 需要是正整数");
  }

  if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1000 || input.timeoutMs > 300000) {
    throw new Error("Timeout 需要在 1000 到 300000 毫秒之间");
  }

  if (
    input.providerOptions.endpointPath &&
    !input.providerOptions.endpointPath.startsWith("/")
  ) {
    throw new Error("Endpoint Path 需要以 / 开头");
  }

  if (input.providerType === "azure_openai") {
    if (!input.providerOptions.deployment) {
      throw new Error("Azure OpenAI 需要填写部署名称");
    }

    if (!input.providerOptions.apiVersion) {
      throw new Error("Azure OpenAI 需要填写 API Version");
    }
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}
