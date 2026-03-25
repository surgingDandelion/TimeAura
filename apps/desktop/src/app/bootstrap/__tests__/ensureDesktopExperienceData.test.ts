import { describe, expect, it, vi } from "vitest";

import type { AppServices, CreateChannelInput, CreateRecordInput, CreateTagInput, RecordEntity, TagEntity } from "@timeaura-core";

import { ensureDesktopExperienceData } from "../ensureDesktopExperienceData";

describe("ensureDesktopExperienceData", () => {
  it("seeds demo records, tags, and a channel for an empty sqlite workspace", async () => {
    const createRecord = vi.fn(async (input: CreateRecordInput): Promise<RecordEntity> => ({
      id: `record-${input.title}`,
      recordKind: input.recordKind ?? "task",
      title: input.title,
      contentMarkdown: input.contentMarkdown ?? "",
      contentPlain: input.title,
      status: input.status ?? "未开始",
      priority: input.priority ?? "P3",
      tags: input.tags ?? [],
      dueAt: input.dueAt ?? null,
      plannedAt: input.plannedAt ?? null,
      completedAt: null,
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-03-25T10:00:00.000Z",
      archivedAt: null,
      deletedAt: null,
      sourceReportHistoryId: null,
      aiSummary: null,
      isPinned: false,
    }));
    const createTag = vi.fn(async (input: CreateTagInput): Promise<TagEntity> => ({
      id: `tag-${input.name}`,
      name: input.name,
      color: input.color,
      isSystem: false,
      sortOrder: 0,
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-03-25T10:00:00.000Z",
    }));
    const createChannel = vi.fn(async (input: CreateChannelInput) => ({
      id: "channel-demo",
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      model: input.model,
      temperature: input.temperature ?? 0.3,
      maxTokens: input.maxTokens ?? null,
      timeoutMs: input.timeoutMs ?? 60000,
      systemPrompt: input.systemPrompt ?? "",
      defaultLanguage: input.defaultLanguage ?? "zh-CN",
      enabled: input.enabled ?? true,
      allowFallback: input.allowFallback ?? true,
      apiKeyRef: null,
      providerOptions: input.providerOptions ?? {},
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-03-25T10:00:00.000Z",
    }));
    const setSetting = vi.fn(async () => undefined);
    const setAbilityChannel = vi.fn(async () => undefined);
    const setDefaultChannel = vi.fn(async () => undefined);

    const services = {
      recordService: {
        listRecords: vi.fn(async () => ({ items: [], total: 0 })),
        createRecord,
      },
      tagService: {
        listTags: vi.fn(async () => []),
        createTag,
      },
      channelService: {
        listChannels: vi.fn(async () => []),
        createChannel,
        setAbilityChannel,
        setDefaultChannel,
      },
      settingsService: {
        getSetting: vi.fn(async () => null),
        setSetting,
      },
    } as unknown as AppServices;

    const result = await ensureDesktopExperienceData(services);

    expect(result.seeded).toBe(true);
    expect(createTag).toHaveBeenCalledTimes(3);
    expect(createRecord).toHaveBeenCalledTimes(4);
    expect(createChannel).toHaveBeenCalledTimes(1);
    expect(setAbilityChannel).toHaveBeenCalledTimes(4);
    expect(setDefaultChannel).toHaveBeenCalledWith("channel-demo");
    expect(setSetting).toHaveBeenCalledWith("desktopExperienceSeeded", true);
  });

  it("skips seeding when the workspace was already initialized", async () => {
    const createTag = vi.fn(async (input: CreateTagInput): Promise<TagEntity> => ({
      id: `tag-${input.name}`,
      name: input.name,
      color: input.color,
      isSystem: false,
      sortOrder: 0,
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-03-25T10:00:00.000Z",
    }));
    const createChannel = vi.fn(async (input: CreateChannelInput) => ({
      id: "channel-demo",
      name: input.name,
      providerType: input.providerType,
      baseUrl: input.baseUrl,
      model: input.model,
      temperature: input.temperature ?? 0.3,
      maxTokens: input.maxTokens ?? null,
      timeoutMs: input.timeoutMs ?? 60000,
      systemPrompt: input.systemPrompt ?? "",
      defaultLanguage: input.defaultLanguage ?? "zh-CN",
      enabled: input.enabled ?? true,
      allowFallback: input.allowFallback ?? true,
      apiKeyRef: null,
      providerOptions: input.providerOptions ?? {},
      createdAt: "2026-03-25T10:00:00.000Z",
      updatedAt: "2026-03-25T10:00:00.000Z",
    }));
    const setAbilityChannel = vi.fn(async () => undefined);
    const setDefaultChannel = vi.fn(async () => undefined);
    const services = {
      recordService: {
        listRecords: vi.fn(async () => ({
          items: [
            {
              id: "record-existing",
              recordKind: "task",
              title: "已有记录",
              contentMarkdown: "",
              contentPlain: "已有记录",
              status: "未开始",
              priority: "P3",
              tags: ["tag_uncategorized"],
              dueAt: null,
              plannedAt: null,
              completedAt: null,
              createdAt: "2026-03-25T10:00:00.000Z",
              updatedAt: "2026-03-25T10:00:00.000Z",
              archivedAt: null,
              deletedAt: null,
              sourceReportHistoryId: null,
              aiSummary: null,
              isPinned: false,
            },
          ],
          total: 1,
        })),
      },
      tagService: {
        listTags: vi.fn(async () => [
          {
            id: "tag_uncategorized",
            name: "未分类",
            color: "#97a6b8",
            isSystem: true,
            sortOrder: 9999,
            createdAt: "2026-03-25T10:00:00.000Z",
            updatedAt: "2026-03-25T10:00:00.000Z",
          },
        ]),
        createTag,
      },
      channelService: {
        listChannels: vi.fn(async () => []),
        createChannel,
        setAbilityChannel,
        setDefaultChannel,
      },
      settingsService: {
        getSetting: vi.fn(async () => null),
        setSetting: vi.fn(async () => undefined),
      },
    } as unknown as AppServices;

    const result = await ensureDesktopExperienceData(services);

    expect(result.seeded).toBe(true);
    expect(result.recordIds).toEqual(["record-existing"]);
    expect(result.channelId).toBe("channel-demo");
    expect(createTag).toHaveBeenCalledTimes(3);
    expect(createChannel).toHaveBeenCalledTimes(1);
    expect(setAbilityChannel).toHaveBeenCalledTimes(4);
    expect(setDefaultChannel).toHaveBeenCalledWith("channel-demo");
    expect(services.settingsService.setSetting).toHaveBeenCalledWith("desktopExperienceSeeded", true);
  });
});
