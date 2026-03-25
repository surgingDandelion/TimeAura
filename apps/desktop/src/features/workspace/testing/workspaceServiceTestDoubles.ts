import type {
  AIService,
  AIResult,
  AppContainer,
  AppServices,
  CreateRecordInput,
  CreateTagInput,
  PageResult,
  RecordEntity,
  RecordService,
  ReminderHit,
  ReminderService,
  ReminderSummary,
  RescheduleStrategy,
  TagEntity,
  TagService,
  UpdateRecordPatch,
  UpdateTagPatch,
} from "@timeaura-core";
import { vi } from "vitest";

export function createWorkspaceRecordEntity(overrides: Partial<RecordEntity> = {}): RecordEntity {
  return {
    id: "record-1",
    recordKind: "task",
    title: "默认任务",
    contentMarkdown: "",
    contentPlain: "",
    status: "未开始",
    priority: "P3",
    tags: [],
    dueAt: null,
    plannedAt: null,
    completedAt: null,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T09:00:00.000Z",
    archivedAt: null,
    deletedAt: null,
    sourceReportHistoryId: null,
    aiSummary: null,
    isPinned: false,
    ...overrides,
  };
}

export function createWorkspaceTagEntity(overrides: Partial<TagEntity> = {}): TagEntity {
  return {
    id: "tag-1",
    name: "工作",
    color: "#5f89ff",
    isSystem: false,
    sortOrder: 0,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T09:00:00.000Z",
    ...overrides,
  };
}

export function createWorkspaceReminderSummary(overrides: Partial<ReminderSummary> = {}): ReminderSummary {
  return {
    kind: "overdue",
    title: "有任务已逾期",
    description: "建议优先处理已过期任务",
    hitCount: 1,
    p1Count: 0,
    recordIds: ["record-1"],
    ...overrides,
  };
}

export function createWorkspaceReminderHit(overrides: Partial<ReminderHit> = {}): ReminderHit {
  return {
    ...createWorkspaceRecordEntity(),
    reminderKind: "overdue",
    ...overrides,
  };
}

export function createWorkspaceRecordServiceDouble(overrides: Partial<RecordService> = {}): RecordService {
  return {
    createRecord: vi.fn(async (input: CreateRecordInput) =>
      createWorkspaceRecordEntity({
        id: "record-created",
        title: input.title,
        priority: input.priority ?? "P3",
        status: input.status ?? "未开始",
        tags: input.tags ?? [],
        plannedAt: input.plannedAt ?? null,
        dueAt: input.dueAt ?? null,
      }),
    ),
    updateRecord: vi.fn(async (_id: string, patch: UpdateRecordPatch) =>
      createWorkspaceRecordEntity({
        ...patch,
        title: patch.title ?? "已更新任务",
      }),
    ),
    completeRecord: vi.fn(async (id: string) =>
      createWorkspaceRecordEntity({
        id,
        status: "已完成",
        completedAt: "2026-01-01T10:00:00.000Z",
      }),
    ),
    archiveRecord: vi.fn(async () => undefined),
    deleteRecord: vi.fn(async () => undefined),
    batchReschedule: vi.fn(async (ids: string[], strategy: RescheduleStrategy) =>
      ids.map((id) =>
        createWorkspaceRecordEntity({
          id,
          plannedAt: strategy.preset === "custom" ? strategy.customAt ?? null : "2026-01-02T09:00:00.000Z",
        }),
      ),
    ),
    listRecords: vi.fn(async (): Promise<PageResult<RecordEntity>> => ({
      items: [],
      total: 0,
    })),
    getRecordById: vi.fn(async (_id: string): Promise<RecordEntity | null> => null),
    ...overrides,
  };
}

export function createWorkspaceTagServiceDouble(overrides: Partial<TagService> = {}): TagService {
  return {
    listTags: vi.fn(async () => []),
    listTagsWithCounts: vi.fn(async () => []),
    createTag: vi.fn(async (input: CreateTagInput) =>
      createWorkspaceTagEntity({
        id: "tag-created",
        name: input.name,
        color: input.color,
      }),
    ),
    updateTag: vi.fn(async (id: string, patch: UpdateTagPatch) =>
      createWorkspaceTagEntity({
        id,
        name: patch.name ?? "已更新标签",
        color: patch.color ?? "#5f89ff",
        sortOrder: patch.sortOrder ?? 0,
      }),
    ),
    deleteTag: vi.fn(async () => undefined),
    setRecordTags: vi.fn(async () => undefined),
    toggleRecordTag: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function createWorkspaceReminderServiceDouble(overrides: Partial<ReminderService> = {}): ReminderService {
  return {
    getReminderSummary: vi.fn(async () => null),
    listReminderHits: vi.fn(async () => []),
    snoozeReminder: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function createWorkspaceAIServiceDouble(overrides: Partial<AIService> = {}): AIService {
  const defaultResult: AIResult = {
    content: "AI 结果",
    channelId: "channel-default",
    providerType: "openai-compatible",
    fallbackUsed: false,
  };

  return {
    generateSummary: vi.fn(async () => defaultResult),
    polishMarkdown: vi.fn(async () => ({
      ...defaultResult,
      content: "AI 润色结果",
    })),
    generateReportContent: vi.fn(async () => defaultResult),
    ...overrides,
  };
}

interface CreateWorkspaceAppServicesDoubleOptions {
  aiService?: Partial<AIService>;
  recordService?: Partial<RecordService>;
  reminderService?: Partial<ReminderService>;
  tagService?: Partial<TagService>;
}

export function createWorkspaceAppServicesDouble(
  options: CreateWorkspaceAppServicesDoubleOptions = {},
): AppServices {
  return {
    aiService: createWorkspaceAIServiceDouble(options.aiService),
    channelService: {} as AppServices["channelService"],
    notificationService: {} as AppServices["notificationService"],
    recordService: createWorkspaceRecordServiceDouble(options.recordService),
    reminderService: createWorkspaceReminderServiceDouble(options.reminderService),
    reportService: {} as AppServices["reportService"],
    settingsService: {} as AppServices["settingsService"],
    tagService: createWorkspaceTagServiceDouble(options.tagService),
    templateService: {} as AppServices["templateService"],
  } as unknown as AppServices;
}

interface CreateWorkspaceAppContainerDoubleOptions extends CreateWorkspaceAppServicesDoubleOptions {
  runtime?: AppContainer["runtime"];
}

export function createWorkspaceAppContainerDouble(
  options: CreateWorkspaceAppContainerDoubleOptions = {},
): AppContainer {
  return {
    repositories: {} as AppContainer["repositories"],
    services: createWorkspaceAppServicesDouble(options),
    runtime: options.runtime,
    dispose: async () => undefined,
  };
}
