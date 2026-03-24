import type { TagRepository } from "../tagRepository";

import type { TagCountItem, TagEntity } from "../../types/index";

import { SqliteClient } from "./sqliteClient";
import { mapTagRow, type SqliteTagRow } from "./sqliteMappers";

export class SqliteTagRepository implements TagRepository {
  constructor(private readonly client: SqliteClient) {}

  async insert(tag: TagEntity): Promise<void> {
    await this.client.execute(
      `
        INSERT INTO tags (
          id, name, color, is_system, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [tag.id, tag.name, tag.color, tag.isSystem ? 1 : 0, tag.sortOrder, tag.createdAt, tag.updatedAt],
    );
  }

  async update(id: string, patch: Partial<TagEntity>): Promise<TagEntity> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Tag not found: ${id}`);
    }

    const next: TagEntity = {
      ...current,
      ...patch,
    };

    await this.client.execute(
      `
        UPDATE tags
        SET name = ?, color = ?, is_system = ?, sort_order = ?, updated_at = ?
        WHERE id = ?
      `,
      [next.name, next.color, next.isSystem ? 1 : 0, next.sortOrder, next.updatedAt, id],
    );

    return next;
  }

  async delete(id: string): Promise<void> {
    await this.client.execute("DELETE FROM tags WHERE id = ?", [id]);
  }

  async findById(id: string): Promise<TagEntity | null> {
    const rows = await this.client.select<SqliteTagRow>("SELECT * FROM tags WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? mapTagRow(rows[0]) : null;
  }

  async findByName(name: string): Promise<TagEntity | null> {
    const rows = await this.client.select<SqliteTagRow>("SELECT * FROM tags WHERE name = ? LIMIT 1", [name]);
    return rows[0] ? mapTagRow(rows[0]) : null;
  }

  async list(): Promise<TagEntity[]> {
    const rows = await this.client.select<SqliteTagRow>("SELECT * FROM tags ORDER BY sort_order ASC, name ASC");
    return rows.map(mapTagRow);
  }

  async listWithCounts(includeCompleted = false): Promise<TagCountItem[]> {
    const rows = await this.client.select<SqliteTagRow & { tag_count: number }>(
      `
        SELECT
          t.*,
          (
            SELECT COUNT(DISTINCT rt.record_id)
            FROM record_tags rt
            JOIN records r ON r.id = rt.record_id
            WHERE
              rt.tag_id = t.id
              AND r.deleted_at IS NULL
              AND (? = 1 OR r.status NOT IN ('已完成', '已归档'))
          ) AS tag_count
        FROM tags t
        ORDER BY t.sort_order ASC, t.name ASC
      `,
      [includeCompleted ? 1 : 0],
    );

    return rows.map((row) => ({
      ...mapTagRow(row),
      count: row.tag_count ?? 0,
    }));
  }
}
