import type { AIService, AIResult, GenerateReportAIInput, GenerateSummaryInput, PolishMarkdownInput } from "../aiService";

import type { ChannelRepository, RecordRepository } from "../../repositories/index";
import type { AIAbilityKey, AIChannelEntity, RecordEntity } from "../../types/index";

export class MockAIService implements AIService {
  constructor(
    private readonly recordRepository: RecordRepository,
    private readonly channelRepository: ChannelRepository,
  ) {}

  async generateSummary(input: GenerateSummaryInput): Promise<AIResult> {
    const record = await this.recordRepository.findById(input.recordId);

    if (!record) {
      throw new Error(`Record not found: ${input.recordId}`);
    }

    const channel = await this.resolveChannel("summary");

    return {
      content: this.buildSummary(record),
      channelId: channel.id,
      providerType: channel.providerType,
      fallbackUsed: false,
      latencyMs: 120,
    };
  }

  async polishMarkdown(input: PolishMarkdownInput): Promise<AIResult> {
    const channel = await this.resolveChannel("polish");
    const lines = input.markdown
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line, index, array) => !(line === "" && array[index - 1] === ""));

    const content = lines.length > 0
      ? lines.join("\n")
      : `# ${input.recordId}\n\n- 待补充内容`;

    return {
      content,
      channelId: channel.id,
      providerType: channel.providerType,
      fallbackUsed: false,
      latencyMs: 180,
    };
  }

  async generateReportContent(input: GenerateReportAIInput): Promise<AIResult> {
    const channel = await this.resolveChannel(input.abilityKey);
    const sectionLine = input.prompt
      .split("\n")
      .find((line) => line.startsWith("结构："));
    const sections = (sectionLine?.replace("结构：", "") ?? "重点内容")
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean);

    const content = sections
      .map((section, index) => `## ${section}\n- ${index === 0 ? "已基于所选记录整理核心进展。" : "建议结合记录进一步补充关键细节。"}`)
      .join("\n\n");

    return {
      content,
      channelId: channel.id,
      providerType: channel.providerType,
      fallbackUsed: false,
      latencyMs: 420,
    };
  }

  private buildSummary(record: RecordEntity): string {
    const dueLabel = record.dueAt ? `，截止于 ${record.dueAt.slice(0, 16).replace("T", " ")}` : "";
    return `${record.title}${dueLabel}。当前状态：${record.status}，优先级 ${record.priority}。`;
  }

  private async resolveChannel(abilityKey: AIAbilityKey): Promise<AIChannelEntity> {
    const channelId = await this.channelRepository.findChannelIdForAbility(abilityKey);

    if (channelId) {
      const mappedChannel = await this.channelRepository.findById(channelId);
      if (mappedChannel) {
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
}
