import type { RecordService } from "../recordService";

import type { RecordRepository } from "../../repositories/index";
import type { CreateRecordInput, PageResult, RecordEntity, RecordListQuery, RescheduleStrategy, UpdateRecordPatch } from "../../types/index";

import { createMockId, stripMarkdown } from "../../mock/index";

export class DefaultRecordService implements RecordService {
  constructor(private readonly recordRepository: RecordRepository, private readonly now: () => string) {}

  async createRecord(input: CreateRecordInput): Promise<RecordEntity> {
    const timestamp = this.now();
    const contentMarkdown = input.contentMarkdown ?? "";

    const record: RecordEntity = {
      id: createMockId("record"),
      recordKind: input.recordKind ?? "task",
      title: input.title.trim(),
      contentMarkdown,
      contentPlain: stripMarkdown(contentMarkdown || input.title),
      status: input.status ?? "未开始",
      priority: input.priority ?? "P3",
      tags: input.tags?.length ? input.tags : ["tag_uncategorized"],
      dueAt: input.dueAt ?? null,
      plannedAt: input.plannedAt ?? null,
      completedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      archivedAt: null,
      deletedAt: null,
      sourceReportHistoryId: null,
      aiSummary: null,
      isPinned: false,
    };

    await this.recordRepository.insert(record);
    return record;
  }

  async updateRecord(id: string, patch: UpdateRecordPatch): Promise<RecordEntity> {
    const nextPatch: UpdateRecordPatch = { ...patch };

    if (patch.completedAt) {
      nextPatch.status = "已完成";
    }

    if (patch.status === "已完成") {
      nextPatch.completedAt = patch.completedAt ?? this.now();
      nextPatch.archivedAt = null;
    }

    if (patch.status === "已归档") {
      nextPatch.archivedAt = patch.archivedAt ?? this.now();
      nextPatch.completedAt = patch.completedAt ?? this.now();
    }

    if (patch.status === "未开始" || patch.status === "进行中") {
      nextPatch.completedAt = null;
      nextPatch.archivedAt = null;
    }

    if (patch.tags && patch.tags.length === 0) {
      nextPatch.tags = ["tag_uncategorized"];
    }

    return this.recordRepository.update(id, nextPatch);
  }

  async completeRecord(id: string, completedAt = this.now()): Promise<RecordEntity> {
    return this.recordRepository.update(id, {
      status: "已完成",
      completedAt,
    });
  }

  async archiveRecord(id: string): Promise<void> {
    await this.recordRepository.archive(id, this.now());
  }

  async deleteRecord(id: string): Promise<void> {
    await this.recordRepository.softDelete(id, this.now());
  }

  async restoreRecord(id: string): Promise<RecordEntity> {
    return this.recordRepository.restore(id, this.now());
  }

  async destroyRecord(id: string): Promise<void> {
    await this.recordRepository.hardDelete(id);
  }

  async emptyTrash(): Promise<number> {
    return this.recordRepository.clearDeleted();
  }

  async batchReschedule(ids: string[], strategy: RescheduleStrategy): Promise<RecordEntity[]> {
    return this.recordRepository.batchReschedule(ids, strategy);
  }

  async listRecords(query: RecordListQuery): Promise<PageResult<RecordEntity>> {
    return this.recordRepository.list(query);
  }

  async getRecordById(id: string): Promise<RecordEntity | null> {
    return this.recordRepository.findById(id);
  }
}
