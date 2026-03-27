import type { RecordRepository } from "../recordRepository";

import type { MockRuntime } from "../../mock/index";
import type { PageResult, RecordEntity, RecordListQuery, RescheduleStrategy, UpdateRecordPatch } from "../../types/index";

import { cloneValue, matchesSystemView, normalizeText, resolveRescheduleAt, sortRecords, stripMarkdown } from "../../mock/index";

export class MockRecordRepository implements RecordRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async insert(record: RecordEntity): Promise<void> {
    this.runtime.records.unshift(cloneValue(record));
    this.replaceTags(record.id, record.tags, record.createdAt);
  }

  async update(id: string, patch: UpdateRecordPatch): Promise<RecordEntity> {
    const record = this.requireRecord(id);

    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined) {
        (record as unknown as Record<string, unknown>)[key] = value;
      }
    });

    if (patch.contentMarkdown !== undefined) {
      record.contentPlain = stripMarkdown(patch.contentMarkdown);
    }

    if (patch.tags) {
      this.replaceTags(id, patch.tags, this.runtime.now());
    }

    record.updatedAt = this.runtime.now();

    return cloneValue(record);
  }

  async batchUpdate(ids: string[], patch: UpdateRecordPatch): Promise<RecordEntity[]> {
    const items: RecordEntity[] = [];

    for (const id of ids) {
      items.push(await this.update(id, patch));
    }

    return items;
  }

  async batchReschedule(ids: string[], strategy: RescheduleStrategy): Promise<RecordEntity[]> {
    const dueAt = resolveRescheduleAt(strategy, this.runtime.now());
    return this.batchUpdate(ids, { dueAt });
  }

  async findById(id: string): Promise<RecordEntity | null> {
    const record = this.runtime.records.find((item) => item.id === id);
    return record ? cloneValue(record) : null;
  }

  async list(query: RecordListQuery): Promise<PageResult<RecordEntity>> {
    const keyword = query.keyword ? normalizeText(query.keyword) : null;
    const nowIso = this.runtime.now();

    let items = this.runtime.records.filter((record) => query.includeDeleted || !record.deletedAt);

    items = items.filter((record) => matchesSystemView(record, query.view, nowIso));

    if (query.status === "todo") {
      items = items.filter((record) => record.status !== "已完成" && record.status !== "已归档");
    }

    if (query.status === "done") {
      items = items.filter((record) => record.status === "已完成" || record.status === "已归档");
    }

    if (query.priority && query.priority !== "all") {
      items = items.filter((record) => record.priority === query.priority);
    }

    if (query.tagId && query.tagId !== "all") {
      items = items.filter((record) => record.tags.includes(query.tagId as string));
    }

    if (keyword) {
      items = items.filter((record) =>
        [record.title, record.contentPlain, record.contentMarkdown]
          .map((item) => normalizeText(item))
          .some((text) => text.includes(keyword)),
      );
    }

    const sorted = sortRecords(items, query, nowIso);
    return {
      items: cloneValue(sorted),
      total: sorted.length,
    };
  }

  async listByIds(ids: string[]): Promise<RecordEntity[]> {
    return cloneValue(this.runtime.records.filter((record) => ids.includes(record.id)));
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    const record = this.requireRecord(id);
    record.deletedAt = deletedAt;
    record.updatedAt = deletedAt;
  }

  async restore(id: string, restoredAt: string): Promise<RecordEntity> {
    const record = this.requireRecord(id);
    record.deletedAt = null;
    record.updatedAt = restoredAt;
    return cloneValue(record);
  }

  async hardDelete(id: string): Promise<void> {
    this.runtime.records = this.runtime.records.filter((record) => record.id !== id);
    this.runtime.recordTags = this.runtime.recordTags.filter((link) => link.recordId !== id);
  }

  async clearDeleted(): Promise<number> {
    const deletedIds = this.runtime.records.filter((record) => Boolean(record.deletedAt)).map((record) => record.id);
    if (deletedIds.length === 0) {
      return 0;
    }

    this.runtime.records = this.runtime.records.filter((record) => !record.deletedAt);
    this.runtime.recordTags = this.runtime.recordTags.filter((link) => !deletedIds.includes(link.recordId));
    return deletedIds.length;
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    const record = this.requireRecord(id);
    record.archivedAt = archivedAt;
    record.status = "已归档";
    record.updatedAt = archivedAt;
  }

  private requireRecord(id: string): RecordEntity {
    const record = this.runtime.records.find((item) => item.id === id);

    if (!record) {
      throw new Error(`Record not found: ${id}`);
    }

    return record;
  }

  private replaceTags(recordId: string, tagIds: string[], createdAt: string): void {
    const nextTags = Array.from(new Set(tagIds));
    const record = this.requireRecord(recordId);
    record.tags = nextTags;
    this.runtime.recordTags = this.runtime.recordTags.filter((item) => item.recordId !== recordId);
    this.runtime.recordTags.push(
      ...nextTags.map((tagId) => ({
        recordId,
        tagId,
        createdAt,
      })),
    );
  }
}
