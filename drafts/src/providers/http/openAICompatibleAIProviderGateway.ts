import type { AIProviderGateway, AIProviderGenerateInput, AIProviderGenerateResult } from "../aiProvider";
import type { ChannelTestResult } from "../../types/index";

import { AIProviderHttpError, postJson, requireApiKey, toResult, withDefaultPath } from "./shared";

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class OpenAICompatibleAIProviderGateway implements AIProviderGateway {
  async generateText(input: AIProviderGenerateInput): Promise<AIProviderGenerateResult> {
    const apiKey = requireApiKey(input);
    const endpoint = withDefaultPath(input.baseUrl, "/chat/completions");
    const { data, latencyMs } = await postJson<OpenAICompatibleResponse>(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: {
        model: input.model,
        temperature: input.temperature,
        max_tokens: input.maxTokens ?? 1024,
        messages: [
          ...(input.systemPrompt
            ? [{ role: "system", content: input.systemPrompt }]
            : []),
          { role: "user", content: input.prompt },
        ],
      },
      timeoutMs: input.timeoutMs,
    });

    const content = extractOpenAICompatibleText(data);

    if (!content) {
      throw new AIProviderHttpError(
        data.error?.message ?? "OpenAI compatible provider returned empty content",
      );
    }

    return toResult(content, latencyMs);
  }

  async testConnection(input: Omit<AIProviderGenerateInput, "prompt">): Promise<ChannelTestResult> {
    try {
      const result = await this.generateText({
        ...input,
        prompt: "请回复：连接成功",
      });

      return {
        ok: true,
        message: "OpenAI Compatible 通道连接成功",
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "OpenAI Compatible 通道连接失败",
      };
    }
  }
}

function extractOpenAICompatibleText(response: OpenAICompatibleResponse): string {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();
  }

  return "";
}
