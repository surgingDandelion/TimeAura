import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AIChannelEntity,
  AppContainer,
  GenerateReportInput,
  RecordEntity,
  ReportDraftResult,
  ReportHistoryEntity,
  ReportService,
  ReportTemplateEntity,
  TagEntity,
  TemplateService,
} from "@timeaura-core";

import { ReportStudioPage } from "../ReportStudioPage";

const useAppServicesSpy = vi.fn();

vi.mock("../../../app/providers/AppServicesProvider", () => ({
  useAppServices: () => useAppServicesSpy(),
}));

function createTemplate(overrides: Partial<ReportTemplateEntity> = {}): ReportTemplateEntity {
  return {
    id: "tpl-weekly",
    templateType: "weekly",
    name: "默认周报模板",
    tone: "professional",
    sections: ["本周重点", "风险项"],
    promptPrefix: "",
    isBuiltin: true,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T09:00:00.000Z",
    ...overrides,
  };
}

function createHistory(overrides: Partial<ReportHistoryEntity> = {}): ReportHistoryEntity {
  return {
    id: "history-1",
    reportType: "weekly",
    templateId: "tpl-weekly",
    channelId: "channel-openai",
    title: "2026 第 12 周周报",
    timeRangeStart: "2026-03-10T00:00:00.000Z",
    timeRangeEnd: "2026-03-17T00:00:00.000Z",
    tagFilter: null,
    statusFilter: "all",
    sourceRecordIds: ["record-1", "record-2"],
    contentMarkdown: "# 历史报告\n\n- 已保存",
    savedRecordId: null,
    createdAt: "2026-03-18T09:00:00.000Z",
    updatedAt: "2026-03-18T09:00:00.000Z",
    ...overrides,
  };
}

function createRecord(overrides: Partial<RecordEntity> = {}): RecordEntity {
  return {
    id: "record-report",
    recordKind: "note",
    title: "已保存报告",
    contentMarkdown: "# 已保存报告",
    contentPlain: "已保存报告",
    status: "未开始",
    priority: "P3",
    tags: [],
    dueAt: null,
    plannedAt: null,
    completedAt: null,
    createdAt: "2026-03-18T09:00:00.000Z",
    updatedAt: "2026-03-18T09:00:00.000Z",
    archivedAt: null,
    deletedAt: null,
    sourceReportHistoryId: "history-2",
    aiSummary: null,
    isPinned: false,
    ...overrides,
  };
}

function createAppContainerMock() {
  let histories: ReportHistoryEntity[] = [createHistory()];
  const templates: ReportTemplateEntity[] = [
    createTemplate(),
    createTemplate({
      id: "tpl-monthly",
      templateType: "monthly",
      name: "默认月报模板",
    }),
  ];
  const channels: AIChannelEntity[] = [
    {
      id: "channel-openai",
      name: "主通道",
      providerType: "openai_compatible",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1-mini",
      temperature: 0.3,
      maxTokens: 4096,
      timeoutMs: 60000,
      systemPrompt: "",
      defaultLanguage: "zh-CN",
      enabled: true,
      allowFallback: true,
      apiKeyRef: "secret-main",
      providerOptions: {
        endpointPath: "/chat/completions",
      },
      createdAt: "2026-01-01T09:00:00.000Z",
      updatedAt: "2026-01-01T09:00:00.000Z",
    },
  ];
  const tags: TagEntity[] = [
    {
      id: "tag-work",
      name: "工作",
      color: "#5f89ff",
      isSystem: false,
      sortOrder: 0,
      createdAt: "2026-01-01T09:00:00.000Z",
      updatedAt: "2026-01-01T09:00:00.000Z",
    },
  ];
  const generatedDraft: ReportDraftResult = {
    title: "2026 第 12 周周报草稿",
    contentMarkdown: "# 本周回顾\n\n- 完成重点工作",
    sourceRecordIds: ["record-1", "record-2"],
    channelId: "channel-openai",
    fallbackUsed: false,
  };
  const generateReportSpy = vi.fn(async (_input: GenerateReportInput) => generatedDraft);

  const reportService = {
    generateReport: generateReportSpy,
    saveReportHistory: vi.fn(async (input) => {
      const history = createHistory({
        id: "history-2",
        title: input.title,
        reportType: input.reportType,
        templateId: input.templateId,
        channelId: input.channelId,
        timeRangeStart: input.timeRangeStart,
        timeRangeEnd: input.timeRangeEnd,
        tagFilter: input.tagFilter,
        statusFilter: input.statusFilter,
        sourceRecordIds: input.sourceRecordIds,
        contentMarkdown: input.contentMarkdown,
        createdAt: "2026-03-25T10:00:00.000Z",
        updatedAt: "2026-03-25T10:00:00.000Z",
      });
      histories = [history, ...histories];
      return history;
    }),
    saveReportAsRecord: vi.fn(async () => createRecord()),
    listReportHistories: vi.fn(async () => histories),
    getReportHistoryById: vi.fn(async (id: string) => histories.find((item) => item.id === id) ?? null),
  } satisfies ReportService;

  const templateService = {
    listTemplates: vi.fn(async () => templates),
    getTemplateById: vi.fn(async (id: string) => templates.find((item) => item.id === id) ?? null),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  } satisfies TemplateService;

  const container = {
    services: {
      templateService,
      channelService: {
        listChannels: vi.fn(async () => channels),
      },
      tagService: {
        listTags: vi.fn(async () => tags),
      },
      reportService,
    },
  } as unknown as AppContainer;

  return {
    container,
    reportService,
    generateReportSpy,
  };
}

describe("ReportStudioPage", () => {
  beforeEach(() => {
    useAppServicesSpy.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates report drafts with the selected filters and date range", async () => {
    const { container, reportService, generateReportSpy } = createAppContainerMock();
    useAppServicesSpy.mockReturnValue(container);

    render(<ReportStudioPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "AI 报告" })).toBeTruthy();
      expect(screen.getByDisplayValue("默认周报模板")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("标签范围"), {
      target: { value: "tag-work" },
    });
    fireEvent.change(screen.getByLabelText("状态范围"), {
      target: { value: "todo" },
    });
    fireEvent.change(screen.getByLabelText("开始时间"), {
      target: { value: "2026-03-10" },
    });
    fireEvent.change(screen.getByLabelText("结束时间"), {
      target: { value: "2026-03-17" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成草稿" }));

    await waitFor(() => {
      expect(reportService.generateReport).toHaveBeenCalledTimes(1);
      const generateInput = generateReportSpy.mock.calls[0]?.[0] as GenerateReportInput | undefined;
      expect(generateInput).toMatchObject({
        reportType: "weekly",
        templateId: "tpl-weekly",
        tagFilter: "tag-work",
        statusFilter: "todo",
      });
      expect(screen.getByText("报告草稿已生成")).toBeTruthy();
      expect(screen.getByText(/完成重点工作/)).toBeTruthy();
    });

    const generateInput = generateReportSpy.mock.calls[0]?.[0] as GenerateReportInput | undefined;
    expect(generateInput?.timeRangeStart).toContain("2026-03-10");
    expect(generateInput?.timeRangeEnd).toContain("2026-03-17");
  });

  it("saves generated drafts into history and supports saving them as records", async () => {
    const { container, reportService } = createAppContainerMock();
    useAppServicesSpy.mockReturnValue(container);

    render(<ReportStudioPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "生成草稿" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "生成草稿" }));

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "保存历史" }) as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(screen.getByRole("button", { name: "保存历史" }));

    await waitFor(() => {
      expect(reportService.saveReportHistory).toHaveBeenCalledTimes(1);
      expect(screen.getByText("报告历史已保存")).toBeTruthy();
      expect(screen.getByText("2026 第 12 周周报草稿")).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "存为记录" })[1] as HTMLButtonElement);

    await waitFor(() => {
      expect(reportService.saveReportAsRecord).toHaveBeenCalledWith("history-2");
      expect(screen.getByText("报告已保存为记录")).toBeTruthy();
    });
  });
});
