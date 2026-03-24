import type { ReportHistoryEntity } from "../types";

export interface ReportHistoryRepository {
  insert(history: ReportHistoryEntity): Promise<void>;
  update(id: string, patch: Partial<ReportHistoryEntity>): Promise<ReportHistoryEntity>;
  findById(id: string): Promise<ReportHistoryEntity | null>;
  list(): Promise<ReportHistoryEntity[]>;
}
