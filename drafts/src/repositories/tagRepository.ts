import type { TagCountItem, TagEntity } from "../types";

export interface TagRepository {
  insert(tag: TagEntity): Promise<void>;
  update(id: string, patch: Partial<TagEntity>): Promise<TagEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<TagEntity | null>;
  findByName(name: string): Promise<TagEntity | null>;
  list(): Promise<TagEntity[]>;
  listWithCounts(includeCompleted?: boolean): Promise<TagCountItem[]>;
}
