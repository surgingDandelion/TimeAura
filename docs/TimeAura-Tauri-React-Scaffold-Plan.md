# TimeAura Tauri + React + TypeScript Scaffold 对接方案

## 1. 文档信息

- 文档名称：TimeAura Tauri + React + TypeScript Scaffold 对接方案
- 文档日期：2026-03-24
- 适用阶段：原型资产进入真实工程初始化
- 适用对象：
  - 技术负责人
  - 前端开发
  - Tauri / 桌面应用开发
  - AI 编码模型

---

## 2. 文档目标

这份文档解决两个问题：

1. 当前仓库已经积累了 `PRD / 线框 / HTML 原型 / 技术文档 / drafts 工程草稿`，真实工程应该如何接入，避免推倒重来。
2. 当 `Tauri + React + TypeScript` scaffold 初始化完成后，如何把现有 `drafts` 资产直接迁入，形成第一版可运行的桌面应用骨架。

本方案的目标不是“一步到位实现全部功能”，而是把工程起步阶段最容易反复返工的几个部分先稳定下来：

- 目录结构
- 分层边界
- mock / sqlite 双模式入口
- SQLite 迁移落位
- repository / service 接口与实现落位
- Tauri 前端层与桌面能力边界

---

## 3. 推荐接入策略

## 3.1 仓库层建议

由于当前仓库根目录已经存在：

- `index.html` 高保真原型
- `docs/` 产品与设计文档
- `drafts/` 工程草稿

因此不建议直接在仓库根目录覆盖式初始化前端工程。

推荐采用以下结构：

```text
TimeAura/
├── docs/
├── drafts/
├── index.html
└── apps/
    └── desktop/
```

当前仓库已经补出该目录的首轮 scaffold 草稿，包括：

- `apps/desktop/package.json`
- `apps/desktop/vite.config.ts`
- `apps/desktop/src/app/providers/AppServicesProvider.tsx`
- `apps/desktop/src/app/bootstrap/createDesktopAppServices.ts`
- `apps/desktop/src/features/workspace/WorkspacePage.tsx`
- `apps/desktop/src/features/reports/ReportStudioPage.tsx`
- `apps/desktop/src-tauri/*`

这样做的价值：

- 保留当前设计资产，不打乱原型与文档
- 真正可运行的桌面工程独立在 `apps/desktop`
- 后续如果增加官网、同步服务、文档站，也有自然扩展空间

---

## 3.2 Scaffold 初始化建议

建议使用：

- `pnpm`
- `Tauri 2`
- `React`
- `TypeScript`
- `Vite`

初始化目标目录：

- `apps/desktop`

建议在 scaffold 初始化时就选择：

- 前端：`React + TypeScript`
- 包管理：`pnpm`
- 桌面壳：`Tauri 2`

推荐初始化命令：

```bash
mkdir -p apps
cd apps
pnpm create tauri-app
```

建议在交互式初始化中填入：

- 项目目录：`desktop`
- UI 模板：`React`
- 语言：`TypeScript`
- 包管理器：`pnpm`
- 前端构建工具：`Vite`

补充约束：

- `Tauri 2` 相关插件文档当前要求 Rust 版本至少为 `1.77.2`
- 初始化完成后再进入 `apps/desktop` 增加插件和迁移文件

---

## 4. 真实工程推荐目录

## 4.1 仓库级目录

```text
TimeAura/
├── apps/
│   └── desktop/
│       ├── src/
│       ├── src-tauri/
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tauri.conf.json
├── docs/
├── drafts/
└── index.html
```

## 4.2 `apps/desktop/src` 推荐目录

```text
src/
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   ├── AppServicesProvider.tsx
│   │   └── ModalProvider.tsx
│   └── bootstrap/
│       ├── createAppServices.ts
│       ├── createMockAppServices.ts
│       └── createSqliteAppServices.ts
├── domain/
│   ├── types/
│   ├── repositories/
│   └── services/
├── infrastructure/
│   ├── repositories/
│   │   ├── mock/
│   │   └── sqlite/
│   ├── services/
│   │   ├── mock/
│   │   └── impl/
│   ├── ai/
│   ├── notifications/
│   └── settings/
├── features/
├── pages/
├── stores/
├── shared/
│   ├── utils/
│   ├── constants/
│   └── theme/
└── testing/
    └── mocks/
```

## 4.3 `apps/desktop/src-tauri` 推荐目录

```text
src-tauri/
├── src/
│   ├── lib.rs
│   ├── main.rs
│   ├── commands/
│   │   ├── notifications.rs
│   │   └── system.rs
│   └── state/
├── icons/
├── capabilities/
└── migrations/
```

说明：

- 如果 V1 先采用 Tauri 插件直接访问 SQLite，可以先不写复杂 Rust 命令层
- `src-tauri/commands` 初期只保留通知、系统能力、窗口能力等少量命令
- 数据层优先放在前端 TypeScript + Tauri 插件一侧完成

---

## 5. drafts 到真实工程的映射

## 5.1 领域类型

当前：

- `drafts/src/types/*`

迁移到：

- `apps/desktop/src/domain/types/*`

说明：

- 这些类型已经包含 `Record / Tag / Channel / Report / Settings` 等核心实体
- 初始化后可直接复制，并作为 store、repository、service 的统一类型源

## 5.2 repository 接口

当前：

- `drafts/src/repositories/*`

迁移到：

- `apps/desktop/src/domain/repositories/*`

说明：

- 这些文件定义“能力边界”
- UI / store 不应直接依赖 SQLite 或 Tauri 插件 API，而应依赖这些接口

## 5.3 service 接口

当前：

- `drafts/src/services/*`

迁移到：

- `apps/desktop/src/domain/services/*`

说明：

- 这些文件定义“业务用例”
- 页面只应面向 service，而不是自己拼装多仓储逻辑

## 5.4 mock 数据与 mock runtime

当前：

- `drafts/src/mocks/*`
- `drafts/src/mock/*`
- `drafts/src/repositories/mock/*`
- `drafts/src/services/mock/*`
- `drafts/src/bootstrap/*`

迁移到：

- `apps/desktop/src/testing/mocks/*`
- `apps/desktop/src/infrastructure/repositories/mock/*`
- `apps/desktop/src/infrastructure/services/mock/*`
- `apps/desktop/src/app/bootstrap/*`

说明：

- 这批文件已经可以作为真实工程初始化后的第一版本地假数据运行层
- `createAppServices` 可保留为统一入口，通过环境变量切换 `mock / sqlite`

## 5.5 数据库迁移

当前：

- `drafts/db/migrations/0001_init_core.sql`
- `drafts/db/migrations/0002_seed_defaults.sql`

迁移到：

- `apps/desktop/src-tauri/migrations/0001_init_core.sql`
- `apps/desktop/src-tauri/migrations/0002_seed_defaults.sql`

说明：

- 若采用 Tauri SQLite 插件，可在应用启动时执行初始化与迁移检查
- 若后续把数据库层下沉到 Rust，也仍建议继续沿用这套 SQL 文件作为迁移源

---

## 6. 依赖建议

## 6.1 前端依赖

建议前端安装：

- `react`
- `react-dom`
- `zustand`
- `zod`
- `react-hook-form`
- `dayjs`
- `markdown-it`
- `dompurify`

补充说明：

- `zustand` 负责应用状态
- `zod` 负责 AI 通道配置、模板配置、记录表单校验
- `markdown-it + dompurify` 负责 Markdown 预览安全渲染
- `dayjs` 负责提醒规则、日期范围、批量改期计算

## 6.2 Tauri 插件建议

V1 建议优先考虑以下插件能力：

- SQLite：本地记录、标签、报告、设置存储
- Notification：系统提醒
- Stronghold：敏感凭证（AI Key）安全存储
- Store：非敏感本地设置缓存

插件职责建议如下：

- `SQLite`：结构化业务数据
- `Stronghold`：`API Key`、敏感 token、通道凭证引用
- `Store`：窗口尺寸、主题、最后视图、临时 UI 偏好
- `Notification`：到期提醒、积压提醒、本地通知

推荐安装命令：

```bash
cd apps/desktop
pnpm tauri add sql
pnpm tauri add notification
pnpm tauri add stronghold
pnpm tauri add store
cd src-tauri
cargo add tauri-plugin-sql --features sqlite
```

说明：

- `sql` 负责结构化数据存储
- `notification` 负责本地提醒
- `stronghold` 负责密钥存储
- `store` 负责轻量设置缓存

---

## 7. App Services 统一入口方案

## 7.1 为什么要先做统一入口

如果没有统一入口，后面会很容易出现：

- 页面直接 new repository
- store 里混杂 mock 与 sqlite 逻辑
- AI provider 调用分散
- 测试环境无法快速切换

因此建议应用启动时始终只经过一个入口：

- `createAppServices`

## 7.2 推荐入口接口

```ts
export type AppDataMode = "mock" | "sqlite";

export interface CreateAppServicesOptions {
  mode?: AppDataMode;
  sqliteFactory?: () => Promise<AppContainer> | AppContainer;
}

export async function createAppServices(
  options?: CreateAppServicesOptions,
): Promise<AppContainer>;
```

## 7.3 当前 drafts 已提供的入口

当前已准备：

- `drafts/src/bootstrap/createMockAppServices.ts`
- `drafts/src/bootstrap/createAppServices.ts`
- `drafts/src/bootstrap/createSqliteAppServices.ts`
- `drafts/src/providers/http/*`
- `drafts/src/providers/tauri/*`
- `drafts/src/providers/credentialVault.ts`

这意味着真实工程初始化后，只需要：

1. 复制 mock 版本到 `src/app/bootstrap`
2. 新增 `createSqliteAppServices.ts`
3. 在 `AppServicesProvider` 中调用 `createAppServices`

就能快速形成：

- 本地假数据开发模式
- 真实 SQLite 模式

---

## 8. 推荐的 SQLite 接入路径

## 8.1 V1 建议

V1 不建议一开始就把数据库访问全部写到 Rust 命令层。

更稳妥的方式是：

1. 使用 Tauri SQLite 能力打开本地数据库
2. 在 TypeScript 层实现 `sqlite repository`
3. 仅把系统通知、窗口控制、系统能力放在 Tauri / Rust 层

这样做的好处：

- 前端工程推进更快
- repository interface 可以直接复用
- mock / sqlite 的切换最自然
- 未来要把重逻辑迁往 Rust 时，也不会影响页面层

## 8.2 SQLite repository 推荐拆分

```text
src/infrastructure/repositories/sqlite/
├── sqliteClient.ts
├── sqliteRecordRepository.ts
├── sqliteTagRepository.ts
├── sqliteRecordTagRepository.ts
├── sqliteChannelRepository.ts
├── sqliteReportTemplateRepository.ts
├── sqliteReportHistoryRepository.ts
└── sqliteSettingsRepository.ts
```

其中：

- `sqliteClient.ts` 负责连接、迁移、基础查询封装
- 每个 repository 只面向一个业务聚合根
- JSON 字段与实体类型的转换放在 repository 内完成

---

## 9. AI 通道能力接入建议

## 9.1 推荐拆分

```text
src/infrastructure/ai/
├── aiClient.ts
├── providerAdapters/
│   ├── openaiCompatibleAdapter.ts
│   ├── anthropicAdapter.ts
│   ├── azureOpenAIAdapter.ts
│   ├── localGatewayAdapter.ts
│   └── aggregatorAdapter.ts
└── credentialVault.ts
```

说明：

- `channelService` 只负责通道配置与能力映射
- 真正的 provider 协议差异封装在 `providerAdapters`
- `credentialVault` 只处理敏感凭证的读写

## 9.2 为什么要单独做 `credentialVault`

因为 TimeAura 的 AI 通道不是单一协议：

- OpenAI Compatible
- Anthropic
- Azure OpenAI
- Local Gateway
- Aggregator

不同协议可能：

- Header 不同
- URL 不同
- token 命名不同

因此建议：

- 数据库里只保存 `apiKeyRef`
- 真正密钥统一存 Stronghold 或系统安全存储

---

## 10. 状态管理接入建议

## 10.1 推荐 store 粒度

```text
src/stores/
├── appStore.ts
├── workspaceStore.ts
├── detailPaneStore.ts
├── reportStore.ts
├── channelStore.ts
└── settingsStore.ts
```

## 10.2 store 与 service 的关系

推荐约束：

- store 不直接操作数据库
- store 不直接调用 Tauri 插件底层 API
- store 只依赖 `AppServicesProvider` 注入的 service

例如：

- `workspaceStore` 依赖 `recordService / tagService / reminderService`
- `reportStore` 依赖 `reportService / templateService / channelService`
- `settingsStore` 依赖 `settingsService`

---

## 11. 首轮接入顺序

建议严格按以下顺序推进：

### 第一步：初始化 scaffold

- 创建 `apps/desktop`
- 跑通 `React + TypeScript + Tauri`
- 确保窗口正常启动

### 第二步：迁入类型与接口

- 迁移 `drafts/src/types`
- 迁移 `drafts/src/repositories`
- 迁移 `drafts/src/services`

目标：

- 先把“边界”立住

### 第三步：迁入 mock 运行层

- 迁移 `drafts/src/mocks`
- 迁移 `drafts/src/mock`
- 迁移 `drafts/src/repositories/mock`
- 迁移 `drafts/src/services/mock`
- 迁移 `drafts/src/bootstrap`

目标：

- 页面未接真实数据库之前先跑 mock 版本

### 第四步：接入 UI 壳层

- 创建 `AppShell`
- 拆出 `Sidebar / Workspace / Reminder / Inspector / Report / Channel`
- 先连接 mock services

### 第五步：实现 sqlite repository

- 接入数据库
- 执行迁移
- 完成 repository 替换

### 第六步：接入通知与 AI 通道

- 通知能力
- 通道测试
- 报告生成
- 摘要 / 润色

---

## 12. V1 启动建议

如果目标是尽快从“设计资产”走到“真实可运行桌面应用”，建议第一阶段只做以下闭环：

- 记录列表
- 右侧 inspector
- 标签与筛选
- 提醒条
- 批量改期
- AI 通道配置
- 周报 / 月报生成
- 主题切换

暂时不进入第一阶段的内容：

- 云同步
- 多端登录
- 团队协作
- 附件系统
- 复杂自动化

---

## 13. 交付物对应关系

当前仓库已经具备以下三层资产：

### 产品与设计层

- `docs/TimeAura-PRD-v1.md`
- `docs/TimeAura-LowFi-Wireframes-v1.md`
- `index.html`

### 技术规划层

- `docs/TimeAura-Tech-Selection.md`
- `docs/TimeAura-Database-Schema-Draft.md`
- `docs/TimeAura-Service-Interface-Draft.md`
- `docs/TimeAura-Frontend-Structure.md`

### 工程草稿层

- `drafts/db/migrations/*`
- `drafts/src/types/*`
- `drafts/src/repositories/*`
- `drafts/src/repositories/sqlite/*`
- `drafts/src/services/*`
- `drafts/src/services/impl/*`
- `drafts/src/repositories/mock/*`
- `drafts/src/services/mock/*`
- `drafts/src/providers/*`
- `drafts/src/bootstrap/*`

这意味着：

TimeAura 已经不是“只有 PRD 和原型”的状态，而是已经可以直接进入真实工程初始化与模块迁移阶段。

---

## 14. 参考资料

- Tauri 官方创建项目文档：<https://v2.tauri.app/start/create-project/>
- Tauri 官方首页创建命令说明：<https://v2.tauri.app/>
- Tauri SQL 插件文档：<https://v2.tauri.app/plugin/sql/>
- Tauri Notification 插件文档：<https://v2.tauri.app/plugin/notification/>
- Tauri Stronghold 插件文档：<https://v2.tauri.app/plugin/stronghold/>
- Tauri Store 插件文档：<https://v2.tauri.app/plugin/store/>
