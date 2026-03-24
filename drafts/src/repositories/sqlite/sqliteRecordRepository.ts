import type { RecordRepository } from "../recordRepository";

import type { PageResult, RecordEntity, RecordListQuery, RescheduleStrategy, UpdateRecordPatch } from "../../types/index";

import { ensureUnique, matchesSystemView, resolveRescheduleAt, sortRecords, stripMarkdown } from "../../mock/index";

import { SqliteClient } from "./sqliteClient";
import { createPlaceholders, mapRecordRow, serializeBoolean, type SqliteRecordRow } from "./sqliteMappers";

export class SqliteRecordRepository implements RecordRepository {
  constructor(private readonly client: SqliteClient, private readonly now: () => string) {}

  async insert(record: RecordEntity): Promise<void> {
    await this.client.transaction(async (tx) => {
      await tx.execute(
        `
          INSERT INTO records (
            id, record_kind, title, content_markdown, content_plain, status, priority,
            due_at, planned_at, completed_at, created_at, updated_at, archived_at,
            deleted_at, source_report_history_id, ai_summary, is_pinned
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          record.id,
          record.recordKind,
          record.title,
          record.contentMarkdown,
          record.contentPlain,
          record.status,
          record.priority,
          record.dueAt,
          record.plannedAt,
          record.completedAt,
          record.createdAt,
          record.updatedAt,
          record.archivedAt,
          record.deletedAt,
          record.sourceReportHistoryId,
          record.aiSummary,
          serializeBoolean(record.isPinned),
        ],
      );

      await this.replaceTags(tx, record.id, record.tags, record.createdAt);
    });
  }

  async update(id: string, patch: UpdateRecordPatch): Promise<RecordEntity> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Record not found: ${id}`);
    }

    const next: RecordEntity = {
      ...current,
      ...patch,
      tags: patch.tags ? ensureUnique(patch.tags) : current.tags,
      contentMarkdown: patch.contentMarkdown ?? current.contentMarkdown,
      updatedAt: this.now(),
    };

    if (patch.contentMarkdown !== undefined) {
      next.contentPlain = stripMarkdown(patch.contentMarkdown);
    }

    await this.client.transaction(async (tx) => {
      await tx.execute(
        `
          UPDATE records
          SET
            record_kind = ?,
            title = ?,
            content_markdown = ?,
            content_plain = ?,
            status = ?,
            priority = ?,
            due_at = ?,
            planned_at = ?,
            completed_at = ?,
            updated_at = ?,
            archived_at = ?,
            deleted_at = ?,
            source_report_history_id = ?,
            ai_summary = ?,
            is_pinned = ?
          WHERE id = ?
        `,
        [
          next.recordKind,
          next.title,
          next.contentMarkdown,
          next.contentPlain,
          next.status,
          next.priority,
          next.dueAt,
          next.plannedAt,
          next.completedAt,
          next.updatedAt,
          next.archivedAt,
          next.deletedAt,
          next.sourceReportHistoryId,
          next.aiSummary,
          serializeBoolean(next.isPinned),
          id,
        ],
      );

      if (patch.tags) {
        await this.replaceTags(tx, id, next.tags, next.updatedAt);
      }
    });

    return next;
  }

  async batchUpdate(ids: string[], patch: UpdateRecordPatch): Promise<RecordEntity[]> {
    const items: RecordEntity[] = [];
    for (const id of ids) {
      items.push(await this.update(id, patch));
    }
    return items;
  }

  async batchReschedule(ids: string[], strategy: RescheduleStrategy): Promise<RecordEntity[]> {
    const dueAt = resolveRescheduleAt(strategy, this.now());
    return this.batchUpdate(ids, { dueAt });
  }

  async findById(id: string): Promise<RecordEntity | null> {
    const rows = await this.client.select<SqliteRecordRow>("SELECT * FROM records WHERE id = ? LIMIT 1", [id]);
    const row = rows[0];

    if (!row) {
      return null;
    }

    const tagMap = await this.loadTagMap([id]);
    return mapRecordRow(row, tagMap.get(id) ?? []);
  }

  async list(query: RecordListQuery): Promise<PageResult<RecordEntity>> {
    const nowIso = this.now();
    const where: string[] = [];
    const bindValues: unknown[] = [];

    if (!query.includeDeleted) {
      where.push("deleted_at IS NULL");
    }

    if (query.view === "done") {
      where.push("status IN ('已完成', '已归档')");
    }

    if (query.status === "todo") {
      where.push("status NOT IN ('已完成', '已归档')");
    }

    if (query.status === "done") {
      where.push("status IN ('已完成', '已归档')");
    }

    if (query.priority && query.priority !== "all") {
      where.push("priority = ?");
      bindValues.push(query.priority);
    }

    if (query.tagId && query.tagId !== "all") {
      where.push("EXISTS (SELECT 1 FROM record_tags rt WHERE rt.record_id = records.id AND rt.tag_id = ?)");
      bindValues.push(query.tagId);
    }

    if (query.keyword) {
      const keyword = `%${query.keyword.trim().toLowerCase()}%`;
      where.push(
        "(LOWER(title) LIKE ? OR LOWER(content_plain) LIKE ? OR LOWER(content_markdown) LIKE ?)",
      );
      bindValues.push(keyword, keyword, keyword);
    }

    const sql = `SELECT * FROM records${where.length > 0 ? ` WHERE ${where.join(" AND ")}` : ""}`;
    const rows = await this.client.select<SqliteRecordRow>(sql, bindValues);
    const tagMap = await this.loadTagMap(rows.map((row) => row.id));
    const records = rows
      .map((row) => mapRecordRow(row, tagMap.get(row.id) ?? []))
      .filter((record) => matchesSystemView(record, query.view, nowIso));
    const items = sortRecords(records, query, nowIso);

    return {
      items,
      total: items.length,
    };
  }

  async listByIds(ids: string[]): Promise<RecordEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    const rows = await this.client.select<SqliteRecordRow>(
      `SELECT * FROM records WHERE id IN (${createPlaceholders(ids.length)})`,
      ids,
    );
    const tagMap = await this.loadTagMap(ids);
    const order = new Map(ids.map((id, index) => [id, index]));

    return rows
      .map((row) => mapRecordRow(row, tagMap.get(row.id) ?? []))
      .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
  }

  async softDelete(id: string, deletedAt: string): Promise<void> {
    await this.client.execute(
      "UPDATE records SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [deletedAt, deletedAt, id],
    );
  }

  async archive(id: string, archivedAt: string): Promise<void> {
    await this.client.execute(
      "UPDATE records SET status = '已归档', archived_at = ?, updated_at = ? WHERE id = ?",
      [archivedAt, archivedAt, id],
    );
  }

  private async replaceTags(client: SqliteClient, recordId: string, tagIds: string[], createdAt: string): Promise<void> {
    const nextTagIds = ensureUnique(tagIds);
    await client.execute("DELETE FROM record_tags WHERE record_id = ?", [recordId]);

    for (const tagId of nextTagIds) {
      await client.execute(
        "INSERT INTO record_tags (record_id, tag_id, created_at) VALUES (?, ?, ?)",
        [recordId, tagId, createdAt],
      );
    }
  }

  private async loadTagMap(recordIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();

    if (recordIds.length === 0) {
      return map;
    }

    const rows = await this.client.select<{ record_id: string; tag_id: string }>(
      `SELECT record_id, tag_id FROM record_tags WHERE record_id IN (${createPlaceholders(recordIds.length)})`,
      recordIds,
    );

    for (const row of rows) {
      const current = map.get(row.record_id) ?? [];
      current.push(row.tag_id);
      map.set(row.record_id, current);
    }

    return map;
  }
}
