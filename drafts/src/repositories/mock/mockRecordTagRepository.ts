import type { RecordTagRepository } from "../recordTagRepository";

import type { MockRuntime } from "../../mock/index";

import { cloneValue, ensureUnique } from "../../mock/index";

export class MockRecordTagRepository implements RecordTagRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async bind(recordId: string, tagId: string, createdAt: string): Promise<void> {
    const record = this.requireRecord(recordId);
    const tagIds = ensureUnique([...record.tags, tagId]);
    record.tags = cloneValue(tagIds);
    this.runtime.recordTags = this.runtime.recordTags.filter(
      (link) => !(link.recordId === recordId && link.tagId === tagId),
    );
    this.runtime.recordTags.push({ recordId, tagId, createdAt });
  }

  async unbind(recordId: string, tagId: string): Promise<void> {
    const record = this.requireRecord(recordId);
    record.tags = record.tags.filter((item) => item !== tagId);
    this.runtime.recordTags = this.runtime.recordTags.filter(
      (link) => !(link.recordId === recordId && link.tagId === tagId),
    );
  }

  async replaceRecordTags(recordId: string, tagIds: string[], createdAt: string): Promise<void> {
    const record = this.requireRecord(recordId);
    const nextTagIds = ensureUnique(tagIds);
    record.tags = cloneValue(nextTagIds);
    this.runtime.recordTags = this.runtime.recordTags.filter((link) => link.recordId !== recordId);
    this.runtime.recordTags.push(
      ...nextTagIds.map((tagId) => ({
        recordId,
        tagId,
        createdAt,
      })),
    );
  }

  async listTagIdsByRecordId(recordId: string): Promise<string[]> {
    return this.runtime.recordTags.filter((link) => link.recordId === recordId).map((link) => link.tagId);
  }

  async listRecordIdsByTagId(tagId: string): Promise<string[]> {
    return this.runtime.recordTags.filter((link) => link.tagId === tagId).map((link) => link.recordId);
  }

  private requireRecord(recordId: string): { id: string; tags: string[] } {
    const record = this.runtime.records.find((item) => item.id === recordId);

    if (!record) {
      throw new Error(`Record not found: ${recordId}`);
    }

    return record;
  }
}
