import type { TagRepository } from "../tagRepository";

import type { MockRuntime } from "../../mock/index";
import type { TagCountItem, TagEntity } from "../../types/index";

import { cloneValue } from "../../mock/index";

export class MockTagRepository implements TagRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async insert(tag: TagEntity): Promise<void> {
    this.runtime.tags.push(cloneValue(tag));
  }

  async update(id: string, patch: Partial<TagEntity>): Promise<TagEntity> {
    const tag = this.requireTag(id);

    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined) {
        (tag as Record<string, unknown>)[key] = value;
      }
    });

    return cloneValue(tag);
  }

  async delete(id: string): Promise<void> {
    this.runtime.tags = this.runtime.tags.filter((tag) => tag.id !== id);
    this.runtime.recordTags = this.runtime.recordTags.filter((link) => link.tagId !== id);
    this.runtime.records.forEach((record) => {
      record.tags = record.tags.filter((tagId) => tagId !== id);
    });
  }

  async findById(id: string): Promise<TagEntity | null> {
    const tag = this.runtime.tags.find((item) => item.id === id);
    return tag ? cloneValue(tag) : null;
  }

  async findByName(name: string): Promise<TagEntity | null> {
    const tag = this.runtime.tags.find((item) => item.name === name);
    return tag ? cloneValue(tag) : null;
  }

  async list(): Promise<TagEntity[]> {
    return cloneValue([...this.runtime.tags].sort((left, right) => left.sortOrder - right.sortOrder));
  }

  async listWithCounts(includeCompleted = false): Promise<TagCountItem[]> {
    const items = this.runtime.tags.map((tag) => {
      const count = this.runtime.records.filter((record) => {
        const matchesTag = record.tags.includes(tag.id);
        const matchesStatus = includeCompleted ? true : record.status !== "已完成" && record.status !== "已归档";
        return matchesTag && matchesStatus && !record.deletedAt;
      }).length;

      return {
        ...tag,
        count,
      };
    });

    return cloneValue(items);
  }

  private requireTag(id: string): TagEntity {
    const tag = this.runtime.tags.find((item) => item.id === id);

    if (!tag) {
      throw new Error(`Tag not found: ${id}`);
    }

    return tag;
  }
}
