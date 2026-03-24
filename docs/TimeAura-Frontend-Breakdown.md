# TimeAura 前端页面拆分与组件拆分清单

## 1. 文档目的

本文件用于把 TimeAura 当前原型拆解成更适合前端开发落地的页面、模块、组件与状态清单，方便直接进入工程实现。

适用对象：

- 前端开发
- 技术负责人
- 设计转开发协同
- 需要把原型拆解为工程任务的 AI 编码模型

---

## 2. 开发目标

当前 V1 的实现目标不是“做一个静态页面集合”，而是做一个具备真实桌面应用交互感的产品原型级应用，至少覆盖：

- 主工作台三栏结构
- 快速新增
- 单行高密度任务列表
- 右侧详情 inspector
- 提醒条与批量改期
- 标签管理
- AI 报告页
- AI 通道配置页
- 浅色 / 暗色主题切换

---

## 3. 建议页面层拆分

建议按 3 个页面级容器 + 1 套全局系统层来拆：

### 3.1 App Shell

职责：

- 窗口顶栏
- 全局主题
- 左侧侧栏
- 主区域路由切换
- 全局弹层挂载
- 全局 toast

建议组件名：

- `AppShell`
- `WindowBar`
- `Sidebar`
- `SidebarNav`
- `SidebarFooter`
- `PageHost`
- `ModalHost`
- `ToastHost`

### 3.2 Workspace Page

职责：

- 主工作台
- 中间列表区
- 右侧详情区
- 分栏拖拽

建议组件名：

- `WorkspacePage`
- `ListPane`
- `DetailPane`
- `PaneSplitter`

### 3.3 Report Page

职责：

- AI 报告生成工作台
- 左侧条件区
- 右侧结果区
- 模板与通道切换

建议组件名：

- `ReportPage`
- `ReportFiltersPanel`
- `ReportEditorPanel`

### 3.4 Channel Page

职责：

- AI 通道列表
- 通道配置表单
- 能力映射

建议组件名：

- `ChannelPage`
- `ChannelListPanel`
- `ChannelFormPanel`
- `AbilityMappingPanel`

---

## 4. Workspace 页面拆分

### 4.1 结构树建议

```text
WorkspacePage
├── ListPane
│   ├── PageHeader
│   ├── QuickAddCard
│   ├── ToolbarRow
│   │   ├── SearchBox
│   │   ├── FilterRow
│   │   └── SortSelect
│   ├── ReminderBanner
│   │   └── ReminderExpandPanel
│   ├── SelectionBar
│   └── TaskListCard
│       └── TaskList
│           └── TaskRow[]
├── PaneSplitter
└── DetailPane
    └── DetailCard
        ├── DetailHeader
        ├── DetailOverview
        ├── DetailMetaSection
        ├── DetailContentSection
        └── DetailFootnoteSection
```

### 4.2 ListPane 子模块

#### `PageHeader`

职责：

- 显示当前视图名称
- 显示当前视图统计
- 可放置右上角轻操作

输入：

- `activeView`
- `visibleCount`

#### `QuickAddCard`

职责：

- 单行快速新增
- 聚焦高亮
- 回车创建
- 右上角“快速新增”联动

输入：

- `draftTitle`
- `contextTag`
- `spotlight`

输出事件：

- `onSubmit`
- `onChange`
- `onFocus`

#### `ToolbarRow`

职责：

- 搜索
- 状态筛选
- 优先级筛选
- 标签筛选
- 排序

建议拆分：

- `SearchBox`
- `StatusFilter`
- `PriorityFilter`
- `TagFilter`
- `SortSelect`

#### `ReminderBanner`

职责：

- 展示即将过期 / 逾期 / 积压提醒
- 提供展开与快捷调整入口

输入：

- `reminderSummary`
- `reminderTasks`
- `expanded`
- `selectedReminderIds`

输出事件：

- `onToggleExpand`
- `onQuickShift`
- `onOpenBatchReschedule`
- `onSelectReminderTask`

#### `ReminderExpandPanel`

职责：

- 展开命中任务列表
- 显示已选 / 命中数量
- 批量快捷改期

建议子组件：

- `ReminderHitList`
- `ReminderHitRow`
- `ReminderActions`

#### `SelectionBar`

职责：

- 批量选择结果反馈
- 批量改期
- 批量 AI 总结

输入：

- `selectedCount`

输出事件：

- `onBatchReschedule`
- `onBatchSummarize`

#### `TaskList` / `TaskRow`

职责：

- 高密度单行任务列表展示
- active / selected / done / hover 状态表达
- 支持行点击、完成勾选、批量选择、改期

`TaskRow` 应至少拆成以下子区块：

- `TaskCheck`
- `TaskMain`
- `TaskMeta`
- `TaskActions`

---

## 5. Detail 页面内模块拆分

### 5.1 结构树建议

```text
DetailCard
├── DetailHeader
├── DetailOverview
├── DetailSection (属性)
│   └── InspectorFieldList
│       └── InspectorFieldRow[]
├── DetailSection (内容)
│   ├── EditorToolbar
│   ├── EditorModes
│   └── MarkdownEditorSurface
└── DetailSection (记录信息)
    └── MetaStrip
```

### 5.2 核心组件

#### `DetailHeader`

职责：

- 记录标题
- 副标题
- 收起详情区

注意：

- 标题区必须避免被圆角或裁切影响
- 需要支持长标题省略与完整查看

#### `InspectorFieldRow`

职责：

- 承载状态、优先级、时间、标签等字段行
- 统一 inspector 字段语言

建议支持类型：

- `select`
- `datetime`
- `token-list`
- `readonly-meta`

#### `EditorToolbar`

职责：

- 编辑模式切换
- AI 摘要
- 润色
- 管理标签

注意：

- 次级操作统一为 inspector 语言
- 不要出现一排主按钮感很强的操作

#### `EditorModes`

职责：

- 编辑
- 分栏
- 预览

建议组件：

- `SegmentedControl`
- `SegmentedItem`

#### `MarkdownEditorSurface`

职责：

- 渲染 3 种模式：
  - 编辑
  - 分栏
  - 预览

建议拆分：

- `MarkdownTextarea`
- `MarkdownPreview`
- `MarkdownSplitView`

---

## 6. 标签管理相关拆分

### 6.1 建议结构

```text
TagManagerModal
├── TagManagerHeader
├── TagContextPanel
├── TagSelectedStrip
├── TagBindList
├── TagLibraryList
└── TagLibraryEditor
```

### 6.2 关键职责

#### `TagContextPanel`

- 显示当前记录上下文
- 显示当前绑定标签摘要

#### `TagBindList`

- 当前记录可绑定 / 已绑定标签列表
- 支持点击切换绑定状态

#### `TagLibraryList`

- 展示标签库
- 支持编辑 / 删除 / 新增

#### `TagLibraryEditor`

- 编辑标签名称
- 编辑标签颜色
- 保存 / 取消

注意：

- 左侧导航不能承担标签编辑能力
- 标签管理一定从详情区入口进入

---

## 7. AI 报告页拆分

### 7.1 结构树建议

```text
ReportPage
├── ReportFiltersPanel
│   ├── ReportTypeCard
│   ├── DateRangePicker
│   ├── TagScopeSelect
│   ├── StatusScopeSelect
│   ├── TemplateSelect
│   ├── TemplateConfigEntry
│   ├── ChannelSelect
│   └── GenerateButton
└── ReportEditorPanel
    ├── ReportHeader
    ├── ReportBanner
    ├── ReportEditor
    └── ReportHistory
```

### 7.2 子模块说明

#### `ReportFiltersPanel`

- 报告类型
- 时间范围
- 标签范围
- 状态范围
- 模板
- 模板配置入口
- AI 通道
- 生成按钮

#### `ReportEditorPanel`

- 展示当前草稿
- 支持重新生成 / 复制 / 保存为记录 / 导出 Markdown
- 展示历史记录

#### `TemplateConfigModal`

- 模板名称
- 输出语气
- 章节结构

---

## 8. AI 通道页拆分

### 8.1 结构树建议

```text
ChannelPage
├── ChannelListPanel
│   ├── ChannelList
│   └── CreateChannelButton
└── ChannelFormPanel
    ├── ChannelBasicForm
    ├── ChannelAdvancedForm
    ├── AbilityMappingGrid
    └── ChannelActions
```

### 8.2 子模块说明

#### `ChannelListPanel`

- 展示通道名称
- 展示服务商类型
- 展示启用状态

#### `ChannelBasicForm`

- 通道名称
- 服务商类型
- Base URL
- API Key
- 模型名称

#### `ChannelAdvancedForm`

- 温度
- 最大输出
- 超时
- 系统 Prompt
- 默认语言
- 启用状态

#### `AbilityMappingGrid`

- 周报 -> 通道
- 月报 -> 通道
- 摘要 -> 通道
- 润色 -> 通道

#### `ChannelActions`

- 测试连接
- 保存
- 启用 / 停用
- 删除

---

## 9. 全局系统层拆分

### 9.1 主题系统

建议模块：

- `ThemeProvider`
- `ThemeToggle`
- `useTheme`

职责：

- 浅色 / 暗色切换
- token 注入
- 持久化当前主题

### 9.2 弹层系统

建议模块：

- `ModalHost`
- `BatchRescheduleModal`
- `TemplateConfigModal`
- `TagManagerModal`

职责：

- 统一弹层层级
- Esc 关闭
- 遮罩
- 焦点管理

### 9.3 Toast 系统

建议模块：

- `ToastHost`
- `useToast`

职责：

- 统一轻反馈
- 批量操作结果提示
- AI 生成反馈

---

## 10. 建议组件库级别抽象

建议把一部分基础组件提前沉淀为可复用组件，而不是每页单独写死。

### 10.1 基础组件

- `Button`
- `IconButton`
- `GhostButton`
- `SoftButton`
- `TextButton`
- `Input`
- `SearchInput`
- `Select`
- `DateTimeField`
- `Textarea`
- `Checkbox`
- `SegmentedControl`
- `Tag`
- `PriorityPill`
- `Badge`
- `EmptyState`
- `Card`
- `Panel`

### 10.2 业务组件

- `QuickAddCard`
- `ReminderBanner`
- `TaskRow`
- `SelectionBar`
- `InspectorFieldRow`
- `MarkdownEditorSurface`
- `TagManagerModal`
- `ReportFiltersPanel`
- `ChannelFormPanel`

---

## 11. 建议状态管理拆分

### 11.1 全局状态

建议纳入全局：

- 当前主题
- 当前页面
- 当前系统视图 / 标签筛选
- 当前选中记录 id
- 当前多选记录 id 集合
- 当前提醒命中项选择集合
- 当前 AI 通道配置

### 11.2 页面局部状态

建议保持局部：

- 快速新增输入内容
- 当前编辑模式（编辑 / 分栏 / 预览）
- 标签管理弹层局部编辑态
- 模板配置弹层局部编辑态
- AI 通道表单草稿

---

## 12. 建议数据模型映射

### 12.1 Record

核心字段：

- `id`
- `title`
- `content_markdown`
- `status`
- `priority`
- `tags`
- `due_at`
- `planned_at`
- `completed_at`
- `created_at`
- `updated_at`

### 12.2 Tag

- `id`
- `name`
- `color`
- `count`

### 12.3 Channel

- `id`
- `name`
- `provider`
- `base_url`
- `api_key`
- `model`
- `temperature`
- `max_tokens`
- `timeout_ms`
- `system_prompt`
- `language`
- `enabled`

### 12.4 ReportTemplate

- `id`
- `name`
- `type`
- `tone`
- `sections`

---

## 13. 建议开发顺序

### Phase 1：骨架层

- App Shell
- Sidebar
- Workspace Page 基础布局
- ThemeProvider

### Phase 2：主工作台

- QuickAddCard
- ToolbarRow
- TaskList / TaskRow
- DetailPane
- PaneSplitter

### Phase 3：重点交互

- ReminderBanner
- ReminderExpandPanel
- BatchRescheduleModal
- SelectionBar
- TagManagerModal

### Phase 4：AI 功能页

- ReportPage
- TemplateConfigModal
- ChannelPage

### Phase 5：状态细节与 polish

- hover / active / selected / disabled
- 浅色 / 暗色主题
- 滚动条
- Toast
- 细节校验

---

## 14. 给前端开发的简版结论

如果要尽快进入实现，建议把 TimeAura 拆成：

- 3 个页面容器：
  - `WorkspacePage`
  - `ReportPage`
  - `ChannelPage`
- 4 个重点业务模块：
  - `TaskList`
  - `DetailPane`
  - `ReminderBanner`
  - `TagManagerModal`
- 1 套基础系统：
  - `ThemeProvider`
  - `ModalHost`
  - `ToastHost`
  - `SegmentedControl / Select / Checkbox / Button` 基础组件层

这样既能保证页面快速成型，也能保证后续状态与视觉语言复用，不会越做越散。
