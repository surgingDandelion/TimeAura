import type { RecordTagRepository } from "../recordTagRepository";

import { SqliteClient } from "./sqliteClient";

export class SqliteRecordTagRepository implements RecordTagRepository {
  constructor(private readonly client: SqliteClient) {}

  async bind(recordId: string, tagId: string, createdAt: string): Promise<void> {
    await this.client.execute(
      "INSERT OR IGNORE INTO record_tags (record_id, tag_id, created_at) VALUES (?, ?, ?)",
      [recordId, tagId, createdAt],
    );
  }

  async unbind(recordId: string, tagId: string): Promise<void> {
    await this.client.execute("DELETE FROM record_tags WHERE record_id = ? AND tag_id = ?", [recordId, tagId]);
  }

  async replaceRecordTags(recordId: string, tagIds: string[], createdAt: string): Promise<void> {
    await this.client.transaction(async (tx) => {
      await tx.execute("DELETE FROM record_tags WHERE record_id = ?", [recordId]);

      for (const tagId of tagIds) {
        await tx.execute(
          "INSERT INTO record_tags (record_id, tag_id, created_at) VALUES (?, ?, ?)",
          [recordId, tagId, createdAt],
        );
      }
    });
  }

  async listTagIdsByRecordId(recordId: string): Promise<string[]> {
    const rows = await this.client.select<{ tag_id: string }>(
      "SELECT tag_id FROM record_tags WHERE record_id = ? ORDER BY created_at ASC",
      [recordId],
    );
    return rows.map((row) => row.tag_id);
  }

  async listRecordIdsByTagId(tagId: string): Promise<string[]> {
    const rows = await this.client.select<{ record_id: string }>(
      "SELECT record_id FROM record_tags WHERE tag_id = ? ORDER BY created_at ASC",
      [tagId],
    );
    return rows.map((row) => row.record_id);
  }
}
