import type { ReportTemplateEntity, ReportTemplateType } from "../types/index";

export interface ReportTemplateRepository {
  insert(template: ReportTemplateEntity): Promise<void>;
  update(id: string, patch: Partial<ReportTemplateEntity>): Promise<ReportTemplateEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<ReportTemplateEntity | null>;
  list(type?: ReportTemplateType): Promise<ReportTemplateEntity[]>;
}
