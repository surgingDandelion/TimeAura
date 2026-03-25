import type { AppServices, CreateChannelInput, CreateTagInput, RecordEntity, TagEntity } from "@timeaura-core";

const EXPERIENCE_SEED_SETTING_KEY = "desktopExperienceSeeded";

interface ExperienceSeedResult {
  seeded: boolean;
  recordIds: string[];
  channelId: string | null;
}

export async function ensureDesktopExperienceData(services: AppServices): Promise<ExperienceSeedResult> {
  const alreadySeeded = await services.settingsService.getSetting<boolean>(EXPERIENCE_SEED_SETTING_KEY);

  if (alreadySeeded) {
    return {
      seeded: false,
      recordIds: [],
      channelId: null,
    };
  }

  const [allRecords, channels, tags] = await Promise.all([
    services.recordService.listRecords({ view: "all", status: "all" }),
    services.channelService.listChannels(),
    services.tagService.listTags(),
  ]);

  if (allRecords.total > 0 || channels.length > 0) {
    await services.settingsService.setSetting(EXPERIENCE_SEED_SETTING_KEY, true);
    return {
      seeded: false,
      recordIds: [],
      channelId: null,
    };
  }

  const tagMap = await ensurePrototypeTags(services, tags);
  const records = await createPrototypeRecords(services, tagMap);
  const channel = await createPrototypeChannel(services);

  await services.settingsService.setSetting(EXPERIENCE_SEED_SETTING_KEY, true);

  return {
    seeded: true,
    recordIds: records.map((record) => record.id),
    channelId: channel?.id ?? null,
  };
}

async function ensurePrototypeTags(
  services: AppServices,
  tags: TagEntity[],
): Promise<Record<"work" | "life" | "ai", TagEntity>> {
  const ensuredTags = { ...indexTagsByName(tags) };

  if (!ensuredTags.work) {
    ensuredTags.work = await services.tagService.createTag({
      name: "工作",
      color: "#5b7cff",
    });
  }

  if (!ensuredTags.life) {
    ensuredTags.life = await services.tagService.createTag({
      name: "生活",
      color: "#2f9e74",
    });
  }

  if (!ensuredTags.ai) {
    ensuredTags.ai = await services.tagService.createTag({
      name: "AI",
      color: "#ff8a4c",
    });
  }

  return ensuredTags as Record<"work" | "life" | "ai", TagEntity>;
}

async function createPrototypeRecords(
  services: AppServices,
  tagMap: Record<"work" | "life" | "ai", TagEntity>,
): Promise<RecordEntity[]> {
  const now = new Date();
  const todayDue = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
  const todayPlan = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
  const tomorrowMorning = createFutureDate(now, 1, 9, 0);
  const tomorrowEvening = createFutureDate(now, 1, 20, 0);
  const nextWeek = createFutureDate(now, 5, 10, 30);

  return Promise.all([
    services.recordService.createRecord({
      title: "今天 18:00 前确认周报重点",
      priority: "P1",
      status: "进行中",
      plannedAt: todayPlan,
      dueAt: todayDue,
      tags: [tagMap.work.id, tagMap.ai.id],
      contentMarkdown: "补齐本周关键进展，并确认 AI 周报模板是否需要调整。",
    }),
    services.recordService.createRecord({
      title: "为积压任务做一轮统一改期",
      priority: "P2",
      status: "未开始",
      plannedAt: tomorrowMorning,
      dueAt: tomorrowEvening,
      tags: [tagMap.work.id],
      contentMarkdown: "打开提醒条，验证“仅改选中”和自定义改期流程。",
    }),
    services.recordService.createRecord({
      title: "整理本地模型通道的测试结论",
      priority: "P3",
      status: "未开始",
      plannedAt: nextWeek,
      dueAt: nextWeek,
      tags: [tagMap.ai.id],
      contentMarkdown: "记录 Local Gateway 与 Aggregator 的配置差异，方便后续接真实服务。",
    }),
    services.recordService.createRecord({
      title: "补一条生活类提醒样例",
      priority: "P4",
      status: "未开始",
      plannedAt: tomorrowMorning,
      dueAt: tomorrowMorning,
      tags: [tagMap.life.id],
      contentMarkdown: "用于检查标签导航、颜色状态和提醒条是否都能覆盖非工作场景。",
    }),
  ]);
}

async function createPrototypeChannel(services: AppServices) {
  const input: CreateChannelInput = {
    name: "TimeAura 演示通道",
    providerType: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxTokens: 4096,
    timeoutMs: 60000,
    systemPrompt: "你是 TimeAura 的 AI 助理，输出简洁、结构清晰、适合中文工作流。",
    defaultLanguage: "zh-CN",
    enabled: true,
    allowFallback: true,
    providerOptions: {
      endpointPath: "/chat/completions",
    },
  };
  const channel = await services.channelService.createChannel(input);

  await Promise.all([
    services.channelService.setDefaultChannel(channel.id),
    services.channelService.setAbilityChannel("summary", channel.id),
    services.channelService.setAbilityChannel("polish", channel.id),
    services.channelService.setAbilityChannel("weekly_report", channel.id),
    services.channelService.setAbilityChannel("monthly_report", channel.id),
  ]);

  return channel;
}

function createFutureDate(base: Date, dayOffset: number, hour: number, minute: number): string {
  const next = new Date(base);
  next.setDate(next.getDate() + dayOffset);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
}

function indexTagsByName(tags: TagEntity[]): Partial<Record<"work" | "life" | "ai", TagEntity>> {
  const result: Partial<Record<"work" | "life" | "ai", TagEntity>> = {};

  for (const tag of tags) {
    if (tag.name === "工作") {
      result.work = tag;
    } else if (tag.name === "生活") {
      result.life = tag;
    } else if (tag.name === "AI") {
      result.ai = tag;
    }
  }

  return result;
}

export const DESKTOP_EXPERIENCE_SEED_TAGS: CreateTagInput[] = [
  { name: "工作", color: "#5b7cff" },
  { name: "生活", color: "#2f9e74" },
  { name: "AI", color: "#ff8a4c" },
];
