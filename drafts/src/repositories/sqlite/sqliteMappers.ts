import type {
  AbilityMappingEntity,
  AIChannelEntity,
  RecordEntity,
  ReportHistoryEntity,
  ReportTemplateEntity,
  TagEntity,
} from "../../types/index";

export interface SqliteRecordRow {
  id: string;
  record_kind: RecordEntity["recordKind"];
  title: string;
  content_markdown: string;
  content_plain: string;
  status: RecordEntity["status"];
  priority: RecordEntity["priority"];
  due_at: string | null;
  planned_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  source_report_history_id: string | null;
  ai_summary: string | null;
  is_pinned: number;
}

export interface SqliteTagRow {
  id: string;
  name: string;
  color: string;
  is_system: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SqliteChannelRow {
  id: string;
  name: string;
  provider_type: AIChannelEntity["providerType"];
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number | null;
  timeout_ms: number;
  system_prompt: string;
  default_language: string;
  enabled: number;
  allow_fallback: number;
  api_key_ref: string | null;
  provider_options_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface SqliteAbilityMappingRow {
  ability_key: AbilityMappingEntity["abilityKey"];
  channel_id: string;
  updated_at: string;
}

export interface SqliteReportTemplateRow {
  id: string;
  template_type: ReportTemplateEntity["templateType"];
  name: string;
  tone: string;
  sections_json: string;
  prompt_prefix: string;
  is_builtin: number;
  created_at: string;
  updated_at: string;
}

export interface SqliteReportHistoryRow {
  id: string;
  report_type: ReportHistoryEntity["reportType"];
  template_id: string | null;
  channel_id: string | null;
  title: string;
  time_range_start: string | null;
  time_range_end: string | null;
  tag_filter: string | null;
  status_filter: string | null;
  source_record_ids_json: string;
  content_markdown: string;
  saved_record_id: string | null;
  created_at: string;
  updated_at: string;
}

export function mapRecordRow(row: SqliteRecordRow, tagIds: string[]): RecordEntity {
  return {
    id: row.id,
    recordKind: row.record_kind,
    title: row.title,
    contentMarkdown: row.content_markdown ?? "",
    contentPlain: row.content_plain ?? "",
    status: row.status,
    priority: row.priority,
    tags: tagIds,
    dueAt: row.due_at,
    plannedAt: row.planned_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    sourceReportHistoryId: row.source_report_history_id,
    aiSummary: row.ai_summary,
    isPinned: row.is_pinned === 1,
  };
}

export function mapTagRow(row: SqliteTagRow): TagEntity {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isSystem: row.is_system === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapChannelRow(row: SqliteChannelRow): AIChannelEntity {
  return {
    id: row.id,
    name: row.name,
    providerType: row.provider_type,
    baseUrl: row.base_url ?? "",
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    timeoutMs: row.timeout_ms,
    systemPrompt: row.system_prompt ?? "",
    defaultLanguage: row.default_language,
    enabled: row.enabled === 1,
    allowFallback: row.allow_fallback === 1,
    apiKeyRef: row.api_key_ref,
    providerOptions: parseJsonObject(row.provider_options_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAbilityMappingRow(row: SqliteAbilityMappingRow): AbilityMappingEntity {
  return {
    abilityKey: row.ability_key,
    channelId: row.channel_id,
    updatedAt: row.updated_at,
  };
}

export function mapReportTemplateRow(row: SqliteReportTemplateRow): ReportTemplateEntity {
  return {
    id: row.id,
    templateType: row.template_type,
    name: row.name,
    tone: row.tone ?? "",
    sections: parseJsonArray<string>(row.sections_json),
    promptPrefix: row.prompt_prefix ?? "",
    isBuiltin: row.is_builtin === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapReportHistoryRow(row: SqliteReportHistoryRow): ReportHistoryEntity {
  return {
    id: row.id,
    reportType: row.report_type,
    templateId: row.template_id,
    channelId: row.channel_id,
    title: row.title,
    timeRangeStart: row.time_range_start,
    timeRangeEnd: row.time_range_end,
    tagFilter: row.tag_filter,
    statusFilter: row.status_filter,
    sourceRecordIds: parseJsonArray<string>(row.source_record_ids_json),
    contentMarkdown: row.content_markdown,
    savedRecordId: row.saved_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeBoolean(value: boolean): number {
  return value ? 1 : 0;
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function deserializeSettingValue(raw: string): unknown {
  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }

  if (
    (raw.startsWith("{") && raw.endsWith("}")) ||
    (raw.startsWith("[") && raw.endsWith("]")) ||
    (raw.startsWith("\"") && raw.endsWith("\""))
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

export function serializeSettingValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

export function createPlaceholders(count: number): string {
  return Array.from({ length: count }, () => "?").join(", ");
}

function parseJsonArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null): Record<string, unknown> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
