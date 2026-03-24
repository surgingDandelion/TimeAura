export const AI_PROVIDER_TYPES = [
  "openai_compatible",
  "anthropic",
  "azure_openai",
  "local_gateway",
  "aggregator",
] as const;

export type AIProviderType = (typeof AI_PROVIDER_TYPES)[number];

export const AI_ABILITY_KEYS = [
  "weekly_report",
  "monthly_report",
  "summary",
  "polish",
] as const;

export type AIAbilityKey = (typeof AI_ABILITY_KEYS)[number];

export interface AIChannelProviderOptions {
  endpointPath?: string | null;
  apiVersion?: string | null;
  deployment?: string | null;
  customHeaders?: Record<string, string>;
}

export interface AIChannelEntity {
  id: string;
  name: string;
  providerType: AIProviderType;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number | null;
  timeoutMs: number;
  systemPrompt: string;
  defaultLanguage: string;
  enabled: boolean;
  allowFallback: boolean;
  apiKeyRef: string | null;
  providerOptions: AIChannelProviderOptions;
  createdAt: string;
  updatedAt: string;
}

export interface AbilityMappingEntity {
  abilityKey: AIAbilityKey;
  channelId: string;
  updatedAt: string;
}

export interface ChannelTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
}

export interface CreateChannelInput {
  name: string;
  providerType: AIProviderType;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number | null;
  timeoutMs?: number;
  systemPrompt?: string;
  defaultLanguage?: string;
  enabled?: boolean;
  allowFallback?: boolean;
  providerOptions?: AIChannelProviderOptions;
}

export interface UpdateChannelPatch extends Partial<CreateChannelInput> {
  apiKeyRef?: string | null;
}
