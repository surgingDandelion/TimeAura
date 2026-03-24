import type { AIAbilityKey } from "../types/index";

export interface AIResult {
  content: string;
  channelId: string;
  providerType: string;
  fallbackUsed: boolean;
  latencyMs?: number;
}

export interface GenerateSummaryInput {
  recordId: string;
}

export interface PolishMarkdownInput {
  recordId: string;
  markdown: string;
}

export interface GenerateReportAIInput {
  abilityKey: Extract<AIAbilityKey, "weekly_report" | "monthly_report">;
  prompt: string;
}

export interface AIService {
  generateSummary(input: GenerateSummaryInput): Promise<AIResult>;
  polishMarkdown(input: PolishMarkdownInput): Promise<AIResult>;
  generateReportContent(input: GenerateReportAIInput): Promise<AIResult>;
}
