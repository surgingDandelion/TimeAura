# TimeAura 通道配置页 PRD 与交互规范

## 1. 文档目标

本文件用于统一 TimeAura 桌面端“AI 通道配置页”的产品、交互与实现口径，直接同步给：

- UI 设计师
- 前端开发
- Tauri / 桌面端开发
- AI 生成式 UI 模型

该页面对应真实工程文件：

- `apps/desktop/src/features/channels/ChannelStudioPage.tsx`

---

## 2. 页面定位

AI 通道配置页用于完成三类核心任务：

1. 管理 TimeAura 所有 AI 通道
2. 配置不同 AI 能力的路由归属
3. 安全管理通道凭证，并验证通道可用性

页面在产品中的定位不是“模型市场”，而是偏专业工具的“桌面配置工作台”。

关键词：

- mac inspector 化
- 专业、克制、结构清晰
- 可快速扫描状态
- 可直接完成真实配置

---

## 3. 信息架构

页面采用三栏结构：

### 3.1 左栏：通道列表

用于快速浏览和切换已有通道。

每个通道项展示：

- 通道名称
- 协议类型简称
- 当前模型名
- 凭证是否已绑定
- 默认通道标记
- 启用 / 停用状态
- 核心目标标识
  - Azure OpenAI 显示 Deployment
  - 其他协议优先显示 Endpoint Path 或 Base URL 摘要

### 3.2 中栏：通道 Inspector

为主编辑区，采用属性面板式分组：

- 基础信息
- 协议细节
- 运行参数
- 凭证与安全

顶部操作区包含：

- 复制
- 设为默认
- 测试连接
- 保存配置
- 删除

中栏顶部固定展示测试结果状态面板。

### 3.3 右栏：AI 功能路由

用于配置 AI 能力到通道的映射关系，包含：

- AI 摘要
- 内容润色
- 周报生成
- 月报生成

当未指定映射时，系统回退到默认通道；若默认通道不存在，则回退到第一个已启用通道。

---

## 4. 关键对象定义

### 4.1 通道对象

通道基础字段：

- `name`
- `providerType`
- `baseUrl`
- `model`
- `temperature`
- `maxTokens`
- `timeoutMs`
- `systemPrompt`
- `defaultLanguage`
- `enabled`
- `allowFallback`
- `apiKeyRef`

### 4.2 providerOptions

用于承载协议差异化字段：

- `endpointPath`
- `apiVersion`
- `deployment`
- `customHeaders`

---

## 5. 支持的协议与差异化字段

### 5.1 OpenAI Compatible

展示字段：

- Base URL
- Model
- Endpoint Path

适用场景：

- OpenAI 官方兼容端点
- 企业代理网关
- 通用中转服务

### 5.2 Anthropic

展示字段：

- Base URL
- Model
- API Version

适用场景：

- Claude 原生 Messages API

### 5.3 Azure OpenAI

展示字段：

- 资源根地址
- 展示模型名
- Deployment
- API Version

规则：

- 实际请求按 `baseUrl + /openai/deployments/{deployment}/chat/completions?api-version=...` 生成
- `model` 主要用于界面展示与内部路由识别

### 5.4 Local Gateway

展示字段：

- Base URL
- Model
- Endpoint Path

规则：

- API Key 可为空
- 适合 Ollama、LiteLLM、本地代理或内网服务

### 5.5 Aggregator

展示字段：

- Base URL
- Model
- Endpoint Path
- 附加请求头 JSON

规则：

- 用于 OpenRouter 等聚合平台
- `customHeaders` 支持 `HTTP-Referer`、`X-Title` 等来源标识头

---

## 6. 核心交互

### 6.1 新增通道

行为：

- 点击“新增通道”
- 创建一个默认 `OpenAI Compatible` 通道草稿
- 自动选中新建通道

默认预填：

- 名称：`新通道`
- Base URL：`https://api.openai.com/v1`
- Model：`gpt-4.1-mini`
- Endpoint Path：`/chat/completions`

### 6.2 复制通道

行为：

- 点击“复制”
- 复制当前通道的大多数配置
- 不复制 Stronghold 凭证引用

文案反馈：

- `已复制当前通道，凭证不会一并复制`

### 6.3 删除通道

行为：

- 点击“删除”
- 弹出确认
- 删除成功后回到列表态

约束：

- 若该通道为默认通道，则自动把默认通道切到下一个已启用通道；若不存在则清空默认通道
- 若该通道已绑定 AI 能力映射，映射一并清除

### 6.4 设为默认通道

行为：

- 点击“设为默认”
- 写入 `defaultChannelId`
- 左侧列表出现“默认”标签

约束：

- 只有启用态通道可以被设为默认
- 已是默认通道时按钮禁用并显示“默认通道”

### 6.5 测试连接

行为：

- 点击“测试连接”
- 触发真实 provider 请求
- 在 Inspector 顶部显示测试结果面板

分级规则：

- `success`：连接成功，且延迟表现正常
- `warning`：连接成功，但延迟偏高
- `error`：连接失败或配置错误
- `idle`：尚未测试

展示信息：

- 结果标题
- 结果说明
- 延迟毫秒数
- 最近测试时间

### 6.6 AI 能力映射

行为：

- 每个能力独立选择一个通道
- 允许清空映射
- 清空后自动回退默认通道策略

---

## 7. 校验规则

### 7.1 通用校验

- 通道名称不能为空
- Base URL 必须是合法 URL
- 模型名称不能为空
- Temperature 范围为 `0 ~ 2`
- Max Tokens 必须为空或正整数
- Timeout 范围为 `1000 ~ 300000`

### 7.2 特殊校验

Azure OpenAI：

- 必填 `deployment`
- 必填 `apiVersion`

Anthropic：

- 必填 `apiVersion`

非 Azure OpenAI：

- 若填写 `endpointPath`，必须以 `/` 开头

Aggregator：

- `customHeaders` 必须是合法 JSON 对象

### 7.3 凭证规则

- Stronghold 中仅存 API Key 明文
- 通道记录中仅保存 `apiKeyRef`
- 复制通道时不复制凭证

---

## 8. 状态规范

### 8.1 列表项状态

- 默认态
- Hover
- Selected
- Disabled-like（停用标签）
- Default badge

### 8.2 操作按钮状态

- 正常态
- Hover
- Disabled
- Danger soft（删除）

### 8.3 测试面板状态

- `idle`
- `success`
- `warning`
- `error`

### 8.4 表单状态

- 正常
- Focus
- 校验错误提示
- 禁用操作按钮

---

## 9. 视觉与布局要求

### 9.1 风格关键词

- mac native professional tool
- inspector panel
- restrained, precise, premium
- no heavy modal feeling
- no noisy dashboard style

### 9.2 组件语义

- 顶部动作为次级按钮 + 主按钮混排
- 协议切换使用 segmented control
- 属性编辑采用字段行，不做厚重表单感
- 状态反馈优先用轻量面板，不要 Toast-only

### 9.3 设计注意点

- 左栏列表信息密度要高，但不凌乱
- 中栏字段组之间用细分隔和一致留白组织层级
- 右栏映射卡片应比主编辑区轻一级
- 删除操作只做轻危险态，不做高饱和红色主按钮

---

## 10. 前端实现建议

推荐拆分：

- `ChannelStudioPage`
- `ChannelListPane`
- `ChannelInspectorPane`
- `ChannelProviderFields`
- `ChannelCredentialSection`
- `ChannelTestStatusPanel`
- `ChannelAbilityMappingPane`

状态建议：

- 页面级持有当前列表、选中通道、默认通道、测试结果
- `draft` 使用本地表单态
- 保存与测试操作分开 loading

---

## 11. 与真实工程的当前对齐状态

当前已在真实工程中落地：

- 通道新增
- 通道复制
- 通道删除
- 设为默认通道
- provider 差异化字段
- 默认通道 fallback
- Stronghold API Key 管理
- 测试结果状态面板
- AI 能力映射

对应关键文件：

- `apps/desktop/src/features/channels/ChannelStudioPage.tsx`
- `drafts/src/services/impl/defaultChannelService.ts`
- `drafts/src/services/impl/defaultAIService.ts`
- `drafts/src/providers/http/openAICompatibleAIProviderGateway.ts`
- `drafts/src/providers/http/anthropicAIProviderGateway.ts`
- `drafts/src/repositories/sqlite/migrations.ts`
