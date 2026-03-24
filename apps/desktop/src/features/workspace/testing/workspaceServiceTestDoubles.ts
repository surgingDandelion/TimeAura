import type { AppServices, CreateRecordInput, PageResult, RecordEntity, RecordService, RescheduleStrategy, UpdateRecordPatch } from "@timeaura-core";
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

export function createWorkspaceAppServicesDouble(recordServiceOverrides: Partial<RecordService> = {}): AppServices {
  return {
    recordService: createWorkspaceRecordServiceDouble(recordServiceOverrides),
  } as unknown as AppServices;
}
