import type { PageResult, RecordEntity, RecordListQuery, RescheduleStrategy, UpdateRecordPatch } from "../types/index";

export interface RecordRepository {
  insert(record: RecordEntity): Promise<void>;
  update(id: string, patch: UpdateRecordPatch): Promise<RecordEntity>;
  batchUpdate(ids: string[], patch: UpdateRecordPatch): Promise<RecordEntity[]>;
  batchReschedule(ids: string[], strategy: RescheduleStrategy): Promise<RecordEntity[]>;
  findById(id: string): Promise<RecordEntity | null>;
  list(query: RecordListQuery): Promise<PageResult<RecordEntity>>;
  listByIds(ids: string[]): Promise<RecordEntity[]>;
  softDelete(id: string, deletedAt: string): Promise<void>;
  restore(id: string, restoredAt: string): Promise<RecordEntity>;
  hardDelete(id: string): Promise<void>;
  clearDeleted(): Promise<number>;
  archive(id: string, archivedAt: string): Promise<void>;
}
