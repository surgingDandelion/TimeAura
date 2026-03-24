import type { AIProviderGateway, AIProviderGenerateInput, AIProviderGenerateResult } from "../aiProvider";
import type { ChannelTestResult } from "../../types/index";

import { AIProviderHttpError, postJson, requireApiKey, toResult, withDefaultPath } from "./shared";

interface AnthropicResponse {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    message?: string;
  };
}

export class AnthropicAIProviderGateway implements AIProviderGateway {
  constructor(private readonly anthropicVersion = "2023-06-01") {}

  async generateText(input: AIProviderGenerateInput): Promise<AIProviderGenerateResult> {
    const apiKey = requireApiKey(input);
    const endpoint = withDefaultPath(input.baseUrl, "/v1/messages");
    const anthropicVersion = input.providerOptions.apiVersion ?? this.anthropicVersion;
    const { data, latencyMs } = await postJson<AnthropicResponse>(endpoint, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
        "Content-Type": "application/json",
        ...(input.providerOptions.customHeaders ?? {}),
      },
      body: {
        model: input.model,
        system: input.systemPrompt || undefined,
        temperature: input.temperature,
        max_tokens: input.maxTokens ?? 1024,
        messages: [
          {
            role: "user",
            content: input.prompt,
          },
        ],
      },
      timeoutMs: input.timeoutMs,
    });

    const content = (data.content ?? [])
      .filter((item) => item.type === "text" && item.text)
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();

    if (!content) {
      throw new AIProviderHttpError(
        data.error?.message ?? "Anthropic provider returned empty content",
      );
    }

    return toResult(content, latencyMs);
  }

  async testConnection(input: Omit<AIProviderGenerateInput, "prompt">): Promise<ChannelTestResult> {
    try {
      const result = await this.generateText({
        ...input,
        prompt: "请只回复：连接成功",
      });

      return {
        ok: true,
        message: "Anthropic 通道连接成功",
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Anthropic 通道连接失败",
      };
    }
  }
}
