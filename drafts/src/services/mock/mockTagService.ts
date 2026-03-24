import type { TagService } from "../tagService";

import type { RecordRepository, RecordTagRepository, TagRepository } from "../../repositories/index";
import type { CreateTagInput, TagCountItem, TagEntity, UpdateTagPatch } from "../../types/index";

import { createMockId } from "../../mock/index";

const UNCATEGORIZED_TAG_ID = "tag_uncategorized";

export class MockTagService implements TagService {
  constructor(
    private readonly tagRepository: TagRepository,
    private readonly recordRepository: RecordRepository,
    private readonly recordTagRepository: RecordTagRepository,
    private readonly now: () => string,
  ) {}

  async listTags(): Promise<TagEntity[]> {
    return this.tagRepository.list();
  }

  async listTagsWithCounts(includeCompleted?: boolean): Promise<TagCountItem[]> {
    return this.tagRepository.listWithCounts(includeCompleted);
  }

  async createTag(input: CreateTagInput): Promise<TagEntity> {
    const timestamp = this.now();
    const tags = await this.tagRepository.list();

    const tag: TagEntity = {
      id: createMockId("tag"),
      name: input.name.trim(),
      color: input.color,
      isSystem: false,
      sortOrder: tags.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.tagRepository.insert(tag);
    return tag;
  }

  async updateTag(id: string, patch: UpdateTagPatch): Promise<TagEntity> {
    return this.tagRepository.update(id, {
      ...patch,
      updatedAt: this.now(),
    });
  }

  async deleteTag(id: string): Promise<void> {
    const tag = await this.tagRepository.findById(id);

    if (!tag) {
      return;
    }

    if (tag.isSystem) {
      throw new Error("System tag cannot be deleted");
    }

    const allRecords = await this.recordRepository.list({ includeDeleted: true });

    for (const record of allRecords.items.filter((item) => item.tags.includes(id))) {
      const nextTags = record.tags.filter((tagId) => tagId !== id);
      await this.recordTagRepository.replaceRecordTags(
        record.id,
        nextTags.length > 0 ? nextTags : [UNCATEGORIZED_TAG_ID],
        this.now(),
      );
    }

    await this.tagRepository.delete(id);
  }

  async setRecordTags(recordId: string, tagIds: string[]): Promise<void> {
    const nextTagIds = tagIds.length > 0 ? tagIds : [UNCATEGORIZED_TAG_ID];
    await this.recordTagRepository.replaceRecordTags(recordId, nextTagIds, this.now());
  }

  async toggleRecordTag(recordId: string, tagId: string): Promise<void> {
    const currentTagIds = await this.recordTagRepository.listTagIdsByRecordId(recordId);
    const hasTag = currentTagIds.includes(tagId);

    if (hasTag) {
      const nextTags = currentTagIds.filter((item) => item !== tagId);
      await this.setRecordTags(recordId, nextTags);
      return;
    }

    await this.setRecordTags(recordId, [...currentTagIds.filter((item) => item !== UNCATEGORIZED_TAG_ID), tagId]);
  }
}
