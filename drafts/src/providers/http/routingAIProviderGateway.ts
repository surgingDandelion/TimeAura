import type { AIProviderGateway, AIProviderGenerateInput, AIProviderGenerateResult } from "../aiProvider";
import type { ChannelTestResult } from "../../types/index";

import { AnthropicAIProviderGateway } from "./anthropicAIProviderGateway";
import { OpenAICompatibleAIProviderGateway } from "./openAICompatibleAIProviderGateway";

export interface RoutingAIProviderGatewayOptions {
  openAICompatible?: AIProviderGateway;
  anthropic?: AIProviderGateway;
}

export class RoutingAIProviderGateway implements AIProviderGateway {
  private readonly openAICompatible: AIProviderGateway;
  private readonly anthropic: AIProviderGateway;

  constructor(options: RoutingAIProviderGatewayOptions = {}) {
    this.openAICompatible = options.openAICompatible ?? new OpenAICompatibleAIProviderGateway();
    this.anthropic = options.anthropic ?? new AnthropicAIProviderGateway();
  }

  async generateText(input: AIProviderGenerateInput): Promise<AIProviderGenerateResult> {
    return this.resolveGateway(input.providerType).generateText(input);
  }

  async testConnection(input: Omit<AIProviderGenerateInput, "prompt">): Promise<ChannelTestResult> {
    return this.resolveGateway(input.providerType).testConnection(input);
  }

  private resolveGateway(providerType: AIProviderGenerateInput["providerType"]): AIProviderGateway {
    if (providerType === "anthropic") {
      return this.anthropic;
    }

    return this.openAICompatible;
  }
}
