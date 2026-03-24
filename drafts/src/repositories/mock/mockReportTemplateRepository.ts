import type { ReportTemplateRepository } from "../reportTemplateRepository";

import type { MockRuntime } from "../../mock/index";
import type { ReportTemplateEntity, ReportTemplateType } from "../../types/index";

import { cloneValue } from "../../mock/index";

export class MockReportTemplateRepository implements ReportTemplateRepository {
  constructor(private readonly runtime: MockRuntime) {}

  async insert(template: ReportTemplateEntity): Promise<void> {
    this.runtime.reportTemplates.push(cloneValue(template));
  }

  async update(id: string, patch: Partial<ReportTemplateEntity>): Promise<ReportTemplateEntity> {
    const template = this.requireTemplate(id);

    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined) {
        (template as Record<string, unknown>)[key] = value;
      }
    });

    return cloneValue(template);
  }

  async delete(id: string): Promise<void> {
    this.runtime.reportTemplates = this.runtime.reportTemplates.filter((item) => item.id !== id);
  }

  async findById(id: string): Promise<ReportTemplateEntity | null> {
    const template = this.runtime.reportTemplates.find((item) => item.id === id);
    return template ? cloneValue(template) : null;
  }

  async list(type?: ReportTemplateType): Promise<ReportTemplateEntity[]> {
    const items = type
      ? this.runtime.reportTemplates.filter((item) => item.templateType === type)
      : this.runtime.reportTemplates;

    return cloneValue(items);
  }

  private requireTemplate(id: string): ReportTemplateEntity {
    const template = this.runtime.reportTemplates.find((item) => item.id === id);

    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return template;
  }
}
