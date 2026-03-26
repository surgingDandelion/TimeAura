import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AIAbilityKey,
  AIChannelEntity,
  AIProviderType,
  CreateChannelInput,
} from "@timeaura-core";

import { useAppServices } from "../../app/providers/AppServicesProvider";

const abilityOptions: Array<{ key: AIAbilityKey; label: string }> = [
  { key: "summary", label: "AI 摘要" },
  { key: "polish", label: "内容润色" },
  { key: "weekly_report", label: "周报生成" },
  { key: "monthly_report", label: "月报生成" },
];

const providerOptions: Array<{
  type: AIProviderType;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    type: "openai_compatible",
    label: "OpenAI Compatible",
    shortLabel: "OpenAI",
    description: "适合 OpenAI 兼容协议、企业网关和通用中转。",
  },
  {
    type: "anthropic",
    label: "Anthropic",
    shortLabel: "Anthropic",
    description: "原生 Claude 协议，支持单独 API Version。",
  },
  {
    type: "azure_openai",
    label: "Azure OpenAI",
    shortLabel: "Azure",
    description: "按资源根地址 + Deployment + API Version 组织请求。",
  },
  {
    type: "local_gateway",
    label: "Local Gateway",
    shortLabel: "Local",
    description: "适合本地推理服务、局域网网关与无 Key 调试链路。",
  },
  {
    type: "aggregator",
    label: "Aggregator",
    shortLabel: "Aggregator",
    description: "适合 OpenRouter 等聚合平台，可附加来源请求头。",
  },
];

interface ChannelDraft {
  name: string;
  providerType: AIProviderType;
  baseUrl: string;
  model: string;
  temperature: string;
  maxTokens: string;
  timeoutMs: string;
  systemPrompt: string;
  defaultLanguage: string;
  enabled: boolean;
  allowFallback: boolean;
  apiVersion: string;
  deployment: string;
  endpointPath: string;
  customHeadersText: string;
}

interface DraftParseResult {
  errors: string[];
  input: CreateChannelInput | null;
}

interface ChannelTestPanelState {
  level: "idle" | "success" | "warning" | "error";
  title: string;
  detail: string;
  latencyMs?: number;
  checkedAt?: string;
}

export function ChannelStudioPage(): JSX.Element {
  const { services } = useAppServices();
  const [channels, setChannels] = useState<AIChannelEntity[]>([]);
  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<AIAbilityKey, string>>({
    summary: "",
    polish: "",
    weekly_report: "",
    monthly_report: "",
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChannelDraft | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testPanel, setTestPanel] = useState<ChannelTestPanelState>({
    level: "idle",
    title: "尚未执行连通性测试",
    detail: "保存配置后点击“测试连接”，可以查看当前通道的握手结果、时延和错误反馈。",
  });

  const selectedChannel = useMemo(
    () => channels.find((item) => item.id === selectedId) ?? null,
    [channels, selectedId],
  );
  const enabledChannels = useMemo(
    () => channels.filter((channel) => channel.enabled),
    [channels],
  );
  const currentProviderOption = useMemo(
    () => providerOptions.find((item) => item.type === draft?.providerType) ?? providerOptions[0],
    [draft?.providerType],
  );
  const draftParseResult = useMemo(
    () => (draft ? parseChannelDraft(draft) : null),
    [draft],
  );

  const loadChannels = useCallback(async () => {
    try {
      const [channelResult, mappingResult, nextDefaultChannelId] = await Promise.all([
        services.channelService.listChannels(),
        services.channelService.listAbilityMappings(),
        services.channelService.getDefaultChannelId(),
      ]);

      setChannels(channelResult);
      setDefaultChannelId(nextDefaultChannelId);
      setMappings(
        mappingResult.reduce<Record<AIAbilityKey, string>>(
          (result, item) => {
            result[item.abilityKey] = item.channelId;
            return result;
          },
          {
            summary: "",
            polish: "",
            weekly_report: "",
            monthly_report: "",
          },
        ),
      );

      if (!selectedId && channelResult[0]) {
        setSelectedId(channelResult[0].id);
      }
    } catch (error) {
      setMessage(toErrorMessage(error, "加载 AI 通道配置失败"));
    }
  }, [selectedId, services.channelService]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (!selectedChannel) {
      setDraft(null);
      setHasSecret(false);
      return;
    }

    setDraft(createDraftFromChannel(selectedChannel));
    setApiKeyInput("");
    setTestPanel({
      level: "idle",
      title: "尚未执行连通性测试",
      detail: "当前通道配置已载入。你可以在保存后发起一次真实连接测试。",
    });
    void services.channelService
      .hasChannelSecret(selectedChannel.id)
      .then(setHasSecret)
      .catch(() => setHasSecret(false));
  }, [selectedChannel, services.channelService]);

  async function handleCreateChannel(): Promise<void> {
    try {
      const channel = await services.channelService.createChannel(createDefaultChannelInput("openai_compatible"));
      setSelectedId(channel.id);
      setMessage("已新增 AI 通道");
      await loadChannels();
    } catch (error) {
      setMessage(toErrorMessage(error, "新增 AI 通道失败"));
    }
  }

  async function handleSaveChannel(): Promise<void> {
    if (!selectedChannel || !draftParseResult?.input) {
      setMessage(draftParseResult?.errors[0] ?? "当前通道配置还未填写完整");
      return;
    }

    try {
      await services.channelService.updateChannel(selectedChannel.id, draftParseResult.input);
      setMessage("通道配置已保存");
      await loadChannels();
    } catch (error) {
      setMessage(toErrorMessage(error, "保存通道配置失败"));
    }
  }

  async function handleSaveApiKey(): Promise<void> {
    if (!selectedChannel || !apiKeyInput.trim()) {
      return;
    }

    try {
      await services.channelService.setChannelApiKey(selectedChannel.id, apiKeyInput);
      setApiKeyInput("");
      setHasSecret(true);
      setMessage("API Key 已写入 Stronghold");
      await loadChannels();
    } catch (error) {
      setMessage(toErrorMessage(error, "写入 Stronghold 失败"));
    }
  }

  async function handleClearApiKey(): Promise<void> {
    if (!selectedChannel) {
      return;
    }

    try {
      await services.channelService.clearChannelApiKey(selectedChannel.id);
      setHasSecret(false);
      setApiKeyInput("");
      setMessage("API Key 已清除");
      await loadChannels();
    } catch (error) {
      setMessage(toErrorMessage(error, "清除 API Key 失败"));
    }
  }

  async function handleTestChannel(): Promise<void> {
    if (!selectedChannel) {
      return;
    }

    if (draftParseResult?.errors.length) {
      setMessage(`请先修正配置：${draftParseResult.errors[0]}`);
      return;
    }

    setTesting(true);

    try {
      const result = await services.channelService.testChannel(selectedChannel.id);
      const panelLevel = result.ok
        ? result.latencyMs && result.latencyMs > 4000
          ? "warning"
          : "success"
        : "error";
      setTestPanel({
        level: panelLevel,
        title: result.ok ? "通道连接成功" : "通道连接失败",
        detail: result.message,
        latencyMs: result.latencyMs,
        checkedAt: new Date().toLocaleString("zh-CN"),
      });
      setMessage(result.ok ? `${result.message}${result.latencyMs ? `（${result.latencyMs} ms）` : ""}` : result.message);
    } catch (error) {
      setTestPanel({
        level: "error",
        title: "通道连接失败",
        detail: toErrorMessage(error, "测试通道失败"),
        checkedAt: new Date().toLocaleString("zh-CN"),
      });
      setMessage(toErrorMessage(error, "测试通道失败"));
    } finally {
      setTesting(false);
    }
  }

  async function handleDuplicateChannel(): Promise<void> {
    if (!selectedChannel) {
      return;
    }

    try {
      const duplicated = await services.channelService.duplicateChannel(selectedChannel.id);
      setSelectedId(duplicated.id);
      setMessage("已复制当前通道，凭证不会一并复制");
      await loadChannels();
    } catch (error) {
      setMessage(toErrorMessage(error, "复制通道失败"));
    }
  }

  async function handleDeleteChannel(): Promise<void> {
    if (!selectedChannel) {
      return;
    }

    const confirmed = globalThis.confirm?.(`确认删除通道“${selectedChannel.name}”吗？已绑定的能力映射会一并清除。`) ?? true;

    if (!confirmed) {
      return;
    }

    try {
      await services.channelService.deleteChannel(selectedChannel.id);
      setSelectedId(null);
      setMessage("通道已删除");
      await loadChannels();
    } catch (error) {
      setMessage(toErrorMessage(error, "删除通道失败"));
    }
  }

  async function handleSetDefaultChannel(): Promise<void> {
    if (!selectedChannel) {
      return;
    }

    try {
      await services.channelService.setDefaultChannel(selectedChannel.id);
      setDefaultChannelId(selectedChannel.id);
      setMessage("已设为默认通道");
    } catch (error) {
      setMessage(toErrorMessage(error, "设置默认通道失败"));
    }
  }

  async function handleUpdateAbility(abilityKey: AIAbilityKey, channelId: string): Promise<void> {
    const nextMappings = {
      ...mappings,
      [abilityKey]: channelId,
    };
    setMappings(nextMappings);

    try {
      if (channelId) {
        await services.channelService.setAbilityChannel(abilityKey, channelId);
        setMessage("能力映射已更新");
        return;
      }

      await services.channelService.clearAbilityChannel(abilityKey);
      setMessage("已清除能力映射");
    } catch (error) {
      setMappings(mappings);
      setMessage(toErrorMessage(error, "更新能力映射失败"));
    }
  }

  function updateDraft(patch: Partial<ChannelDraft>): void {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function handleProviderTypeChange(providerType: AIProviderType): void {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return applyProviderPreset(current, providerType);
    });
  }

  return (
    <div className="channel-layout channel-page-shell">
      <section className="panel panel-list channel-list-wrap">
        <div className="panel-title report-panel-title">
          <h2>AI 通道配置</h2>
          <p>把摘要、周报、润色等能力映射到不同模型，保持稳定和可控。</p>
        </div>

        <div className="channel-list-toolbar">
          <div className="channel-list-meta">
            <span>{channels.length} 个通道</span>
            <span>{enabledChannels.length} 个已启用</span>
          </div>
          <button className="button-primary" onClick={() => void handleCreateChannel()}>
            新增通道
          </button>
        </div>

        <div className="record-list channel-list">
          {channels.map((channel) => {
            const providerMeta = providerOptions.find((item) => item.type === channel.providerType);

            return (
              <button
                key={channel.id}
                className={`record-row channel-list-row${channel.id === selectedId ? " record-row-active" : ""}`}
                onClick={() => setSelectedId(channel.id)}
              >
                <div className={`priority-pill ${channel.enabled ? "priority-p3" : "priority-p4"}`}>
                  {channel.enabled ? "启用" : "停用"}
                </div>
                <div className="record-main">
                  <div className="record-topline">
                    <div className="record-title-text">{channel.name}</div>
                    <div className="record-meta">{providerMeta?.shortLabel ?? channel.providerType}</div>
                  </div>
                  <div className="record-bottomline">
                    <div className="record-tags">
                      {channel.id === defaultChannelId ? <span className="tag-chip tag-chip-accent">默认</span> : null}
                      <span className="tag-chip">{channel.model}</span>
                      {channel.apiKeyRef ? <span className="tag-chip">已绑定凭证</span> : <span className="tag-chip">未绑定凭证</span>}
                    </div>
                    <div className="record-due">{summarizeChannelTarget(channel)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="stack-card channel-mapping-card">
          <h4>能力映射</h4>
          <div className="mapping-grid channel-mapping-grid">
            {abilityOptions.map((ability) => (
              <label key={ability.key} className="detail-field mapping-card">
                <span className="field-label">{ability.label}</span>
                <select
                  className="select"
                  value={mappings[ability.key] ?? ""}
                  onChange={(event) => void handleUpdateAbility(ability.key, event.target.value)}
                >
                  <option value="">未指定</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                      {channel.enabled ? "" : "（停用）"}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="panel panel-detail channel-form-wrap">
        {!selectedChannel || !draft || !draftParseResult ? (
          <div className="empty-state detail-empty">选择左侧通道后，在这里编辑协议、模型与凭证。</div>
        ) : (
          <>
            <div className="report-header channel-form-header">
              <div className="panel-title">
                <h2>{selectedChannel.name}</h2>
                <p>{currentProviderOption.description}</p>
              </div>
              <div className="settings-inline channel-form-actions">
                <span className="switch">
                  自动回退：{draft.allowFallback ? "开启" : "关闭"}
                </span>
                <button className="button-ghost" onClick={() => void handleTestChannel()} disabled={testing}>
                  {testing ? "测试中…" : "测试连接"}
                </button>
                <button
                  className="button-primary"
                  onClick={() => void handleSaveChannel()}
                  disabled={draftParseResult.errors.length > 0}
                >
                  保存配置
                </button>
              </div>
            </div>

            <div className="channel-secondary-actions">
              <button className="button-ghost button-ghost-compact" onClick={() => void handleDuplicateChannel()}>
                复制
              </button>
              <button
                className="button-ghost button-ghost-compact"
                onClick={() => void handleSetDefaultChannel()}
                disabled={!draft.enabled || selectedChannel.id === defaultChannelId}
              >
                {selectedChannel.id === defaultChannelId ? "默认通道" : "设为默认"}
              </button>
              <button className="button-ghost button-ghost-compact button-danger-soft" onClick={() => void handleDeleteChannel()}>
                删除
              </button>
            </div>

            {message ? <div className="inline-message">{message}</div> : null}
            {draftParseResult.errors.length > 0 ? (
              <div className="inline-message inline-message-warning">
                <div className="validation-title">当前还有待修正字段</div>
                <ul className="validation-list">
                  {draftParseResult.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={`channel-test-panel channel-test-panel-${testPanel.level}`}>
              <div className="channel-test-header">
                <div>
                  <div className="channel-test-title">{testPanel.title}</div>
                  <div className="channel-test-detail">{testPanel.detail}</div>
                </div>
                <div className="channel-test-meta">
                  {testPanel.latencyMs ? <span>{testPanel.latencyMs} ms</span> : null}
                  {testPanel.checkedAt ? <span>{testPanel.checkedAt}</span> : null}
                </div>
              </div>
            </div>

            <div className="channel-inspector">
              <section className="inspector-section">
                <div className="inspector-section-header">
                  <div className="inspector-section-title">基础信息</div>
                  <div className="inspector-section-note">这部分决定通道在列表中的识别方式与默认使用状态。</div>
                </div>

                <div className="inspector-row">
                  <div className="inspector-row-label">名称</div>
                  <div className="inspector-row-content">
                    <input className="input" value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} />
                  </div>
                </div>

                <div className="inspector-row inspector-row-stack">
                  <div className="inspector-row-label">协议</div>
                  <div className="inspector-row-content">
                    <div className="segmented-group segmented-group-wrap">
                      {providerOptions.map((option) => (
                        <button
                          key={option.type}
                          className={`segmented-item${draft.providerType === option.type ? " segmented-item-active" : ""}`}
                          onClick={() => handleProviderTypeChange(option.type)}
                          type="button"
                        >
                          <span>{option.shortLabel}</span>
                        </button>
                      ))}
                    </div>
                    <div className="inspector-help">{currentProviderOption.label}</div>
                  </div>
                </div>

                <div className="inspector-row">
                  <div className="inspector-row-label">默认语言</div>
                  <div className="inspector-row-content">
                    <input
                      className="input"
                      value={draft.defaultLanguage}
                      onChange={(event) => updateDraft({ defaultLanguage: event.target.value })}
                    />
                  </div>
                </div>

                <div className="inspector-row">
                  <div className="inspector-row-label">启用状态</div>
                  <div className="inspector-row-content">
                    <div className="toggle-pair">
                      <label className="toggle-chip">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(event) => updateDraft({ enabled: event.target.checked })}
                        />
                        <span>{draft.enabled ? "已启用" : "已停用"}</span>
                      </label>
                      <label className="toggle-chip">
                        <input
                          type="checkbox"
                          checked={draft.allowFallback}
                          onChange={(event) => updateDraft({ allowFallback: event.target.checked })}
                        />
                        <span>{draft.allowFallback ? "允许回退" : "禁止回退"}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section className="inspector-section">
                <div className="inspector-section-header">
                  <div className="inspector-section-title">协议细节</div>
                  <div className="inspector-section-note">根据不同协议展示差异化字段，尽量贴近真实服务端接法。</div>
                </div>

                <div className="inspector-row">
                  <div className="inspector-row-label">{getBaseUrlLabel(draft.providerType)}</div>
                  <div className="inspector-row-content">
                    <input className="input" value={draft.baseUrl} onChange={(event) => updateDraft({ baseUrl: event.target.value })} />
                    <div className="inspector-help">{getBaseUrlHelp(draft.providerType)}</div>
                  </div>
                </div>

                <div className="inspector-row">
                  <div className="inspector-row-label">模型</div>
                  <div className="inspector-row-content">
                    <input className="input" value={draft.model} onChange={(event) => updateDraft({ model: event.target.value })} />
                    <div className="inspector-help">{getModelHelp(draft.providerType)}</div>
                  </div>
                </div>

                {draft.providerType === "azure_openai" ? (
                  <>
                    <div className="inspector-row">
                      <div className="inspector-row-label">Deployment</div>
                      <div className="inspector-row-content">
                        <input
                          className="input"
                          value={draft.deployment}
                          onChange={(event) => updateDraft({ deployment: event.target.value })}
                          placeholder="例如 timeaura-gpt4o"
                        />
                      </div>
                    </div>

                    <div className="inspector-row">
                      <div className="inspector-row-label">API Version</div>
                      <div className="inspector-row-content">
                        <input
                          className="input"
                          value={draft.apiVersion}
                          onChange={(event) => updateDraft({ apiVersion: event.target.value })}
                          placeholder="例如 2024-10-21"
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {draft.providerType === "anthropic" ? (
                  <div className="inspector-row">
                    <div className="inspector-row-label">Anthropic Version</div>
                    <div className="inspector-row-content">
                      <input
                        className="input"
                        value={draft.apiVersion}
                        onChange={(event) => updateDraft({ apiVersion: event.target.value })}
                        placeholder="例如 2023-06-01"
                      />
                    </div>
                  </div>
                ) : null}

                {draft.providerType !== "azure_openai" ? (
                  <div className="inspector-row">
                    <div className="inspector-row-label">Endpoint Path</div>
                    <div className="inspector-row-content">
                      <input
                        className="input"
                        value={draft.endpointPath}
                        onChange={(event) => updateDraft({ endpointPath: event.target.value })}
                        placeholder="/chat/completions"
                      />
                      <div className="inspector-help">
                        {draft.providerType === "local_gateway"
                          ? "本地网关常见为 /chat/completions，可按网关实际路由改写。"
                          : "用于 OpenAI 风格接口的补充路径，默认可保留为 /chat/completions。"}
                      </div>
                    </div>
                  </div>
                ) : null}

                {draft.providerType === "aggregator" ? (
                  <div className="inspector-row inspector-row-stack">
                    <div className="inspector-row-label">附加请求头</div>
                    <div className="inspector-row-content">
                      <textarea
                        className="textarea textarea-small"
                        value={draft.customHeadersText}
                        onChange={(event) => updateDraft({ customHeadersText: event.target.value })}
                        placeholder={'{\n  "HTTP-Referer": "https://timeaura.app",\n  "X-Title": "TimeAura"\n}'}
                      />
                      <div className="inspector-help">使用 JSON 对象填写，用于聚合平台要求的来源标识与附加头。</div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="inspector-section">
                <div className="inspector-section-header">
                  <div className="inspector-section-title">运行参数</div>
                  <div className="inspector-section-note">这些参数决定模型生成风格、超时策略与默认提示词。</div>
                </div>

                <div className="inspector-row-group">
                  <div className="inspector-row inspector-row-compact">
                    <div className="inspector-row-label">Temperature</div>
                    <div className="inspector-row-content">
                      <input
                        className="input"
                        value={draft.temperature}
                        onChange={(event) => updateDraft({ temperature: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="inspector-row inspector-row-compact">
                    <div className="inspector-row-label">Max Tokens</div>
                    <div className="inspector-row-content">
                      <input
                        className="input"
                        value={draft.maxTokens}
                        onChange={(event) => updateDraft({ maxTokens: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="inspector-row inspector-row-compact">
                    <div className="inspector-row-label">Timeout</div>
                    <div className="inspector-row-content">
                      <input
                        className="input"
                        value={draft.timeoutMs}
                        onChange={(event) => updateDraft({ timeoutMs: event.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="inspector-row inspector-row-stack">
                  <div className="inspector-row-label">System Prompt</div>
                  <div className="inspector-row-content">
                    <textarea
                      className="textarea textarea-medium"
                      value={draft.systemPrompt}
                      onChange={(event) => updateDraft({ systemPrompt: event.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="inspector-section">
                <div className="inspector-section-header">
                  <div className="inspector-section-title">凭证与安全</div>
                  <div className="inspector-section-note">API Key 会保存在 Stronghold 中，不直接写入通道记录。</div>
                </div>

                <div className="credential-status-row">
                  <div className={`credential-indicator${hasSecret ? " credential-indicator-ready" : ""}`} />
                  <div>
                    <div className="credential-title">{hasSecret ? "已保存安全凭证" : "尚未写入安全凭证"}</div>
                    <div className="credential-help">
                      {draft.providerType === "local_gateway"
                        ? "本地网关可不填 Key；若接入受保护网关，也可以在这里保存。"
                        : "保存后会写入 Stronghold，列表中只保留凭证引用。"}
                    </div>
                  </div>
                </div>

                <div className="inspector-row">
                  <div className="inspector-row-label">API Key</div>
                  <div className="inspector-row-content">
                    <div className="credential-actions">
                      <input
                        className="input"
                        type="password"
                        value={apiKeyInput}
                        onChange={(event) => setApiKeyInput(event.target.value)}
                        placeholder="输入新的 API Key 后点击保存"
                      />
                      <button
                        className="button-primary"
                        onClick={() => void handleSaveApiKey()}
                        disabled={!apiKeyInput.trim()}
                      >
                        保存 Key
                      </button>
                      <button className="button-ghost" onClick={() => void handleClearApiKey()} disabled={!hasSecret}>
                        清除 Key
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </section>

    </div>
  );
}

function createDefaultChannelInput(providerType: AIProviderType): CreateChannelInput {
  const preset = getProviderPreset(providerType);

  return {
    name: "新通道",
    providerType,
    baseUrl: preset.baseUrl,
    model: preset.model,
    temperature: 0.3,
    maxTokens: 4096,
    timeoutMs: 60000,
    systemPrompt: "",
    defaultLanguage: "zh-CN",
    enabled: true,
    allowFallback: true,
    providerOptions: preset.providerOptions,
  };
}

function createDraftFromChannel(channel: AIChannelEntity): ChannelDraft {
  return {
    name: channel.name,
    providerType: channel.providerType,
    baseUrl: channel.baseUrl,
    model: channel.model,
    temperature: String(channel.temperature),
    maxTokens: channel.maxTokens ? String(channel.maxTokens) : "",
    timeoutMs: String(channel.timeoutMs),
    systemPrompt: channel.systemPrompt,
    defaultLanguage: channel.defaultLanguage,
    enabled: channel.enabled,
    allowFallback: channel.allowFallback,
    apiVersion: channel.providerOptions.apiVersion ?? "",
    deployment: channel.providerOptions.deployment ?? "",
    endpointPath: channel.providerOptions.endpointPath ?? "",
    customHeadersText: formatHeaders(channel.providerOptions.customHeaders ?? {}),
  };
}

function parseChannelDraft(draft: ChannelDraft): DraftParseResult {
  const errors: string[] = [];
  const temperature = Number(draft.temperature);
  const maxTokens = draft.maxTokens.trim() ? Number(draft.maxTokens) : null;
  const timeoutMs = Number(draft.timeoutMs);
  const baseUrl = draft.baseUrl.trim();
  const name = draft.name.trim();
  const model = draft.model.trim();
  const parsedHeaders = parseHeaders(draft.customHeadersText);

  if (!name) {
    errors.push("通道名称不能为空");
  }

  if (!baseUrl) {
    errors.push("Base URL 不能为空");
  } else {
    try {
      new URL(baseUrl);
    } catch {
      errors.push("Base URL 格式不正确");
    }
  }

  if (!model) {
    errors.push("模型名称不能为空");
  }

  if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
    errors.push("Temperature 需要在 0 到 2 之间");
  }

  if (maxTokens !== null && (!Number.isInteger(maxTokens) || maxTokens <= 0)) {
    errors.push("Max Tokens 需要是正整数");
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 300000) {
    errors.push("Timeout 需要在 1000 到 300000 毫秒之间");
  }

  if (draft.providerType === "azure_openai" && !draft.deployment.trim()) {
    errors.push("Azure OpenAI 需要填写 Deployment");
  }

  if (
    (draft.providerType === "azure_openai" || draft.providerType === "anthropic") &&
    !draft.apiVersion.trim()
  ) {
    errors.push("当前协议需要填写 API Version");
  }

  if (
    draft.providerType !== "azure_openai" &&
    draft.endpointPath.trim() &&
    !draft.endpointPath.trim().startsWith("/")
  ) {
    errors.push("Endpoint Path 需要以 / 开头");
  }

  if (draft.providerType === "aggregator" && parsedHeaders.error) {
    errors.push(parsedHeaders.error);
  }

  if (errors.length > 0) {
    return {
      errors,
      input: null,
    };
  }

  return {
    errors,
    input: {
      name,
      providerType: draft.providerType,
      baseUrl,
      model,
      temperature,
      maxTokens,
      timeoutMs,
      systemPrompt: draft.systemPrompt,
      defaultLanguage: draft.defaultLanguage.trim() || "zh-CN",
      enabled: draft.enabled,
      allowFallback: draft.allowFallback,
      providerOptions: {
        endpointPath: normalizeOptionalText(draft.endpointPath),
        apiVersion: normalizeOptionalText(draft.apiVersion),
        deployment: normalizeOptionalText(draft.deployment),
        customHeaders: parsedHeaders.value,
      },
    },
  };
}

function applyProviderPreset(draft: ChannelDraft, providerType: AIProviderType): ChannelDraft {
  const preset = getProviderPreset(providerType);

  return {
    ...draft,
    providerType,
    baseUrl: preset.baseUrl,
    model: preset.model,
    apiVersion: preset.providerOptions.apiVersion ?? "",
    deployment: preset.providerOptions.deployment ?? "",
    endpointPath: preset.providerOptions.endpointPath ?? "",
    customHeadersText: formatHeaders(preset.providerOptions.customHeaders ?? {}),
  };
}

function getProviderPreset(providerType: AIProviderType): {
  baseUrl: string;
  model: string;
  providerOptions: NonNullable<CreateChannelInput["providerOptions"]>;
} {
  if (providerType === "anthropic") {
    return {
      baseUrl: "https://api.anthropic.com",
      model: "claude-sonnet-4",
      providerOptions: {
        apiVersion: "2023-06-01",
      },
    };
  }

  if (providerType === "azure_openai") {
    return {
      baseUrl: "https://your-resource.openai.azure.com",
      model: "gpt-4o-mini",
      providerOptions: {
        deployment: "timeaura-gpt4o",
        apiVersion: "2024-10-21",
      },
    };
  }

  if (providerType === "local_gateway") {
    return {
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "qwen2.5:14b",
      providerOptions: {
        endpointPath: "/chat/completions",
      },
    };
  }

  if (providerType === "aggregator") {
    return {
      baseUrl: "https://openrouter.ai/api/v1",
      model: "openai/gpt-4.1-mini",
      providerOptions: {
        endpointPath: "/chat/completions",
        customHeaders: {
          "HTTP-Referer": "https://timeaura.app",
          "X-Title": "TimeAura",
        },
      },
    };
  }

  return {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    providerOptions: {
      endpointPath: "/chat/completions",
    },
  };
}

function getBaseUrlLabel(providerType: AIProviderType): string {
  if (providerType === "azure_openai") {
    return "资源根地址";
  }

  return "Base URL";
}

function getBaseUrlHelp(providerType: AIProviderType): string {
  if (providerType === "azure_openai") {
    return "填写 Azure 资源根地址，不需要手动拼接 /openai/deployments。";
  }

  if (providerType === "local_gateway") {
    return "可填写本地网关、局域网代理或 Ollama / LiteLLM 等兼容入口。";
  }

  if (providerType === "aggregator") {
    return "适合 OpenRouter 等聚合平台入口地址。";
  }

  return "用于拼接实际请求地址，建议保留协议根路径。";
}

function getModelHelp(providerType: AIProviderType): string {
  if (providerType === "azure_openai") {
    return "模型名主要用于 UI 展示与后续路由识别，真实请求会按 Deployment 发送。";
  }

  if (providerType === "aggregator") {
    return "聚合平台通常要求提供完整上游模型标识。";
  }

  return "作为默认生成模型使用。";
}

function summarizeChannelTarget(channel: AIChannelEntity): string {
  if (channel.providerType === "azure_openai" && channel.providerOptions.deployment) {
    return channel.providerOptions.deployment;
  }

  if (channel.providerOptions.endpointPath) {
    return channel.providerOptions.endpointPath;
  }

  return channel.baseUrl;
}

function parseHeaders(source: string): { value: Record<string, string>; error: string | null } {
  if (!source.trim()) {
    return {
      value: {},
      error: null,
    };
  }

  try {
    const parsed = JSON.parse(source) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        value: {},
        error: "附加请求头需要是 JSON 对象",
      };
    }

    const headers = Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key.trim(), String(value).trim()] as const)
        .filter(([key, value]) => key.length > 0 && value.length > 0),
    );

    return {
      value: headers,
      error: null,
    };
  } catch {
    return {
      value: {},
      error: "附加请求头 JSON 解析失败",
    };
  }
}

function formatHeaders(headers: Record<string, string>): string {
  if (Object.keys(headers).length === 0) {
    return "";
  }

  return JSON.stringify(headers, null, 2);
}

function normalizeOptionalText(value: string): string | null {
  const next = value.trim();
  return next ? next : null;
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? `${fallback}：${error.message}` : fallback;
}
