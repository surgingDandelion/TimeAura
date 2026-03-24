import type { ReportService, SaveReportHistoryInput } from "../reportService";

import type { AIService } from "../aiService";
import type { RecordRepository, ReportHistoryRepository, ReportTemplateRepository } from "../../repositories/index";
import type { GenerateReportInput, RecordEntity, ReportDraftResult, ReportHistoryEntity } from "../../types/index";

import { createMockId, reportTitleFromRange, stripMarkdown } from "../../mock/index";

export class DefaultReportService implements ReportService {
  constructor(
    private readonly recordRepository: RecordRepository,
    private readonly templateRepository: ReportTemplateRepository,
    private readonly historyRepository: ReportHistoryRepository,
    private readonly aiService: AIService,
    private readonly now: () => string,
  ) {}

  async generateReport(input: GenerateReportInput): Promise<ReportDraftResult> {
    const template = await this.templateRepository.findById(input.templateId);

    if (!template) {
      throw new Error(`Template not found: ${input.templateId}`);
    }

    const records = await this.collectSourceRecords(input);
    const abilityKey = input.reportType === "monthly" ? "monthly_report" : "weekly_report";
    const prompt = [
      template.promptPrefix,
      `模板名称：${template.name}`,
      `模板语气：${template.tone}`,
      `结构：${template.sections.join(" / ")}`,
      `时间范围：${input.timeRangeStart} ~ ${input.timeRangeEnd}`,
      "记录清单：",
      ...records.map((record) => `- ${record.title}｜${record.status}｜${record.priority}`),
    ].join("\n");

    const aiResult = await this.aiService.generateReportContent({
      abilityKey,
      prompt,
    });

    return {
      title: reportTitleFromRange(input.reportType, input.timeRangeStart, input.timeRangeEnd),
      contentMarkdown: aiResult.content,
      sourceRecordIds: records.map((record) => record.id),
      channelId: aiResult.channelId,
      fallbackUsed: aiResult.fallbackUsed,
    };
  }

  async saveReportHistory(input: SaveReportHistoryInput): Promise<ReportHistoryEntity> {
    const timestamp = this.now();
    const history: ReportHistoryEntity = {
      id: createMockId("report_history"),
      reportType: input.reportType,
      templateId: input.templateId,
      channelId: input.channelId,
      title: input.title,
      timeRangeStart: input.timeRangeStart,
      timeRangeEnd: input.timeRangeEnd,
      tagFilter: input.tagFilter,
      statusFilter: input.statusFilter,
      sourceRecordIds: input.sourceRecordIds,
      contentMarkdown: input.contentMarkdown,
      savedRecordId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.historyRepository.insert(history);
    return history;
  }

  async saveReportAsRecord(historyId: string): Promise<RecordEntity> {
    const history = await this.historyRepository.findById(historyId);

    if (!history) {
      throw new Error(`Report history not found: ${historyId}`);
    }

    const timestamp = this.now();
    const record: RecordEntity = {
      id: createMockId("record"),
      recordKind: "report",
      title: history.title,
      contentMarkdown: history.contentMarkdown,
      contentPlain: stripMarkdown(history.contentMarkdown),
      status: "已完成",
      priority: "P3",
      tags: history.tagFilter ? [history.tagFilter] : ["tag_reporting"],
      dueAt: null,
      plannedAt: null,
      completedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      deletedAt: null,
      sourceReportHistoryId: history.id,
      aiSummary: null,
      isPinned: false,
    };

    await this.recordRepository.insert(record);
    await this.historyRepository.update(historyId, {
      savedRecordId: record.id,
      updatedAt: timestamp,
    });

    return record;
  }

  async listReportHistories(): Promise<ReportHistoryEntity[]> {
    return this.historyRepository.list();
  }

  async getReportHistoryById(id: string): Promise<ReportHistoryEntity | null> {
    return this.historyRepository.findById(id);
  }

  private async collectSourceRecords(input: GenerateReportInput): Promise<RecordEntity[]> {
    const rawRecords = input.sourceRecordIds?.length
      ? await this.recordRepository.listByIds(input.sourceRecordIds)
      : (await this.recordRepository.list({ status: "all" })).items;

    return rawRecords.filter((record) => {
      if (record.deletedAt) {
        return false;
      }

      const candidateTime = record.updatedAt ?? record.createdAt;
      const isInRange = candidateTime >= input.timeRangeStart && candidateTime <= input.timeRangeEnd;
      if (!isInRange) {
        return false;
      }

      if (input.tagFilter && !record.tags.includes(input.tagFilter)) {
        return false;
      }

      if (input.statusFilter && input.statusFilter !== "all") {
        if (input.statusFilter === "todo") {
          return record.status !== "已完成" && record.status !== "已归档";
        }

        if (input.statusFilter === "done") {
          return record.status === "已完成" || record.status === "已归档";
        }

        return record.status === input.statusFilter;
      }

      return true;
    });
  }
}
