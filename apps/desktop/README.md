# TimeAura Desktop Scaffold

[![Desktop CI](https://github.com/surgingDandelion/TimeAura/actions/workflows/desktop-ci.yml/badge.svg?branch=main)](https://github.com/surgingDandelion/TimeAura/actions/workflows/desktop-ci.yml)

该目录是 TimeAura 的真实桌面工程落位目录草稿，面向：

- `Tauri 2`
- `React 18`
- `TypeScript`
- `Vite`

当前版本重点是先把以下几件事连起来：

- `AppServicesProvider`
- `mock / sqlite` 双模式装配入口
- `AIProviderGateway` 注入
- `NotificationDriver` 注入
- `StrongholdCredentialVault` 注入
- 与 `drafts/src` 的核心领域骨架对接
- 备忘录列表 / 详情面板 / AI 报告页首轮接线
- AI 通道配置页 / 能力映射 / API Key 保存与清除流程

当前已打通的桌面运行链路：

- `npm install`
- `npm run build`
- `npm run test`
- `npm run test:coverage`
- `cargo check`（`apps/desktop/src-tauri`）
- `npm run tauri:dev`

运行说明：

1. 进入目录执行 `npm install`
2. 执行 `npm run tauri:dev`
3. Tauri 桌面运行时默认使用 `sqlite` 模式，并自动接入：
   - `sqlite:timeaura.db`
   - `StrongholdCredentialVault`
   - `TauriNotificationDriver`
4. 如果只是用浏览器跑前端页面，默认会自动回退到 `mock` 模式，避免在非 Tauri 环境下直接调用桌面插件

推荐环境变量：

- `VITE_TIMEAURA_DATA_MODE=sqlite | mock`
- `VITE_TIMEAURA_DB_URL=sqlite:timeaura.db`
- `VITE_TIMEAURA_STRONGHOLD_PASSWORD=<your-dev-password>`
- `VITE_TIMEAURA_STRONGHOLD_PATH=timeaura.stronghold`

CI / 覆盖率说明：

- GitHub Actions 工作流：`Desktop CI`
- 当前默认启用 `npm` 依赖缓存，加快重复安装速度
- 每次 CI 会执行：
  - `npm run test:coverage`
  - `npm run build`
- 产物会上传 `desktop-coverage` artifact，包含：
  - HTML 覆盖率报告
  - `lcov.info`
  - `coverage-summary.json`
- PR 会自动回写一条桌面端测试 / 构建 / 覆盖率摘要评论
- Job Summary 会同步展示本次构建状态与覆盖率总览

AI 通道页当前支持：

- 新增 / 编辑 / 启停 AI 通道
- `OpenAI Compatible` 与 `Anthropic` 协议配置
- `Azure OpenAI / Local Gateway / Aggregator` 差异化字段
- API Key 写入 Stronghold
- API Key 清除
- 通道连通性测试
- 周报 / 月报 / 摘要 / 润色能力映射
- 能力映射清空回退
- mac inspector 风格的分组配置布局

当前 provider 差异化字段：

- `OpenAI Compatible`：可配置 `Base URL / Model / Endpoint Path`
- `Anthropic`：可配置 `Base URL / Model / API Version`
- `Azure OpenAI`：可配置 `资源根地址 / Deployment / API Version / 展示模型名`
- `Local Gateway`：可配置 `Base URL / Model / Endpoint Path`，API Key 可选
- `Aggregator`：可配置 `Base URL / Model / Endpoint Path / 附加请求头 JSON`

界面开发与 AI 生成统一规约入口：

- 产品与交互主文档：
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-PRD-v1.md`
- 统一设计语言与 UI 细则：
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Design-Language-and-UI-Conventions.md`
- 高保真参考原型：
  - `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/index.html`

后续新增页面、主题调整、组件重构或让模型直接出图/出代码时，先遵守设计规约，再参考 PRD 与原型，避免重新走一轮风格漂移和细节返工。
