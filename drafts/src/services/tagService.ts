import type { CreateTagInput, TagCountItem, TagEntity, UpdateTagPatch } from "../types/index";

export interface TagService {
  listTags(): Promise<TagEntity[]>;
  listTagsWithCounts(includeCompleted?: boolean): Promise<TagCountItem[]>;
  createTag(input: CreateTagInput): Promise<TagEntity>;
  updateTag(id: string, patch: UpdateTagPatch): Promise<TagEntity>;
  deleteTag(id: string): Promise<void>;
  setRecordTags(recordId: string, tagIds: string[]): Promise<void>;
  toggleRecordTag(recordId: string, tagId: string): Promise<void>;
}
