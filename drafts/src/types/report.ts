export const REPORT_TEMPLATE_TYPES = ["weekly", "monthly", "custom"] as const;
export type ReportTemplateType = (typeof REPORT_TEMPLATE_TYPES)[number];

export interface ReportTemplateEntity {
  id: string;
  templateType: ReportTemplateType;
  name: string;
  tone: string;
  sections: string[];
  promptPrefix: string;
  isBuiltin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportHistoryEntity {
  id: string;
  reportType: ReportTemplateType;
  templateId: string | null;
  channelId: string | null;
  title: string;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  tagFilter: string | null;
  statusFilter: string | null;
  sourceRecordIds: string[];
  contentMarkdown: string;
  savedRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateReportInput {
  reportType: ReportTemplateType;
  templateId: string;
  channelId?: string | null;
  timeRangeStart: string;
  timeRangeEnd: string;
  tagFilter?: string | null;
  statusFilter?: string | null;
  sourceRecordIds?: string[];
}

export interface ReportDraftResult {
  title: string;
  contentMarkdown: string;
  sourceRecordIds: string[];
  channelId: string;
  fallbackUsed: boolean;
}
