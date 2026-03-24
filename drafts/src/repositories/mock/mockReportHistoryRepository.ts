import type { ReportHistoryRepository } from "../reportHistoryRepository";

import type { MockRuntime } from "../../mock/index";
import type { ReportHistoryEntity } from "../../types/index";

import { cloneValue } from "../../mock/index";

export class MockReportHistoryRepository implements ReportHistoryRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async insert(history: ReportHistoryEntity): Promise<void> {
    this.runtime.reportHistories.unshift(cloneValue(history));
  }

  async update(id: string, patch: Partial<ReportHistoryEntity>): Promise<ReportHistoryEntity> {
    const history = this.requireHistory(id);

    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined) {
        (history as Record<string, unknown>)[key] = value;
      }
    });

    return cloneValue(history);
  }

  async findById(id: string): Promise<ReportHistoryEntity | null> {
    const history = this.runtime.reportHistories.find((item) => item.id === id);
    return history ? cloneValue(history) : null;
  }

  async list(): Promise<ReportHistoryEntity[]> {
    return cloneValue(this.runtime.reportHistories);
  }

  private requireHistory(id: string): ReportHistoryEntity {
    const history = this.runtime.reportHistories.find((item) => item.id === id);

    if (!history) {
      throw new Error(`Report history not found: ${id}`);
    }

    return history;
  }
}
