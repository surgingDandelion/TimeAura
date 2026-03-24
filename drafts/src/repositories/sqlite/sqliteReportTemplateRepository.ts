import type { ReportTemplateRepository } from "../reportTemplateRepository";

import type { ReportTemplateEntity, ReportTemplateType } from "../../types/index";

import { SqliteClient } from "./sqliteClient";
import { mapReportTemplateRow, serializeBoolean, serializeJson, type SqliteReportTemplateRow } from "./sqliteMappers";

export class SqliteReportTemplateRepository implements ReportTemplateRepository {
  constructor(private readonly client: SqliteClient) {}

  async insert(template: ReportTemplateEntity): Promise<void> {
    await this.client.execute(
      `
        INSERT INTO report_templates (
          id, template_type, name, tone, sections_json, prompt_prefix,
          is_builtin, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        template.id,
        template.templateType,
        template.name,
        template.tone,
        serializeJson(template.sections),
        template.promptPrefix,
        serializeBoolean(template.isBuiltin),
        template.createdAt,
        template.updatedAt,
      ],
    );
  }

  async update(id: string, patch: Partial<ReportTemplateEntity>): Promise<ReportTemplateEntity> {
    const current = await this.findById(id);

    if (!current) {
      throw new Error(`Template not found: ${id}`);
    }

    const next: ReportTemplateEntity = {
      ...current,
      ...patch,
    };

    await this.client.execute(
      `
        UPDATE report_templates
        SET
          template_type = ?,
          name = ?,
          tone = ?,
          sections_json = ?,
          prompt_prefix = ?,
          is_builtin = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        next.templateType,
        next.name,
        next.tone,
        serializeJson(next.sections),
        next.promptPrefix,
        serializeBoolean(next.isBuiltin),
        next.updatedAt,
        id,
      ],
    );

    return next;
  }

  async delete(id: string): Promise<void> {
    await this.client.execute("DELETE FROM report_templates WHERE id = ?", [id]);
  }

  async findById(id: string): Promise<ReportTemplateEntity | null> {
    const rows = await this.client.select<SqliteReportTemplateRow>(
      "SELECT * FROM report_templates WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? mapReportTemplateRow(rows[0]) : null;
  }

  async list(type?: ReportTemplateType): Promise<ReportTemplateEntity[]> {
    const rows = type
      ? await this.client.select<SqliteReportTemplateRow>(
          "SELECT * FROM report_templates WHERE template_type = ? ORDER BY is_builtin DESC, updated_at DESC",
          [type],
        )
      : await this.client.select<SqliteReportTemplateRow>(
          "SELECT * FROM report_templates ORDER BY template_type ASC, is_builtin DESC, updated_at DESC",
        );

    return rows.map(mapReportTemplateRow);
  }
}
