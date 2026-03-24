import type { ReportHistoryEntity } from "../types";

export const reportHistoriesMock: ReportHistoryEntity[] = [
  {
    id: "report_history_weekly_001",
    reportType: "weekly",
    templateId: "tpl_weekly_default",
    channelId: "channel_reports",
    title: "2026 第 13 周工作周报",
    timeRangeStart: "2026-03-18T00:00:00+08:00",
    timeRangeEnd: "2026-03-24T23:59:59+08:00",
    tagFilter: null,
    statusFilter: "all",
    sourceRecordIds: ["record_001", "record_002", "record_003"],
    contentMarkdown:
      "# 本周工作周报\n\n## 本周期完成事项\n- 对齐算子\n- 周报草稿整理\n\n## 风险与阻塞\n- 多个任务截止时间重叠，需调整时间窗口。",
    savedRecordId: null,
    createdAt: "2026-03-24T17:10:00+08:00",
    updatedAt: "2026-03-24T17:15:00+08:00",
  },
];
