import type { CreateTemplateInput, TemplateService, UpdateTemplatePatch } from "../templateService";

import type { ReportTemplateRepository } from "../../repositories/index";
import type { ReportTemplateEntity, ReportTemplateType } from "../../types/index";

import { createMockId } from "../../mock/index";

export class MockTemplateService implements TemplateService {
  constructor(private readonly templateRepository: ReportTemplateRepository, private readonly now: () => string) {}

  async listTemplates(type?: ReportTemplateType): Promise<ReportTemplateEntity[]> {
    return this.templateRepository.list(type);
  }

  async getTemplateById(id: string): Promise<ReportTemplateEntity | null> {
    return this.templateRepository.findById(id);
  }

  async createTemplate(input: CreateTemplateInput): Promise<ReportTemplateEntity> {
    const timestamp = this.now();
    const template: ReportTemplateEntity = {
      id: createMockId("tpl"),
      templateType: input.templateType,
      name: input.name.trim(),
      tone: input.tone.trim(),
      sections: input.sections,
      promptPrefix: input.promptPrefix ?? "",
      isBuiltin: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.templateRepository.insert(template);
    return template;
  }

  async updateTemplate(id: string, patch: UpdateTemplatePatch): Promise<ReportTemplateEntity> {
    return this.templateRepository.update(id, {
      ...patch,
      updatedAt: this.now(),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.templateRepository.findById(id);

    if (template?.isBuiltin) {
      throw new Error("Builtin template cannot be deleted");
    }

    await this.templateRepository.delete(id);
  }
}
