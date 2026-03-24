import type { ReportTemplateEntity, ReportTemplateType } from "../types/index";

export interface CreateTemplateInput {
  templateType: ReportTemplateType;
  name: string;
  tone: string;
  sections: string[];
  promptPrefix?: string;
}

export interface UpdateTemplatePatch extends Partial<CreateTemplateInput> {}

export interface TemplateService {
  listTemplates(type?: ReportTemplateType): Promise<ReportTemplateEntity[]>;
  getTemplateById(id: string): Promise<ReportTemplateEntity | null>;
  createTemplate(input: CreateTemplateInput): Promise<ReportTemplateEntity>;
  updateTemplate(id: string, patch: UpdateTemplatePatch): Promise<ReportTemplateEntity>;
  deleteTemplate(id: string): Promise<void>;
}
