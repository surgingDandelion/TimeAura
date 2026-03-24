# TimeAura 技术选型文档

## 1. 文档信息

- 文档名称：TimeAura 技术选型文档
- 对应阶段：V1 原型走向工程实现
- 文档日期：2026-03-24
- 适用对象：
  - 产品负责人
  - 技术负责人
  - 前端开发
  - AI 编码模型

---

## 2. 选型目标

TimeAura 不是纯网页工具，而是一款强调“桌面工作流感、低打扰记录、右侧 inspector、AI 报告生成、本地时间管理”的桌面应用。

因此技术选型需要优先满足以下目标：

- 桌面端体验要轻，不要过重壳层开销
- UI 要足够细腻，能承载 mac 专业工具风格
- 本地数据存储稳定，支持筛选、搜索、标签、报告生成
- AI 通道与 `API Key` 能本地安全存储
- Markdown 编辑、主题切换、拖拽分栏、弹层与状态切换都要好实现
- 后续可扩展到系统通知、自动化、导出、同步

---

## 3. 最终推荐方案

## 3.1 推荐技术栈总览

### 桌面壳

- `Tauri 2`

### 前端框架

- `React 18 + TypeScript + Vite`

### 状态管理

- `Zustand`

### 本地数据库

- `SQLite`

### 表单与校验

- `React Hook Form`
- `Zod`

### Markdown 渲染

- `markdown-it` 或 `marked`
- `DOMPurify`

### 时间处理

- `dayjs`

### 样式方案

- 原生 `CSS Variables`
- 组件级样式文件或 CSS Modules

### 测试

- 单元 / 组件测试：`Vitest`
- 端到端测试：`Playwright`

### 包管理

- `pnpm`

### 桌面能力

- 系统通知：通过 `Tauri` 插件能力接入
- 本地文件导出：通过 `Tauri` 文件系统能力接入
- 安全存储：通过操作系统级安全存储或 Tauri 安全能力实现

---

## 4. 为什么选择这套方案

## 4.1 为什么选 Tauri 2

### 原因

- 比 `Electron` 更轻，内存和安装包体积更友好
- 更适合 TimeAura 这种“个人效率桌面工具”
- 与原生桌面能力集成路径清晰
- 适合后续增加通知、文件导出、本地数据库、自动化能力

### 对 TimeAura 的价值

- 降低桌面应用壳层负担
- 保持应用启动和运行的轻量感
- 更贴合“mac 专业工具”方向，不会因壳层过重影响整体感受

---

## 4.2 为什么选 React + TypeScript

### 原因

- 当前交互结构是典型的“多面板 + 多局部状态 + 多弹层”应用
- 组件拆分边界清楚，适合 `Workspace / Report / Channel` 三大主页面
- 社区成熟，AI 编码模型支持也更好
- TypeScript 能帮助后续稳定维护 `Record / Tag / Channel / Template` 等核心数据模型

### 对 TimeAura 的价值

- 便于把当前原型沉淀成可扩展组件体系
- 对复杂交互状态更友好
- 有利于后续把 UI 状态、业务状态、数据状态拆开管理

---

## 4.3 为什么选 Zustand

### 原因

- 比较轻，不需要引入过重样板
- 很适合桌面工具类应用的全局状态
- 对当前项目最关键的状态足够用：
  - 当前视图
  - 选中任务
  - 多选集合
  - 主题
  - 当前页面
  - 当前模板 / 通道

### 不选更重方案的原因

- `Redux Toolkit` 没问题，但对当前阶段偏重
- TimeAura 目前更需要交付速度和状态清晰度，而不是完整企业级 flux 体系

---

## 4.4 为什么选 SQLite

### 原因

- 当前产品天然需要结构化查询：
  - 搜索
  - 按标签筛选
  - 按状态 / 优先级 / 时间排序
  - AI 报告时间范围聚合
  - 提醒条命中任务计算
- 比纯 JSON 文件稳定
- 比只存在内存里更接近真实产品

### 对 TimeAura 的价值

- 为提醒规则、报告生成、记录历史、标签统计提供可靠底层
- 为后续加入归档、回收站、导出、同步打基础

---

## 4.5 为什么不用重 UI 组件库

### 原因

- 当前视觉方向要求接近 mac 专业工具
- 现成组件库往往容易带出“后台系统感”或“网页表单感”
- TimeAura 很多关键控件需要定制语言：
  - inspector 字段行
  - segmented control
  - 列表行状态
  - 提醒条
  - 右侧详情结构

### 建议

- 可以自建一层轻量基础组件
- 不建议直接上重型设计系统去覆盖全部界面

---

## 5. 不推荐的方案与原因

## 5.1 不优先推荐 Electron

### 原因

- 对 TimeAura 这类效率工具，壳层偏重
- 安装包、内存占用、运行负担通常更高
- 在 V1 阶段不利于维持“轻、安静、专业”的桌面产品基调

### 什么时候可以选

- 团队只熟 Electron，不熟 Tauri
- 需要快速集成已有 Electron 生态能力
- 更关注团队交付速度而非体积与资源占用

---

## 5.2 不优先推荐重型富文本编辑器

### 原因

- 当前需求核心是 Markdown 编辑 / 预览，不是复杂协作文档
- 重型编辑器会显著增加复杂度
- 反而不利于保持“轻记录 + 结构化内容”的体验

### 建议

- V1 先采用：
  - 轻量 textarea 编辑
  - Markdown 预览渲染
  - 编辑 / 分栏 / 预览三态切换

### 后续再评估

- 如果 V1.5 需要图片、附件、块级编辑、复杂粘贴处理，再评估升级

---

## 5.3 不优先推荐把数据存成纯 JSON

### 原因

- 简单 demo 可以用，但很快会遇到问题：
  - 查询效率
  - 状态一致性
  - 标签统计
  - 报告聚合
  - 提醒命中计算

### 结论

- JSON 可用于 mock 数据阶段
- 正式原型或工程实现建议落 SQLite

---

## 6. 备选方案

## 6.1 备选方案 A：Electron + React + SQLite

适用条件：

- 团队 Electron 经验明显更强
- 希望减少桌面壳学习成本
- 更在意交付确定性

优点：

- 生态成熟
- 文档与案例多
- 上手路径平稳

缺点：

- 更重
- 更不利于保持轻桌面工具印象

---

## 6.2 备选方案 B：Tauri + Vue 3 + Pinia + SQLite

适用条件：

- 团队 Vue 能力明显更强
- 需要顺着现有 Vue 技术栈推进

优点：

- 一样可以达成当前产品目标
- Vue 在表单与组合式状态管理上也很好用

缺点：

- 当前已有的结构建议与后续 AI 编码模型配合，我更偏 React 路径

---

## 7. 模块级技术建议

## 7.1 主工作台

技术建议：

- 组件化拆分
- 列表虚拟化可暂缓
- 先保证状态表达准确，再考虑大规模性能优化

建议实现点：

- `QuickAddCard`
- `TaskList`
- `TaskRow`
- `PaneSplitter`
- `DetailPane`

---

## 7.2 提醒条与批量改期

技术建议：

- 命中规则放在独立 service 或 selector
- UI 状态与业务规则分离

建议拆分：

- `reminderService`
- `ReminderBanner`
- `ReminderExpandPanel`
- `BatchRescheduleModal`

---

## 7.3 标签管理

技术建议：

- 标签库与记录绑定关系分开存
- 删除标签时由 service 层统一处理回落逻辑

建议拆分：

- `tagStore`
- `tagService`
- `TagManagerModal`

---

## 7.4 AI 报告

技术建议：

- 报告生成条件与结果草稿分离
- 报告草稿可独立存储为临时状态
- 保存为记录时再落库

建议拆分：

- `reportStore`
- `reportService`
- `templateService`

---

## 7.5 AI 通道配置

技术建议：

- 通道配置与能力映射分开存储
- API Key 不应直接明文落普通配置文件
- 通道测试连接要支持失败态和重试

建议拆分：

- `channelStore`
- `channelService`
- `abilityMappingService`

---

## 8. 数据层建议

## 8.1 核心表建议

至少包含：

- `records`
- `tags`
- `record_tags`
- `channels`
- `report_templates`
- `report_history`
- `settings`

---

## 8.2 Record 表核心字段

- `id`
- `record_kind`
- `title`
- `content_markdown`
- `content_plain`
- `status`
- `priority`
- `due_at`
- `planned_at`
- `completed_at`
- `created_at`
- `updated_at`
- `archived_at`

---

## 8.3 Settings 表建议

至少包含：

- `theme`
- `default_view`
- `reminder_enabled`
- `do_not_disturb_range`
- `completion_quick_mode`
- `default_channel_id`

---

## 9. AI 通道与安全策略

## 9.1 API Key 存储建议

推荐策略：

- 优先使用系统安全存储能力
- 数据库中只保存通道配置元信息
- 敏感凭据独立加密存储

不建议：

- 直接把明文 `API Key` 放在普通 JSON 配置文件里

---

## 9.2 AI 调用层建议

建议实现：

- 统一 `aiClient`
- provider 适配层
- 能力映射层
- 自动回退策略层

建议模块：

- `providers/openaiCompatible.ts`
- `providers/anthropic.ts`
- `providers/azureCompatible.ts`
- `aiRouter.ts`

---

## 10. Markdown 方案建议

## 10.1 V1 方案

- 编辑：原生 textarea
- 预览：`markdown-it` 或 `marked`
- 安全：`DOMPurify`

原因：

- 足够支撑当前需求
- 性能和复杂度都可控
- 便于保持“三态编辑器”的稳定性

---

## 10.2 后续演进点

如果后续需要以下能力，再考虑升级：

- 图片粘贴上传
- 附件管理
- 块级拖拽
- 富文本工具条
- 高级快捷键体系

---

## 11. 测试策略建议

## 11.1 单元 / 组件测试

建议覆盖：

- 提醒规则计算
- 批量改期规则
- 标签删除回落逻辑
- 过滤 / 排序逻辑
- Markdown 渲染安全逻辑

工具：

- `Vitest`

---

## 11.2 端到端测试

建议覆盖：

- 快速新增
- 点击任务展开详情
- 批量选择与批量改期
- 主题切换
- AI 通道配置页基础流程
- AI 报告页基础流程

工具：

- `Playwright`

---

## 12. 工程结构建议

正式工程建议参考已有文档：

- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Frontend-Breakdown.md`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Frontend-Structure.md`
- `/Users/dandelion/Documents/iflytek/viber_coding/TimeAura/docs/TimeAura-Development-Backlog.md`

其中：

- `Frontend-Breakdown` 负责页面与业务组件拆分
- `Frontend-Structure` 负责 React / Vue 目录结构与命名建议
- `Development-Backlog` 负责开发任务优先级与排期拆分

---

## 13. 落地建议

## 13.1 推荐实施路径

第一阶段：

- `Tauri + React + TypeScript + Vite`
- mock 数据
- 跑通主工作台、详情区、提醒条、标签管理

第二阶段：

- 接入 SQLite
- 接入 AI 通道配置
- 接入报告生成链路

第三阶段：

- 完善通知、导出、错误态
- 补测试
- 做性能与交互 polish

---

## 13.2 当前正式建议结论

TimeAura V1 正式推荐采用以下技术选型：

- 桌面壳：`Tauri 2`
- 前端：`React + TypeScript + Vite`
- 状态管理：`Zustand`
- 本地数据库：`SQLite`
- 表单：`React Hook Form + Zod`
- Markdown：`markdown-it/marked + DOMPurify`
- 时间处理：`dayjs`
- 测试：`Vitest + Playwright`
- 包管理：`pnpm`

这是当前在“实现成本、桌面体验、后续扩展性、视觉还原度”之间最平衡的一套方案。

---

## 14. 一句话结论

如果现在进入工程实现，TimeAura 最适合做成：

一个基于 `Tauri + React + TypeScript + SQLite` 的桌面效率工具，前端保持自建轻量组件体系，避免重 UI 库，优先把主工作台、提醒条、详情 inspector 和 AI 报告链路做稳。
