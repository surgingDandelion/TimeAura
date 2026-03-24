import type { AIService, AIResult, GenerateReportAIInput, GenerateSummaryInput, PolishMarkdownInput } from "../aiService";

import type { AIProviderGateway, CredentialVault } from "../../providers/index";
import type { ChannelRepository, RecordRepository } from "../../repositories/index";
import type { AIAbilityKey, AIChannelEntity, RecordEntity } from "../../types/index";

export class DefaultAIService implements AIService {
  constructor(
    private readonly recordRepository: RecordRepository,
    private readonly channelRepository: ChannelRepository,
    private readonly aiGateway: AIProviderGateway,
    private readonly credentialVault: CredentialVault,
  ) {}

  async generateSummary(input: GenerateSummaryInput): Promise<AIResult> {
    const record = await this.recordRepository.findById(input.recordId);

    if (!record) {
      throw new Error(`Record not found: ${input.recordId}`);
    }

    const channel = await this.resolveChannel("summary");
    const result = await this.aiGateway.generateText({
      providerType: channel.providerType,
      baseUrl: channel.baseUrl,
      apiKey: await this.resolveApiKey(channel),
      model: channel.model,
      systemPrompt: channel.systemPrompt,
      prompt: this.buildSummaryPrompt(record),
      temperature: channel.temperature,
      maxTokens: channel.maxTokens,
      timeoutMs: channel.timeoutMs,
      providerOptions: channel.providerOptions,
    });

    return {
      content: result.content,
      channelId: channel.id,
      providerType: channel.providerType,
      fallbackUsed: false,
      latencyMs: result.latencyMs,
    };
  }

  async polishMarkdown(input: PolishMarkdownInput): Promise<AIResult> {
    const channel = await this.resolveChannel("polish");
    const result = await this.aiGateway.generateText({
      providerType: channel.providerType,
      baseUrl: channel.baseUrl,
      apiKey: await this.resolveApiKey(channel),
      model: channel.model,
      systemPrompt: channel.systemPrompt,
      prompt: [
        "请在保留原意的前提下，润色以下 Markdown 记录内容。",
        "要求：",
        "- 保持结构清晰",
        "- 语言简洁",
        "- 不要虚构不存在的信息",
        "",
        input.markdown,
      ].join("\n"),
      temperature: channel.temperature,
      maxTokens: channel.maxTokens,
      timeoutMs: channel.timeoutMs,
      providerOptions: channel.providerOptions,
    });

    return {
      content: result.content,
      channelId: channel.id,
      providerType: channel.providerType,
      fallbackUsed: false,
      latencyMs: result.latencyMs,
    };
  }

  async generateReportContent(input: GenerateReportAIInput): Promise<AIResult> {
    const channel = await this.resolveChannel(input.abilityKey);
    const result = await this.aiGateway.generateText({
      providerType: channel.providerType,
      baseUrl: channel.baseUrl,
      apiKey: await this.resolveApiKey(channel),
      model: channel.model,
      systemPrompt: channel.systemPrompt,
      prompt: input.prompt,
      temperature: channel.temperature,
      maxTokens: channel.maxTokens,
      timeoutMs: channel.timeoutMs,
      providerOptions: channel.providerOptions,
    });

    return {
      content: result.content,
      channelId: channel.id,
      providerType: channel.providerType,
      fallbackUsed: false,
      latencyMs: result.latencyMs,
    };
  }

  private async resolveChannel(abilityKey: AIAbilityKey): Promise<AIChannelEntity> {
    const channelId = await this.channelRepository.findChannelIdForAbility(abilityKey);

    if (channelId) {
      const mappedChannel = await this.channelRepository.findById(channelId);
      if (mappedChannel?.enabled) {
        return mappedChannel;
      }
    }

    const enabledChannels = await this.channelRepository.listEnabled();
    const fallbackChannel = enabledChannels[0];

    if (!fallbackChannel) {
      throw new Error("No enabled AI channel available");
    }

    return fallbackChannel;
  }

  private async resolveApiKey(channel: AIChannelEntity): Promise<string | null> {
    if (!channel.apiKeyRef) {
      return null;
    }

    return this.credentialVault.getSecret(channel.apiKeyRef);
  }

  private buildSummaryPrompt(record: RecordEntity): string {
    return [
      "请为下面这条记录生成一段简短摘要，适合放在详情页摘要区域。",
      "要求：",
      "- 使用中文",
      "- 不超过 80 字",
      "- 突出当前状态、优先级、时间压力",
      "",
      `标题：${record.title}`,
      `状态：${record.status}`,
      `优先级：${record.priority}`,
      `截止时间：${record.dueAt ?? "无"}`,
      `内容：${record.contentMarkdown || record.contentPlain || "无"}`,
    ].join("\n");
  }
}
