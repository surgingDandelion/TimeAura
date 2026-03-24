import type { AIProviderGenerateInput, AIProviderGenerateResult } from "../aiProvider";

export class AIProviderHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AIProviderHttpError";
  }
}

export async function postJson<TResponse>(
  url: string,
  init: {
    headers: Record<string, string>;
    body: unknown;
    timeoutMs: number;
  },
): Promise<{ data: TResponse; latencyMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: init.headers,
      body: JSON.stringify(init.body),
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = tryParseJson(text);

    if (!response.ok) {
      throw new AIProviderHttpError(
        `AI provider request failed with status ${response.status}`,
        response.status,
        payload ?? text,
      );
    }

    return {
      data: payload as TResponse,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (error instanceof AIProviderHttpError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderHttpError("AI provider request timed out");
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function requireApiKey(input: AIProviderGenerateInput): string {
  if (!input.apiKey) {
    throw new AIProviderHttpError("Missing API key for AI provider");
  }

  return input.apiKey;
}

export function withDefaultPath(baseUrl: string, path: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");

  if (normalized.endsWith(path)) {
    return normalized;
  }

  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toResult(content: string, latencyMs: number): AIProviderGenerateResult {
  return {
    content: content.trim(),
    latencyMs,
  };
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
