import type { ReportTemplateEntity } from "../types/index";

export const reportTemplatesMock: ReportTemplateEntity[] = [
  {
    id: "tpl_weekly_default",
    templateType: "weekly",
    name: "标准周报模板",
    tone: "专业、简洁、可汇报",
    sections: ["本周期完成事项", "本周期推进中事项", "风险与阻塞", "下一阶段计划"],
    promptPrefix: "请基于输入记录生成一份条理清晰的周报。",
    isBuiltin: true,
    createdAt: "2026-03-24T09:00:00+08:00",
    updatedAt: "2026-03-24T09:00:00+08:00",
  },
  {
    id: "tpl_monthly_default",
    templateType: "monthly",
    name: "标准月报模板",
    tone: "复盘感、结构化、适合月度汇报",
    sections: ["本周期关键成果", "数据与里程碑", "复盘与问题", "下一阶段重点"],
    promptPrefix: "请基于输入记录生成一份结构清晰的月报。",
    isBuiltin: true,
    createdAt: "2026-03-24T09:00:00+08:00",
    updatedAt: "2026-03-24T09:00:00+08:00",
  },
];
