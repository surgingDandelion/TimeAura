import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AIAbilityKey,
  AIChannelEntity,
  AbilityMappingEntity,
  AppContainer,
  ChannelService,
} from "@timeaura-core";

import { ChannelStudioPage } from "../ChannelStudioPage";

const useAppServicesSpy = vi.fn();

vi.mock("../../../app/providers/AppServicesProvider", () => ({
  useAppServices: () => useAppServicesSpy(),
}));

function createChannel(overrides: Partial<AIChannelEntity> = {}): AIChannelEntity {
  return {
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
    ...overrides,
  };
}

function createAppContainerMock() {
  let channels: AIChannelEntity[] = [
    createChannel(),
    createChannel({
      id: "channel-claude",
      name: "Claude 线路",
      providerType: "anthropic",
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet-4",
      apiKeyRef: null,
      providerOptions: {
        apiVersion: "2023-06-01",
      },
    }),
  ];
  let defaultChannelId: string | null = "channel-openai";
  let mappings: AbilityMappingEntity[] = [
    {
      abilityKey: "summary",
      channelId: "channel-openai",
      updatedAt: "2026-01-01T09:00:00.000Z",
    },
  ];
  const secretIds = new Set<string>(["channel-openai"]);

  const channelService = {
    listChannels: vi.fn(async () => channels),
    listEnabledChannels: vi.fn(async () => channels.filter((item) => item.enabled)),
    getChannelById: vi.fn(async (id: string) => channels.find((item) => item.id === id) ?? null),
    getDefaultChannelId: vi.fn(async () => defaultChannelId),
    hasChannelSecret: vi.fn(async (id: string) => secretIds.has(id)),
    createChannel: vi.fn(async (input) => {
      const created = createChannel({
        id: "channel-created",
        name: input.name,
        providerType: input.providerType,
        baseUrl: input.baseUrl,
        model: input.model,
        temperature: input.temperature ?? 0.3,
        maxTokens: input.maxTokens ?? 4096,
        timeoutMs: input.timeoutMs ?? 60000,
        systemPrompt: input.systemPrompt ?? "",
        defaultLanguage: input.defaultLanguage ?? "zh-CN",
        enabled: input.enabled ?? true,
        allowFallback: input.allowFallback ?? true,
        apiKeyRef: null,
        providerOptions: input.providerOptions ?? {},
      });
      channels = [created, ...channels];
      return created;
    }),
    updateChannel: vi.fn(async (id, patch) => {
      const current = channels.find((item) => item.id === id);
      if (!current) {
        throw new Error("not found");
      }

      const next = {
        ...current,
        ...patch,
        providerOptions: {
          ...current.providerOptions,
          ...(patch.providerOptions ?? {}),
        },
      };
      channels = channels.map((item) => (item.id === id ? next : item));
      return next;
    }),
    duplicateChannel: vi.fn(async (id: string) => {
      const current = channels.find((item) => item.id === id);
      if (!current) {
        throw new Error("not found");
      }

      const duplicated = {
        ...current,
        id: `${id}-copy`,
        name: `${current.name} 副本`,
        apiKeyRef: null,
      };
      channels = [duplicated, ...channels];
      return duplicated;
    }),
    deleteChannel: vi.fn(async (id: string) => {
      channels = channels.filter((item) => item.id !== id);
      secretIds.delete(id);
      mappings = mappings.filter((item) => item.channelId !== id);
      if (defaultChannelId === id) {
        defaultChannelId = channels[0]?.id ?? null;
      }
    }),
    setDefaultChannel: vi.fn(async (id: string | null) => {
      defaultChannelId = id;
    }),
    toggleChannel: vi.fn(async (id: string, enabled: boolean) => {
      const current = channels.find((item) => item.id === id);
      if (!current) {
        throw new Error("not found");
      }

      const next = {
        ...current,
        enabled,
      };
      channels = channels.map((item) => (item.id === id ? next : item));
      return next;
    }),
    setChannelApiKey: vi.fn(async (id: string, _apiKey: string) => {
      secretIds.add(id);
      const current = channels.find((item) => item.id === id);
      if (!current) {
        throw new Error("not found");
      }

      const next = {
        ...current,
        apiKeyRef: `secret-${id}`,
      };
      channels = channels.map((item) => (item.id === id ? next : item));
      return next;
    }),
    clearChannelApiKey: vi.fn(async (id: string) => {
      secretIds.delete(id);
      const current = channels.find((item) => item.id === id);
      if (!current) {
        throw new Error("not found");
      }

      const next = {
        ...current,
        apiKeyRef: null,
      };
      channels = channels.map((item) => (item.id === id ? next : item));
      return next;
    }),
    testChannel: vi.fn(async (id: string) => ({
      ok: true,
      message: `通道 ${id} 握手完成`,
      latencyMs: 820,
    })),
    listAbilityMappings: vi.fn(async () => mappings),
    setAbilityChannel: vi.fn(async (abilityKey: AIAbilityKey, channelId: string) => {
      mappings = [
        ...mappings.filter((item) => item.abilityKey !== abilityKey),
        {
          abilityKey,
          channelId,
          updatedAt: "2026-01-01T10:00:00.000Z",
        },
      ];
    }),
    clearAbilityChannel: vi.fn(async (abilityKey: AIAbilityKey) => {
      mappings = mappings.filter((item) => item.abilityKey !== abilityKey);
    }),
  } satisfies ChannelService;

  const container = {
    services: {
      channelService,
    },
  } as unknown as AppContainer;

  return { container, channelService };
}

describe("ChannelStudioPage", () => {
  beforeEach(() => {
    useAppServicesSpy.mockReset();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("supports channel testing, default-channel switch, duplication, deletion, and ability mapping", async () => {
    const { container, channelService } = createAppContainerMock();
    useAppServicesSpy.mockReturnValue(container);

    render(<ChannelStudioPage />);

    await waitFor(() => {
      expect(screen.getByText("通道配置中心")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "主通道" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));

    await waitFor(() => {
      expect(channelService.testChannel).toHaveBeenCalledWith("channel-openai");
      expect(screen.getByText("通道连接成功")).toBeTruthy();
      expect(screen.getByText("通道 channel-openai 握手完成")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /Claude 线路/ }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Claude 线路" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "设为默认" }));

    await waitFor(() => {
      expect(channelService.setDefaultChannel).toHaveBeenCalledWith("channel-claude");
      expect(screen.getByText("已设为默认通道")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "复制" }));

    await waitFor(() => {
      expect(channelService.duplicateChannel).toHaveBeenCalledWith("channel-claude");
      expect(screen.getByRole("heading", { name: "Claude 线路 副本" })).toBeTruthy();
    });

    const summaryMappingCard = screen.getByText("AI 摘要").closest(".mapping-card");
    expect(summaryMappingCard).toBeTruthy();
    fireEvent.change(within(summaryMappingCard as HTMLElement).getByRole("combobox"), {
      target: { value: "channel-claude" },
    });

    await waitFor(() => {
      expect(channelService.setAbilityChannel).toHaveBeenCalledWith("summary", "channel-claude");
      expect(within(summaryMappingCard as HTMLElement).getByDisplayValue("Claude 线路")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    await waitFor(() => {
      expect(channelService.deleteChannel).toHaveBeenCalledWith("channel-claude-copy");
      expect(screen.queryByText("Claude 线路 副本")).toBeNull();
    });
  });

  it("supports provider-specific validation and Stronghold credential save/clear flows", async () => {
    const { container, channelService } = createAppContainerMock();
    useAppServicesSpy.mockReturnValue(container);

    render(<ChannelStudioPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "主通道" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Aggregator" }));

    await waitFor(() => {
      expect(screen.getByText("附加请求头")).toBeTruthy();
    });

    const headersInput = screen.getByDisplayValue(/HTTP-Referer/);
    fireEvent.change(headersInput, {
      target: {
        value: "{",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("附加请求头 JSON 解析失败")).toBeTruthy();
      expect((screen.getByRole("button", { name: "保存配置" }) as HTMLButtonElement).disabled).toBe(true);
    });

    fireEvent.change(headersInput, {
      target: {
        value: '{\n  "HTTP-Referer": "https://timeaura.app"\n}',
      },
    });

    const apiKeyInput = screen.getByPlaceholderText("输入新的 API Key 后点击保存");
    fireEvent.change(apiKeyInput, {
      target: {
        value: "sk-live-demo",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存 Key" }));

    await waitFor(() => {
      expect(channelService.setChannelApiKey).toHaveBeenCalledWith("channel-openai", "sk-live-demo");
      expect(screen.getByText("API Key 已写入 Stronghold")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "清除 Key" }));

    await waitFor(() => {
      expect(channelService.clearChannelApiKey).toHaveBeenCalledWith("channel-openai");
      expect(screen.getByText("API Key 已清除")).toBeTruthy();
    });
  });
});
