import type { ReportHistoryRepository } from "../reportHistoryRepository";

import type { ReportHistoryEntity } from "../../types/index";

import { SqliteClient } from "./sqliteClient";
import { mapReportHistoryRow, serializeJson, type SqliteReportHistoryRow } from "./sqliteMappers";

export class SqliteReportHistoryRepository implements ReportHistoryRepository {
  constructor(private readonly client: SqliteClient) {}

  async insert(history: ReportHistoryEntity): Promise<void> {
    await this.client.execute(
      `
        INSERT INTO report_histories (
          id, report_type, template_id, channel_id, title, time_range_start,
          time_range_end, tag_filter, status_filter, source_record_ids_json,
          content_markdown, saved_record_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        history.id,
        history.reportType,
        history.templateId,
        history.channelId,
        history.title,
        history.timeRangeStart,
        history.timeRangeEnd,
        history.tagFilter,
        history.statusFilter,
        serializeJson(history.sourceRecordIds),
        history.contentMarkdown,
        history.savedRecordId,
        history.createdAt,
        history.updatedAt,
      ],
    );
  }

  async update(id: string, patch: Partial<ReportHistoryEntity>): Promise<ReportHistoryEntity> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Report history not found: ${id}`);
    }

    const next: ReportHistoryEntity = {
      ...current,
      ...patch,
    };

    await this.client.execute(
      `
        UPDATE report_histories
        SET
          report_type = ?,
          template_id = ?,
          channel_id = ?,
          title = ?,
          time_range_start = ?,
          time_range_end = ?,
          tag_filter = ?,
          status_filter = ?,
          source_record_ids_json = ?,
          content_markdown = ?,
          saved_record_id = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        next.reportType,
        next.templateId,
        next.channelId,
        next.title,
        next.timeRangeStart,
        next.timeRangeEnd,
        next.tagFilter,
        next.statusFilter,
        serializeJson(next.sourceRecordIds),
        next.contentMarkdown,
        next.savedRecordId,
        next.updatedAt,
        id,
      ],
    );

    return next;
  }

  async findById(id: string): Promise<ReportHistoryEntity | null> {
    const rows = await this.client.select<SqliteReportHistoryRow>(
      "SELECT * FROM report_histories WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? mapReportHistoryRow(rows[0]) : null;
  }

  async list(): Promise<ReportHistoryEntity[]> {
    const rows = await this.client.select<SqliteReportHistoryRow>(
      "SELECT * FROM report_histories ORDER BY created_at DESC, updated_at DESC",
    );
    return rows.map(mapReportHistoryRow);
  }
}
