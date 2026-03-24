import type { AIChannelProviderOptions, AIProviderType, ChannelTestResult } from "../types/index";

export interface AIProviderGenerateInput {
  providerType: AIProviderType;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  systemPrompt: string;
  prompt: string;
  temperature: number;
  maxTokens: number | null;
  timeoutMs: number;
  providerOptions: AIChannelProviderOptions;
}

export interface AIProviderGenerateResult {
  content: string;
  latencyMs?: number;
}

export interface AIProviderGateway {
  generateText(input: AIProviderGenerateInput): Promise<AIProviderGenerateResult>;
  testConnection(input: Omit<AIProviderGenerateInput, "prompt">): Promise<ChannelTestResult>;
}

export class UnavailableAIProviderGateway implements AIProviderGateway {
  async generateText(_input: AIProviderGenerateInput): Promise<AIProviderGenerateResult> {
    throw new Error("AI provider gateway is not configured");
  }

  async testConnection(_input: Omit<AIProviderGenerateInput, "prompt">): Promise<ChannelTestResult> {
    return {
      ok: false,
      message: "AI provider gateway is not configured",
    };
  }
}
