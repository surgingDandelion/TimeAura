export interface RecordTagRepository {
  bind(recordId: string, tagId: string, createdAt: string): Promise<void>;
  unbind(recordId: string, tagId: string): Promise<void>;
  replaceRecordTags(recordId: string, tagIds: string[], createdAt: string): Promise<void>;
  listTagIdsByRecordId(recordId: string): Promise<string[]>;
  listRecordIdsByTagId(tagId: string): Promise<string[]>;
}
