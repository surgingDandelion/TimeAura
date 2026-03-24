import type { ReportDraftResult, ReportHistoryEntity, GenerateReportInput, RecordEntity } from "../types/index";

export interface SaveReportHistoryInput {
  title: string;
  reportType: GenerateReportInput["reportType"];
  templateId: string | null;
  channelId: string | null;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  tagFilter: string | null;
  statusFilter: string | null;
  sourceRecordIds: string[];
  contentMarkdown: string;
}

export interface ReportService {
  generateReport(input: GenerateReportInput): Promise<ReportDraftResult>;
  saveReportHistory(input: SaveReportHistoryInput): Promise<ReportHistoryEntity>;
  saveReportAsRecord(historyId: string): Promise<RecordEntity>;
  listReportHistories(): Promise<ReportHistoryEntity[]>;
  getReportHistoryById(id: string): Promise<ReportHistoryEntity | null>;
}
