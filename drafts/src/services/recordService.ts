import type { CreateRecordInput, PageResult, RecordEntity, RecordListQuery, RescheduleStrategy, UpdateRecordPatch } from "../types";

export interface RecordService {
  createRecord(input: CreateRecordInput): Promise<RecordEntity>;
  updateRecord(id: string, patch: UpdateRecordPatch): Promise<RecordEntity>;
  completeRecord(id: string, completedAt?: string): Promise<RecordEntity>;
  archiveRecord(id: string): Promise<void>;
  deleteRecord(id: string): Promise<void>;
  batchReschedule(ids: string[], strategy: RescheduleStrategy): Promise<RecordEntity[]>;
  listRecords(query: RecordListQuery): Promise<PageResult<RecordEntity>>;
  getRecordById(id: string): Promise<RecordEntity | null>;
}
