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
    const request = buildRequest(input);
    const { data, latencyMs } = await postJson<OpenAICompatibleResponse>(request.endpoint, {
      headers: request.headers,
      body: request.body,
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
        message: `${getProviderLabel(input.providerType)}通道连接成功`,
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : `${getProviderLabel(input.providerType)}通道连接失败`,
      };
    }
  }
}

function buildRequest(input: AIProviderGenerateInput): {
  headers: Record<string, string>;
  body: Record<string, unknown>;
  endpoint: string;
} {
  const messages = [
    ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
    { role: "user", content: input.prompt },
  ];
  const endpointPath = input.providerOptions.endpointPath ?? "/chat/completions";
  const customHeaders = input.providerOptions.customHeaders ?? {};

  if (input.providerType === "azure_openai") {
    const apiKey = requireApiKey(input);
    const deployment = input.providerOptions.deployment;
    const apiVersion = input.providerOptions.apiVersion;

    if (!deployment || !apiVersion) {
      throw new AIProviderHttpError("Azure OpenAI channel is missing deployment or api version");
    }

    const baseUrl = input.baseUrl.replace(/\/+$/, "");
    const endpoint = new URL(
      `${baseUrl}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions`,
    );
    endpoint.searchParams.set("api-version", apiVersion);

    return {
      endpoint: endpoint.toString(),
      headers: {
        ...customHeaders,
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: {
        temperature: input.temperature,
        max_tokens: input.maxTokens ?? 1024,
        messages,
      },
    };
  }

  const endpoint = withDefaultPath(input.baseUrl, endpointPath);
  const headers: Record<string, string> = {
    ...customHeaders,
    "Content-Type": "application/json",
  };

  if (input.providerType !== "local_gateway") {
    headers.Authorization = `Bearer ${requireApiKey(input)}`;
  } else if (input.apiKey) {
    headers.Authorization = `Bearer ${input.apiKey}`;
  }

  return {
    endpoint,
    headers,
    body: {
      model: input.model,
      temperature: input.temperature,
      max_tokens: input.maxTokens ?? 1024,
      messages,
    },
  };
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

function getProviderLabel(providerType: AIProviderGenerateInput["providerType"]): string {
  if (providerType === "azure_openai") {
    return "Azure OpenAI ";
  }

  if (providerType === "local_gateway") {
    return "Local Gateway ";
  }

  if (providerType === "aggregator") {
    return "Aggregator ";
  }

  return "OpenAI Compatible ";
}
